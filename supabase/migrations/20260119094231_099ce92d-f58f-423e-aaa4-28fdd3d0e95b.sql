-- =====================================================
-- KOMPLETNY SYSTEM PŁATNOŚCI I PAKIETÓW
-- =====================================================

-- 1. Rozszerzenie tabeli package_purchases o nowe pola
ALTER TABLE public.package_purchases ADD COLUMN IF NOT EXISTS lessons_total INTEGER;
ALTER TABLE public.package_purchases ADD COLUMN IF NOT EXISTS lessons_used INTEGER DEFAULT 0;
ALTER TABLE public.package_purchases ADD COLUMN IF NOT EXISTS price_per_lesson NUMERIC GENERATED ALWAYS AS (
  CASE WHEN lessons_total > 0 THEN total_amount / lessons_total ELSE 0 END
) STORED;
ALTER TABLE public.package_purchases ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'expired'));
ALTER TABLE public.package_purchases ADD COLUMN IF NOT EXISTS teacher_id UUID;
ALTER TABLE public.package_purchases ADD COLUMN IF NOT EXISTS created_by UUID;

-- Migracja danych ze starych pól (hours -> lessons)
UPDATE public.package_purchases 
SET lessons_total = hours_purchased 
WHERE lessons_total IS NULL AND hours_purchased IS NOT NULL;

UPDATE public.package_purchases 
SET lessons_used = 0 
WHERE lessons_used IS NULL;

-- 2. Rozszerzenie tabeli payments o powiązanie z pakietem
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS package_purchase_id UUID REFERENCES public.package_purchases(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS teacher_id UUID;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS created_by UUID;

-- 3. Dodanie kolumny do lesson_attendance dla śledzenia pakietu i przychodu
ALTER TABLE public.lesson_attendance ADD COLUMN IF NOT EXISTS package_purchase_id UUID REFERENCES public.package_purchases(id);
ALTER TABLE public.lesson_attendance ADD COLUMN IF NOT EXISTS revenue_amount NUMERIC;

-- 4. Dodanie statusu płatności do ucznia
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'no_payment' CHECK (payment_status IN ('active', 'warning', 'no_payment'));

-- 5. Funkcja do aktualizacji statusu pakietu po zużyciu lekcji
CREATE OR REPLACE FUNCTION public.update_package_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update package status based on lessons used
  UPDATE public.package_purchases
  SET status = CASE 
    WHEN lessons_used >= lessons_total THEN 'exhausted'
    WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 'expired'
    ELSE 'active'
  END
  WHERE id = NEW.id OR id = OLD.id;
  
  RETURN NEW;
END;
$$;

-- Trigger do aktualizacji statusu pakietu
DROP TRIGGER IF EXISTS update_package_status_trigger ON public.package_purchases;
CREATE TRIGGER update_package_status_trigger
AFTER UPDATE OF lessons_used ON public.package_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_package_status();

-- 6. Funkcja do automatycznego odejmowania lekcji z pakietu po zaznaczeniu obecności
CREATE OR REPLACE FUNCTION public.process_attendance_deduction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_active_package RECORD;
  v_price_per_lesson NUMERIC;
BEGIN
  -- Only process when marking as present (attended = true) and not already processed
  IF NEW.attended = true AND (OLD.attended IS NULL OR OLD.attended = false) THEN
    v_student_id := NEW.student_id;
    
    -- Find the active package for this student (oldest first, still has lessons)
    SELECT * INTO v_active_package
    FROM public.package_purchases
    WHERE student_id = v_student_id
      AND status = 'active'
      AND lessons_used < lessons_total
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY purchase_date ASC, created_at ASC
    LIMIT 1;
    
    IF v_active_package.id IS NOT NULL THEN
      -- Calculate price per lesson
      v_price_per_lesson := v_active_package.total_amount / v_active_package.lessons_total;
      
      -- Deduct one lesson from the package
      UPDATE public.package_purchases
      SET lessons_used = lessons_used + 1
      WHERE id = v_active_package.id;
      
      -- Link attendance to package and record revenue
      NEW.package_purchase_id := v_active_package.id;
      NEW.revenue_amount := v_price_per_lesson;
    END IF;
    
    -- Update student payment status
    PERFORM public.update_student_payment_status(v_student_id);
  END IF;
  
  -- Handle removal of attendance (unmarking present)
  IF NEW.attended = false AND OLD.attended = true AND OLD.package_purchase_id IS NOT NULL THEN
    -- Restore lesson to package
    UPDATE public.package_purchases
    SET lessons_used = GREATEST(0, lessons_used - 1)
    WHERE id = OLD.package_purchase_id;
    
    -- Clear package reference and revenue
    NEW.package_purchase_id := NULL;
    NEW.revenue_amount := NULL;
    
    -- Update student payment status
    PERFORM public.update_student_payment_status(NEW.student_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger do automatycznego rozliczania obecności
DROP TRIGGER IF EXISTS process_attendance_deduction_trigger ON public.lesson_attendance;
CREATE TRIGGER process_attendance_deduction_trigger
BEFORE INSERT OR UPDATE ON public.lesson_attendance
FOR EACH ROW
EXECUTE FUNCTION public.process_attendance_deduction();

-- 7. Funkcja do aktualizacji statusu płatności ucznia
CREATE OR REPLACE FUNCTION public.update_student_payment_status(_student_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining_lessons INTEGER;
  v_new_status TEXT;
BEGIN
  -- Calculate total remaining lessons from all active packages
  SELECT COALESCE(SUM(lessons_total - lessons_used), 0)
  INTO v_remaining_lessons
  FROM public.package_purchases
  WHERE student_id = _student_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW());
  
  -- Determine status based on remaining lessons
  IF v_remaining_lessons = 0 THEN
    v_new_status := 'no_payment';
  ELSIF v_remaining_lessons <= 1 THEN
    v_new_status := 'warning';
  ELSE
    v_new_status := 'active';
  END IF;
  
  -- Update student status
  UPDATE public.students
  SET payment_status = v_new_status
  WHERE id = _student_id;
END;
$$;

-- 8. Trigger do automatycznej aktualizacji statusu po dodaniu pakietu
CREATE OR REPLACE FUNCTION public.on_package_purchase_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.update_student_payment_status(NEW.student_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.update_student_payment_status(OLD.student_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_package_purchase_change_trigger ON public.package_purchases;
CREATE TRIGGER on_package_purchase_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.package_purchases
FOR EACH ROW
EXECUTE FUNCTION public.on_package_purchase_change();

-- 9. Widok pomocniczy dla podsumowania pakietów ucznia
CREATE OR REPLACE VIEW public.student_package_summary AS
SELECT 
  s.id as student_id,
  s.name as student_name,
  s.school_id,
  s.payment_status,
  COALESCE(SUM(
    CASE WHEN pp.status = 'active' THEN pp.lessons_total - pp.lessons_used ELSE 0 END
  ), 0) as remaining_lessons,
  COALESCE(SUM(
    CASE WHEN pp.status = 'active' THEN pp.lessons_used ELSE 0 END
  ), 0) as used_lessons_from_active,
  COUNT(CASE WHEN pp.status = 'active' THEN 1 END) as active_packages_count
FROM public.students s
LEFT JOIN public.package_purchases pp ON pp.student_id = s.id
GROUP BY s.id, s.name, s.school_id, s.payment_status;

-- 10. RLS dla widoku (dostęp przez tabelę students)
-- Widok dziedziczy RLS z tabeli students

-- 11. Aktualizacja istniejącej funkcji deduct_package_hours (wyłączenie starej logiki)
CREATE OR REPLACE FUNCTION public.deduct_package_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Ta funkcja jest teraz przestarzała - logika została przeniesiona do process_attendance_deduction
  -- Zachowano dla kompatybilności wstecznej
  RETURN NEW;
END;
$function$;

-- 12. Inicjalna aktualizacja statusów wszystkich uczniów
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT student_id FROM public.package_purchases LOOP
    PERFORM public.update_student_payment_status(r.student_id);
  END LOOP;
END $$;