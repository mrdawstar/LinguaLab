-- Add UPDATE and DELETE policies for managers on package_purchases
CREATE POLICY "Managers can update package purchases"
ON public.package_purchases
FOR UPDATE
USING (
  school_id = get_user_school_id(auth.uid())
  AND has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Managers can delete package purchases"
ON public.package_purchases
FOR DELETE
USING (
  school_id = get_user_school_id(auth.uid())
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- Admins already have ALL permissions via existing policy