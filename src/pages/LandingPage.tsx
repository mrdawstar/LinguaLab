import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, Menu, X, ArrowRight, CheckCircle2, 
  Calendar, Users, BarChart3, Globe2, Zap, Crown, Infinity,
  ChevronRight, Star, HelpCircle, Mail, Phone, MapPin,
  Sparkles, Clock, Shield, TrendingUp, UsersRound, CreditCard,
  MessageSquare, Building, Settings, Target, Award,
  Coffee, BookOpen, LineChart, Smartphone, Monitor, Cloud, Lock,
  DollarSign, Globe, Languages
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { PLAN_CONFIGS } from '@/lib/subscriptionLimits';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Plans configuration - matching PlanComparison exactly
const plans = [
  {
    id: 'basic',
    name: 'Starter',
    icon: Sparkles,
    description: 'Idealny start dla małych szkół',
    features: [
      { label: 'Do 120 uczniów', included: true },
      { label: 'Do 5 nauczycieli', included: true },
      { label: 'Grupy i harmonogram', included: true },
      { label: 'Płatności i pakiety', included: true },
      { label: 'Podstawowe statystyki', included: true },
    ],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Growth',
    icon: TrendingUp,
    description: 'Dla rozwijających się szkół',
    features: [
      { label: 'Do 500 uczniów', included: true },
      { label: 'Do 15 nauczycieli', included: true },
      { label: 'Wszystko z planu Starter', included: true },
      { label: 'Pełny dashboard (przychody, wykresy)', included: true },
      { label: 'Raporty tygodniowe i miesięczne', included: true },
      { label: 'Automatyczne powiadomienia email', included: true },
    ],
    popular: true,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    icon: Infinity,
    description: 'Dla największych szkół',
    features: [
      { label: 'Nieograniczona liczba uczniów', included: true },
      { label: 'Nieograniczona liczba nauczycieli', included: true },
      { label: 'Nieograniczona liczba grup', included: true },
      { label: 'Brak limitów funkcjonalnych', included: true },
      { label: 'Wszystkie funkcje systemu', included: true },
      { label: 'Priorytetowe przetwarzanie danych', included: true },
      { label: 'Najwyższy limit API / zapytań', included: true },
      { label: 'Najlepsza wydajność dashboardu', included: true },
      { label: 'Wsparcie 24/7 (priorytet)', included: true },
      { label: 'Dostęp do wszystkich nowych funkcji w pierwszej kolejności', included: true },
    ],
    popular: false,
  },
];

const features = [
  {
    icon: Users,
    title: 'Zarządzanie uczniami w szkole językowej',
    description: 'Kompleksowe zarządzanie bazą danych uczniów. Dodawaj, edytuj i zarządzaj danymi uczniów. Śledź postępy w nauce, historię płatności i frekwencję w jednym miejscu. System CRM dla szkół językowych.',
  },
  {
    icon: GraduationCap,
    title: 'Zarządzanie nauczycielami i zespołem',
    description: 'Pełna kontrola nad zespołem nauczycieli w szkole językowej. Przypisuj nauczycieli do grup uczniów i zarządzaj ich dostępnością. Planuj grafik pracy nauczycieli.',
  },
  {
    icon: BookOpen,
    title: 'Grupy uczniów i harmonogram zajęć',
    description: 'Twórz grupy uczniów i planuj zajęcia w szkole językowej. Inteligentny kalendarz z automatycznym przypisaniem nauczycieli. System rezerwacji i planowania lekcji.',
  },
  {
    icon: Calendar,
    title: 'System obecności na zajęciach',
    description: 'Oznaczaj obecność uczniów na zajęciach językowych. Automatyczne rozliczanie pakietów lekcji i śledzenie frekwencji. Raporty obecności dla szkoły językowej.',
  },
  {
    icon: CreditCard,
    title: 'Płatności i pakiety lekcji',
    description: 'System pakietów lekcji językowych z automatycznym rozliczaniem. Śledź płatności uczniów, status zaległości i rozliczenia. Oprogramowanie do zarządzania finansami szkoły językowej.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard i statystyki szkoły językowej',
    description: 'Pełny przegląd szkoły językowej w jednym miejscu. Wykresy przychodów, statystyki obecności uczniów i raporty. Analityka i raporty dla właścicieli szkół językowych.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Rejestracja w systemie zarządzania szkołą językową',
    description: 'Utwórz konto w LinguaLab i skonfiguruj swoją szkołę językową w ciągu 1 minuty. Rozpocznij 7-dniowy darmowy okres próbny.',
    icon: Settings,
    delay: 0
  },
  {
    number: '02',
    title: 'Zaproszenie nauczycieli do systemu',
    description: 'Dodaj zespół nauczycieli do oprogramowania i przypisz ich do grup uczniów. Zarządzaj dostępem nauczycieli w szkole językowej.',
    icon: Users,
    delay: 100
  },
  {
    number: '03',
    title: 'Planowanie zajęć i harmonogramu',
    description: 'Stwórz harmonogram zajęć językowych i zarządzaj lekcjami. System automatycznie przypisze nauczycieli do grup.',
    icon: Calendar,
    delay: 200
  },
  {
    number: '04',
    title: 'Rozpocznij zarządzanie szkołą językową',
    description: 'Wszystko gotowe do prowadzenia zajęć. System zarządzania szkołą językową jest w pełni skonfigurowany i gotowy do użycia.',
    icon: Target,
    delay: 300
  },
];

const testimonials = [
  {
    name: 'Anna Kowalska',
    role: 'Dyrektor, Szkoła Językowa ABC',
    content: 'LinguaLab zrewolucjonizował nasze procesy zarządzania szkołą językową. To najlepsze oprogramowanie CRM dla szkół językowych w Polsce. Wszystko w jednym miejscu, intuicyjne i piękne.',
    rating: 5,
    avatarInitials: 'AK',
    avatarGradient: 'from-blue-500 to-blue-600'
  },
  {
    name: 'Marek Nowak',
    role: 'Właściciel, English Pro',
    content: 'Najlepsza inwestycja w rozwój szkoły językowej. System zarządzania szkołą językową LinguaLab łączy estetykę z funkcjonalnością. Polecam wszystkim szkołom językowym w Polsce.',
    rating: 5,
    avatarInitials: 'MN',
    avatarGradient: 'from-emerald-500 to-emerald-600'
  },
  {
    name: 'Katarzyna Wiśniewska',
    role: 'Manager, Language Hub',
    content: 'Minimalistyczny design, maksymalna funkcjonalność. Nasz zespół pokochał tę platformę do zarządzania szkołą językową. Oprogramowanie dla szkół językowych, które naprawdę działa.',
    rating: 5,
    avatarInitials: 'KW',
    avatarGradient: 'from-purple-500 to-purple-600'
  },
];

const faqs = [
  {
    question: 'Czy mogę zmienić plan w systemie zarządzania szkołą językową w dowolnym momencie?',
    answer: 'Tak, zmiana planu w oprogramowaniu LinguaLab jest możliwa w każdej chwili. Nowe warunki obowiązują od następnego cyklu rozliczeniowego. System zarządzania szkołą językową pozwala na elastyczne zarządzanie subskrypcją.'
  },
  {
    question: 'Jak wygląda okres próbny w oprogramowaniu dla szkół językowych?',
    answer: '7 dni pełnego dostępu do wszystkich funkcji systemu zarządzania szkołą językową, bez konieczności podawania danych karty kredytowej. Możesz przetestować wszystkie funkcje CRM dla szkół językowych za darmo.'
  },
  {
    question: 'Czy moje dane szkoły językowej są bezpieczne w systemie LinguaLab?',
    answer: 'Tak, stosujemy najwyższe standardy bezpieczeństwa, szyfrowanie danych i regularne backup-y. Oprogramowanie dla szkół językowych LinguaLab spełnia wszystkie wymagania bezpieczeństwa danych.'
  },
  {
    question: 'Jakie wsparcie techniczne oferujecie dla systemu zarządzania szkołą językową?',
    answer: 'Wsparcie email dla wszystkich użytkowników, czat dla planów Growth i Unlimited, oraz telefon dla najwyższego planu. Pomagamy wdrożyć oprogramowanie dla szkół językowych i odpowiadamy na wszystkie pytania.'
  },
  {
    question: 'Czy system zarządzania szkołą językową LinguaLab działa na telefonie?',
    answer: 'Tak, LinguaLab to w pełni responsywne oprogramowanie dla szkół językowych, które działa na wszystkich urządzeniach - komputerach, tabletach i telefonach. Zarządzaj szkołą językową z dowolnego miejsca.'
  },
  {
    question: 'Ile kosztuje oprogramowanie do zarządzania szkołą językową?',
    answer: 'Ceny zaczynają się od 199 zł miesięcznie za plan Starter. Oferujemy również plan Growth (299 zł/miesiąc) i Unlimited (399 zł/miesiąc). Przy płatności rocznej oszczędzasz 20%.'
  },
];

function AnimatedSection({ children, delay = 0, className = '' }: { children: React.ReactNode, delay?: number, className?: string }) {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref]);

  return (
    <div
      ref={setRef}
      className={cn(
        'transition-all duration-700 ease-out',
        inView 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuth();
  const { createCheckout } = useSubscription();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/3e50eb41-c314-427c-becc-59b2a821ca76',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:248',message:'Navigating to /auth',data:{timestamp:Date.now()},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      navigate('/auth');
      return;
    }
    setSelectedPlan(planId);
    setConfirmDialogOpen(true);
  };

  const confirmPlanSelection = async () => {
    if (!selectedPlan) return;
    setLoadingPlan(selectedPlan);
    setConfirmDialogOpen(false);
    try {
      await createCheckout(selectedPlan as 'basic' | 'pro' | 'unlimited', billingCycle);
    } catch (error) {
      toast.error('Nie udało się utworzyć sesji płatności');
      setLoadingPlan(null);
    }
  };

  const getPlanPrice = (planId: string) => {
    const config = PLAN_CONFIGS[planId];
    if (!config) return { monthly: 0, yearly: 0 };
    return config.price;
  };

  const getMonthlyEquivalent = (yearlyPrice: number) => {
    return Math.round(yearlyPrice / 12);
  };

  const calculateSavings = (monthlyPrice: number, yearlyPrice: number) => {
    const yearlyTotal = monthlyPrice * 12;
    return Math.round(yearlyTotal - yearlyPrice);
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased overflow-x-hidden">
      {/* Header */}
      <header className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled 
          ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm' 
          : 'bg-transparent'
      )}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-3 group relative"
            >
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary group-hover:opacity-90 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/30">
                <GraduationCap className="h-7 w-7 text-primary-foreground relative z-10 transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <span className="text-2xl font-bold text-foreground relative group-hover:text-primary transition-all duration-300">
                <span className="relative z-10">LinguaLab</span>
                <span className="absolute inset-0 text-primary blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300 -z-0">LinguaLab</span>
              </span>
            </a>

            <nav className="hidden lg:flex items-center gap-6" aria-label="Główne menu nawigacji">
              {[
                { label: 'Funkcje', id: 'funkcje' },
                { label: 'Cennik', id: 'pricing' },
                { label: 'Proces', id: 'proces' },
                { label: 'Opinie', id: 'opinie' }
              ].map((item) => (
                <a 
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(item.id);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="relative text-sm font-semibold text-muted-foreground hover:text-primary transition-all duration-300 group/nav py-2 px-1"
                  aria-label={`Przejdź do sekcji ${item.label}`}
                >
                  <span className="relative z-10">{item.label}</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/60 group-hover/nav:w-full transition-all duration-300" />
                </a>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <Link to="/admin">
                  <Button 
                    variant="ghost" 
                    className="text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 hover:scale-105"
                  >
                    Panel zarządzania
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth">
                    <Button 
                      variant="ghost" 
                      className="text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 hover:scale-105 relative group/btn"
                    >
                      <span className="relative z-10">Zaloguj się</span>
                      <span className="absolute inset-0 bg-primary/10 rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                    </Button>
                  </Link>
                  <Link to="/auth?mode=signup">
                    <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/30 relative overflow-hidden group/btn">
                      <span className="relative z-10">Rozpocznij</span>
                      <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <button
              className="lg:hidden p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-300 hover:scale-110"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Zamknij menu" : "Otwórz menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 transition-transform duration-300 rotate-90" />
              ) : (
                <Menu className="h-5 w-5 transition-transform duration-300" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-background backdrop-blur-xl border-t border-border/50 shadow-lg">
            <div className="container mx-auto px-4 py-5 space-y-3">
              {[
                { label: 'Funkcje', id: 'funkcje', icon: Sparkles },
                { label: 'Cennik', id: 'pricing', icon: Crown },
                { label: 'Proces', id: 'proces', icon: Zap },
                { label: 'Opinie', id: 'opinie', icon: Star }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.getElementById(item.id);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                      setMobileMenuOpen(false);
                    }}
                    className="group/mobile relative flex items-center gap-3 rounded-xl px-4 py-3.5 bg-muted/30 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 border border-transparent hover:border-primary/20 transition-all duration-300 active:scale-[0.98]"
                  >
                    {/* Icon container */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover/mobile:bg-primary/20 group-hover/mobile:scale-110 transition-all duration-300">
                      <Icon className="h-5 w-5 text-primary group-hover/mobile:text-primary group-hover/mobile:rotate-12 transition-all duration-300" />
                    </div>
                    
                    {/* Label */}
                    <span className="flex-1 text-base font-semibold text-foreground group-hover/mobile:text-primary transition-colors duration-300">
                      {item.label}
                    </span>
                    
                    {/* Arrow indicator */}
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover/mobile:text-primary group-hover/mobile:translate-x-1 transition-all duration-300" />
                    
                    {/* Hover gradient effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/mobile:opacity-100 transition-opacity duration-300 -z-0" />
                  </a>
                );
              })}
              
              {/* Action buttons section */}
              <div className="pt-5 space-y-4 border-t border-border/50 mt-5">
                {user ? (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full h-12 bg-gradient-primary text-primary-foreground hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 font-semibold text-base">
                      <Settings className="mr-2 h-5 w-5" />
                      Panel zarządzania
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button 
                        variant="outline" 
                        className="w-full h-12 border-2 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-300 font-semibold text-base group"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>Zaloguj się</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                        </span>
                      </Button>
                    </Link>
                    <Link to="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)} className="block mt-4">
                      <Button className="w-full h-12 bg-gradient-primary text-primary-foreground hover:opacity-90 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 font-semibold text-base relative overflow-hidden group">
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          <span>Rozpocznij za darmo</span>
                        </span>
                        <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/2 to-transparent" />
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        
        {/* Wave shape at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32">
          <svg 
            className="w-full h-full text-background" 
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path 
              d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
              opacity=".25" 
              className="fill-current"
            />
            <path 
              d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" 
              opacity=".5" 
              className="fill-current"
            />
            <path 
              d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" 
              className="fill-current"
            />
          </svg>
        </div>

        <div className="container mx-auto max-w-6xl relative pt-16">
          <AnimatedSection>
            <div className="text-center max-w-4xl mx-auto mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-semibold mb-8 animate-pulse-soft">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                7 dni darmowego okresu próbnego - System zarządzania szkołą językową
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
                <span className="block text-foreground">System Zarządzania</span>
                <span className="block text-primary pt-3 pb-1">
                  Szkołą Językową w Polsce
                </span>
              </h1>

              <p className="text-xl sm:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto">
                Najlepsze oprogramowanie CRM dla szkół językowych. Pełna kontrola nad uczniami, nauczycielami, zajęciami i płatnościami w jednym miejscu. Zapomnij o chaosie w dokumentach.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                <Link to="/auth?mode=signup" aria-label="Rozpocznij darmowy okres próbny w systemie zarządzania szkołą językową">
                  <Button 
                    size="lg" 
                    className="bg-gradient-primary text-primary-foreground px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                  >
                    Rozpocznij za darmo
                    <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                  </Button>
                </Link>
                <a 
                  href="#pricing"
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById('pricing');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  aria-label="Zobacz cennik oprogramowania dla szkół językowych"
                >
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-2 border-border bg-background/50 backdrop-blur-sm px-8 py-6 text-lg hover:bg-primary/10 hover:border-primary hover:text-primary transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-105 shadow-sm hover:shadow-md"
                  >
                    Zobacz plany
                  </Button>
                </a>
              </div>
            </div>
          </AnimatedSection>

          {/* Stats */}
          <AnimatedSection delay={200}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 max-w-3xl mx-auto">
              {[
                { value: '500+', label: 'Szkół językowych w Polsce' },
                { value: '98%', label: 'Satysfakcji klientów' },
                { value: '24/7', label: 'Wsparcie techniczne' }
              ].map((stat, index) => (
                <AnimatedSection key={index} delay={300 + index * 100}>
                  <div className="text-center group">
                    <div className="text-6xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-4 animate-pulse-soft hover:scale-110 transition-transform duration-500">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground font-semibold uppercase tracking-wider group-hover:text-primary transition-colors duration-300">
                      {stat.label}
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Features Grid */}
      <section id="funkcje" className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="container mx-auto max-w-6xl">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
                Funkcje Systemu Zarządzania Szkołą Językową
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Kompletne oprogramowanie CRM dla szkół językowych w Polsce. Wszystkie narzędzia potrzebne do zarządzania uczniami, nauczycielami, zajęciami i płatnościami w jednym miejscu.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <AnimatedSection key={index} delay={index * 100}>
                <div className="group relative p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/50 transition-all duration-500 hover:-translate-y-3 overflow-hidden">
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-5">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg shadow-primary/10">
                        <feature.icon className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                          {feature.title}
                        </h3>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base group-hover:text-foreground/90 transition-colors duration-300">
                      {feature.description}
                    </p>
                  </div>
                  
                  {/* Decorative corner accent */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <AnimatedSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-semibold mb-6">
                <Award className="h-3.5 w-3.5" />
                Wybierz idealny plan dla swojej szkoły
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
                Cennik Oprogramowania dla Szkół Językowych
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Przejrzyste ceny bez ukrytych opłat. System zarządzania szkołą językową dostępny w trzech planach: Starter, Growth i Unlimited. Zmień lub anuluj w każdej chwili.
              </p>
            </div>
          </AnimatedSection>

          {/* Billing Toggle */}
          <AnimatedSection delay={100}>
            <div className="flex flex-col items-center mb-12 relative">
              {/* Fixed height container for savings message to prevent layout shift */}
              <div className="h-10 mb-4 flex items-center justify-center -mt-2">
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full transition-all duration-300 shadow-lg shadow-emerald-500/20",
                  billingCycle === 'yearly'
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 -translate-y-2 pointer-events-none absolute'
                )}>
                  <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                  <span className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold whitespace-nowrap drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]">
                    Oszczędzasz 20% przy płatności rocznej
                  </span>
                </div>
              </div>
              <div className="relative inline-flex items-center rounded-full border-2 border-border bg-muted/50 p-1.5 overflow-hidden">
                {/* Animated background slider */}
                <div
                  className={cn(
                    'absolute top-1.5 bottom-1.5 rounded-full bg-gradient-primary shadow-lg transition-all duration-500 ease-in-out',
                    billingCycle === 'monthly' 
                      ? 'left-1.5 right-[calc(50%+6px)]' 
                      : 'left-[calc(50%+6px)] right-1.5'
                  )}
                />
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    'relative z-10 px-8 py-3 rounded-full text-sm font-semibold transition-all duration-500',
                    billingCycle === 'monthly'
                      ? 'text-primary-foreground scale-105'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-label="Przełącz na rozliczenie miesięczne"
                  aria-pressed={billingCycle === 'monthly'}
                >
                  Miesięcznie
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={cn(
                    'relative z-10 px-8 py-3 rounded-full text-sm font-semibold transition-all duration-500',
                    billingCycle === 'yearly'
                      ? 'text-primary-foreground scale-105'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-label="Przełącz na rozliczenie roczne"
                  aria-pressed={billingCycle === 'yearly'}
                >
                  Rocznie
                </button>
              </div>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {plans.map((plan, planIndex) => {
              const prices = getPlanPrice(plan.id);
              const monthlyPrice = prices.monthly;
              const yearlyPrice = prices.yearly;
              const monthlyEquivalent = billingCycle === 'yearly' ? getMonthlyEquivalent(yearlyPrice) : null;
              const savings = billingCycle === 'yearly' ? calculateSavings(monthlyPrice, yearlyPrice) : null;
              const Icon = plan.icon;
              const isUnlimited = plan.id === 'unlimited';

              return (
                <div 
                  key={`${plan.id}-${billingCycle}`}
                  className="transition-all duration-500 ease-in-out"
                >
                  <div className={cn(
                    'relative flex flex-col rounded-2xl border-2 transition-all duration-500 ease-in-out hover:shadow-2xl hover:-translate-y-1',
                    isUnlimited
                      ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 shadow-xl shadow-emerald-500/10'
                      : plan.popular
                      ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10'
                      : 'border-border bg-card shadow-sm hover:border-primary/30'
                  )}>
                    {/* Badges */}
                    {isUnlimited && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <span className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/30">
                          Pełna swoboda
                        </span>
                      </div>
                    )}
                    {plan.popular && !isUnlimited && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <span className="rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-md">
                          Polecany
                        </span>
                      </div>
                    )}

                    <div className="p-8">
                      {/* Header */}
                      <div className="mb-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={cn(
                            'flex h-12 w-12 items-center justify-center rounded-xl',
                            isUnlimited ? 'bg-emerald-500/20' : plan.popular ? 'bg-primary/15' : 'bg-primary/10'
                          )}>
                            <Icon className={cn(
                              'h-6 w-6',
                              isUnlimited ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'
                            )} />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                            <p className="text-sm text-muted-foreground">{plan.description}</p>
                          </div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-6 relative min-h-[100px] overflow-hidden">
                        {/* Monthly Price */}
                        <div className={cn(
                          "absolute inset-0 flex flex-col justify-start transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                          billingCycle === 'monthly'
                            ? 'opacity-100 translate-y-0 scale-100 rotate-0'
                            : 'opacity-0 -translate-y-8 scale-95 rotate-[-3deg] pointer-events-none'
                        )}>
                          <div className="flex items-baseline gap-2">
                            <span 
                              key={`monthly-price-${monthlyPrice}-${billingCycle}`}
                              className={cn(
                                "text-4xl font-bold text-foreground transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                                billingCycle === 'monthly' 
                                  ? 'translate-x-0 opacity-100 scale-100' 
                                  : 'translate-x-[-20px] opacity-0 scale-90'
                              )}
                            >
                              {monthlyPrice}
                            </span>
                            <span 
                              key={`monthly-currency-${billingCycle}`}
                              className={cn(
                                "text-lg text-muted-foreground transition-all duration-500 delay-75",
                                billingCycle === 'monthly' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                              )}
                            >
                              zł
                            </span>
                            <span 
                              key={`monthly-period-${billingCycle}`}
                              className={cn(
                                "text-muted-foreground transition-all duration-500 delay-100",
                                billingCycle === 'monthly' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                              )}
                            >
                              /miesiąc
                            </span>
                          </div>
                        </div>
                        
                        {/* Yearly Price */}
                        <div className={cn(
                          "absolute inset-0 flex flex-col justify-start transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                          billingCycle === 'yearly'
                            ? 'opacity-100 translate-y-0 scale-100 rotate-0'
                            : 'opacity-0 translate-y-8 scale-95 rotate-[3deg] pointer-events-none'
                        )}>
                          <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                            <span 
                              key={`yearly-price-${monthlyEquivalent}-${billingCycle}`}
                              className={cn(
                                "text-4xl font-bold text-foreground transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                                billingCycle === 'yearly' 
                                  ? 'translate-x-0 opacity-100 scale-100' 
                                  : 'translate-x-[20px] opacity-0 scale-90'
                              )}
                            >
                              {monthlyEquivalent}
                            </span>
                            <span 
                              key={`yearly-currency-${billingCycle}`}
                              className={cn(
                                "text-lg text-muted-foreground transition-all duration-500 delay-75",
                                billingCycle === 'yearly' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                              )}
                            >
                              zł
                            </span>
                            <span 
                              key={`yearly-period-${billingCycle}`}
                              className={cn(
                                "text-muted-foreground transition-all duration-500 delay-100",
                                billingCycle === 'yearly' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                              )}
                            >
                              /miesiąc
                            </span>
                            <span 
                              key={`yearly-badge-${billingCycle}`}
                              className={cn(
                                "ml-2 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-150",
                                billingCycle === 'yearly' 
                                  ? 'opacity-100 scale-100 rotate-0 translate-x-0 translate-y-0' 
                                  : 'opacity-0 scale-50 rotate-12 translate-x-4 translate-y-[-10px]'
                              )}
                            >
                              –20%
                            </span>
                          </div>
                          <div className={cn(
                            "flex items-center gap-2 flex-wrap transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-200",
                            billingCycle === 'yearly'
                              ? 'opacity-100 translate-y-0 scale-100'
                              : 'opacity-0 translate-y-4 scale-95'
                          )}>
                            <span 
                              key={`yearly-full-price-${yearlyPrice}-${billingCycle}`}
                              className={cn(
                                "text-sm text-muted-foreground transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                                billingCycle === 'yearly' 
                                  ? 'translate-x-0 opacity-100 scale-100' 
                                  : 'translate-x-4 opacity-0 scale-95'
                              )}
                            >
                              {yearlyPrice} zł
                            </span>
                            <span 
                              key={`yearly-full-period-${billingCycle}`}
                              className={cn(
                                "text-sm text-muted-foreground transition-all duration-500 delay-50",
                                billingCycle === 'yearly' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                              )}
                            >
                              /rok
                            </span>
                            <span 
                              key={`yearly-savings-${savings}-${billingCycle}`}
                              className={cn(
                                "text-sm text-emerald-600 dark:text-emerald-400 font-medium transition-all duration-500 delay-100 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                                billingCycle === 'yearly' 
                                  ? 'opacity-100 translate-x-0 scale-100' 
                                  : 'opacity-0 translate-x-4 scale-95'
                              )}
                            >
                              Oszczędzasz {savings} zł
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-foreground">{feature.label}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA Button */}
                      <Button
                        className={cn(
                          'w-full py-6 text-base font-semibold rounded-xl transition-all duration-300',
                          isUnlimited
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:opacity-90 shadow-lg hover:shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50'
                            : plan.popular
                            ? 'bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl'
                            : 'bg-card border-2 border-border hover:border-primary hover:bg-primary/5'
                        )}
                        variant={isUnlimited || plan.popular ? 'default' : 'outline'}
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={loadingPlan !== null}
                      >
                        {loadingPlan === plan.id ? 'Przekierowuję...' : 'Rozpocznij'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <AnimatedSection delay={400}>
            <div className="text-center mt-12">
              <p className="text-sm text-muted-foreground flex flex-wrap items-center justify-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span>7 dni za darmo bez karty kredytowej</span>
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span>Bezpieczna płatność przez Stripe</span>
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span>Anuluj w każdej chwili bez zobowiązań</span>
                </span>
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* How It Works */}
      <section id="proces" className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="container mx-auto max-w-6xl">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
                Jak Zacząć Używać Systemu Zarządzania Szkołą Językową
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Prosty proces wdrożenia oprogramowania dla szkół językowych. W ciągu godziny możesz przenieść całe zarządzanie szkołą do LinguaLab i rozpocząć pracę.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <AnimatedSection key={index} delay={step.delay}>
                  <div className="relative text-center group">
                    {/* Floating number badge */}
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 text-lg font-bold text-primary mb-8 group-hover:from-primary/30 group-hover:via-primary/25 group-hover:to-primary/20 transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/20 group-hover:-translate-y-1">
                      {step.number}
                    </div>
                    
                    {/* Icon with floating effect */}
                    <div className="flex justify-center mb-6">
                      <div className="relative w-20 h-20">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all duration-500 group-hover:scale-150 group-hover:-translate-y-1"></div>
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 group-hover:from-primary/25 group-hover:via-primary/20 group-hover:to-primary/15 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:-translate-y-1">
                          <Icon className="h-10 w-10 text-primary relative z-10" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">
                      {step.description}
                    </p>
                    
                    {/* Decorative line */}
                    <div className="mt-6 mx-auto w-0 h-8 border-l-2 border-dashed border-primary/20 group-hover:border-primary/40 transition-all duration-500 group-hover:scale-y-150 origin-top"></div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="opinie" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
                Opinie Klientów - Szkoły Językowe w Polsce
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Dołącz do grona zadowolonych szkół językowych, które używają systemu zarządzania LinguaLab. Sprawdź, co mówią o naszym oprogramowaniu dla szkół językowych.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <AnimatedSection key={index} delay={index * 100}>
                <div className="p-8 bg-card rounded-2xl border border-border hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-2 hover:border-primary/30 group">
                  <div className="flex gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic mb-6 leading-relaxed text-base group-hover:text-foreground/90 transition-colors">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'relative h-14 w-14 min-h-[3.5rem] min-w-[3.5rem] rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300 overflow-hidden',
                      'sm:h-14 sm:w-14',
                      `bg-gradient-to-br ${testimonial.avatarGradient}`
                    )}
                    style={{ borderRadius: '50%' }}
                    >
                      <span className="relative z-10">{testimonial.avatarInitials}</span>
                      <div className={cn(
                        'absolute inset-0 rounded-full bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity duration-300',
                        `bg-gradient-to-br ${testimonial.avatarGradient}`
                      )}
                      style={{ borderRadius: '50%' }}
                      ></div>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="container mx-auto max-w-3xl">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
                FAQ - System Zarządzania Szkołą Językową
              </h2>
              <p className="text-xl text-muted-foreground">
                Odpowiedzi na najczęściej zadawane pytania o oprogramowanie LinguaLab dla szkół językowych w Polsce
              </p>
            </div>
          </AnimatedSection>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <AnimatedSection key={index} delay={index * 50}>
                <div className="border-b border-border last:border-b-0 pb-6 last:pb-0">
                  <Accordion type="single" collapsible>
                    <AccordionItem value={`item-${index}`} className="border-none">
                      <AccordionTrigger className="py-4 text-left text-lg font-semibold text-foreground hover:text-primary hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary via-primary/95 to-primary/90 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto max-w-4xl text-center relative">
          <AnimatedSection>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-xs font-semibold mb-8">
              <Coffee className="h-3.5 w-3.5" />
              Zacznij już dziś, zajmie Ci to mniej niż filiżanka kawy
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-8">
              Gotowy na uproszczenie zarządzania szkołą?
            </h2>
            
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
              Dołącz do setek szkół, które znalazły w LinguaLab idealne narzędzie
              do rozwoju swoich placówek.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?mode=signup">
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-white/90 px-10 py-6 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                >
                  Rozpocznij za darmo
                </Button>
              </Link>
              <a 
                href="#pricing"
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById('pricing');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                <Button 
                  size="lg" 
                  className="border-2 border-white/80 text-white bg-white/10 hover:bg-white/20 hover:border-white px-10 py-6 text-lg font-semibold backdrop-blur-sm transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-white/20"
                >
                  Zobacz plany
                </Button>
              </a>
            </div>
            
            <p className="text-sm text-white/80 mt-8">
              Bez karty kredytowej • 7 dni próbnych • Anuluj w każdej chwili
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 bg-foreground text-background">
        <div className="container mx-auto max-w-6xl">
          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
                    <GraduationCap className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <span className="text-2xl font-semibold text-background">LinguaLab</span>
                </div>
                <p className="text-background/70 text-sm leading-relaxed">
                  LinguaLab to najlepsze oprogramowanie do zarządzania szkołą językową w Polsce. System CRM dla szkół językowych łączący funkcjonalność z minimalistycznym designem.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-5 text-background">Produkt</h4>
                <ul className="space-y-3">
                  {[
                    { label: 'Funkcje', id: 'funkcje' },
                    { label: 'Cennik', id: 'pricing' },
                    { label: 'Proces', id: 'proces' },
                    { label: 'Opinie', id: 'opinie' }
                  ].map((item) => (
                    <li key={item.id}>
                      <a 
                        href={`#${item.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          const element = document.getElementById(item.id);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }}
                        className="text-background/70 hover:text-background transition-colors text-sm"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-5 text-background">Firma</h4>
                <ul className="space-y-3">
                  {['O nas', 'Blog', 'Kariera', 'Kontakt'].map((item) => (
                    <li key={item}>
                      <a href="#" className="text-background/70 hover:text-background transition-colors text-sm">
                        {item}
                      </a>
                    </li>
                  ))}
                  <li>
                    <Link to="/privacy-policy" className="text-background/70 hover:text-background transition-colors text-sm">
                      Polityka Prywatności
                    </Link>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-5 text-background">Kontakt</h4>
                <div className="space-y-3 text-sm text-background/70">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    <a href="mailto:kontakt@lingualab.pl" className="hover:text-background transition-colors" aria-label="Napisz do nas email">
                      kontakt@lingualab.pl
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    <a href="tel:+48123456789" className="hover:text-background transition-colors" aria-label="Zadzwoń do nas">
                      +48 123 456 789
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    <span>Polska</span>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
          
          <AnimatedSection delay={100}>
            <div className="pt-8 border-t border-background/20">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-background/70">
                <div>
                  © 2026 LinguaLab - System Zarządzania Szkołą Językową. Wszystkie prawa zastrzeżone.
                </div>
                <div className="flex items-center gap-4">
                  <Link to="/privacy-policy" className="hover:text-background transition-colors">
                    Polityka Prywatności
                  </Link>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </footer>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Potwierdź wybór planu
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedPlan && (
                <>
                  Wybierasz plan <span className="font-semibold text-foreground">
                    {plans.find(p => p.id === selectedPlan)?.name}
                  </span>
                  {' '}w rozliczeniu {billingCycle === 'monthly' ? 'miesięcznym' : 'rocznym'}.
                  {billingCycle === 'yearly' && selectedPlan && (
                    <div className="mt-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Oszczędzasz {calculateSavings(getPlanPrice(selectedPlan).monthly, getPlanPrice(selectedPlan).yearly)} zł rocznie
                      </div>
                    </div>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialogOpen(false)}
              className="border-border"
            >
              Wróć
            </Button>
            <Button 
              className="bg-gradient-primary text-primary-foreground hover:opacity-90" 
              onClick={confirmPlanSelection}
            >
              Przejdź do płatności
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
