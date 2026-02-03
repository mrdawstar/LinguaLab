import { Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft, Shield, Lock, Eye, FileText, Mail, Phone, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">LinguaLab</span>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Powrót do strony głównej
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">Polityka Prywatności</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* Wprowadzenie */}
          <section className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              1. Wprowadzenie
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Niniejsza Polityka Prywatności określa zasady przetwarzania i ochrony danych osobowych 
              użytkowników korzystających z platformy LinguaLab (zwanej dalej "Platformą" lub "Serwisem"). 
              Administratorem danych osobowych jest właściciel platformy LinguaLab.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Szanujemy Twoją prywatność i zobowiązujemy się do ochrony Twoich danych osobowych zgodnie 
              z Rozporządzeniem Ogólnym o Ochronie Danych (RODO) oraz obowiązującymi przepisami prawa polskiego.
            </p>
          </section>

          {/* Administrator danych */}
          <section className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              2. Administrator Danych
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed">
                Administratorem danych osobowych przetwarzanych w ramach Platformy LinguaLab jest:
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span><strong>Email:</strong> kontakt@lingualab.pl</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <span><strong>Telefon:</strong> +48 123 456 789</span>
                </div>
              </div>
            </div>
          </section>

          {/* Zbierane dane */}
          <section className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              3. Jakie Dane Zbieramy
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">3.1. Dane użytkowników (Administratorzy, Managerowie, Nauczyciele)</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Adres e-mail (wymagany do rejestracji i logowania)</li>
                  <li>Hasło (przechowywane w formie zaszyfrowanej)</li>
                  <li>Imię i nazwisko</li>
                  <li>Nazwa szkoły (w przypadku administratora)</li>
                  <li>Rola w systemie (admin, manager, teacher)</li>
                  <li>Identyfikator szkoły (school_id)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">3.2. Dane uczniów</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Imię i nazwisko</li>
                  <li>Adres e-mail</li>
                  <li>Numer telefonu (opcjonalnie)</li>
                  <li>Profil Instagram (opcjonalnie)</li>
                  <li>Język nauki i poziom zaawansowania</li>
                  <li>Status płatności</li>
                  <li>Informacje o pakietach lekcji (liczba godzin, zużyte godziny, data wygaśnięcia)</li>
                  <li>Historia lekcji i frekwencja</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">3.3. Dane nauczycieli</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Imię i nazwisko</li>
                  <li>Adres e-mail</li>
                  <li>Informacje o przypisanych grupach i uczniach</li>
                  <li>Harmonogram zajęć</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">3.4. Dane płatności</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Kwoty płatności</li>
                  <li>Daty płatności i terminy płatności</li>
                  <li>Status płatności (pending, paid, overdue)</li>
                  <li>Opisy transakcji</li>
                  <li>Dane subskrypcji (plan, status, data wygaśnięcia)</li>
                </ul>
                <p className="text-sm mt-2 italic">
                  <strong>Uwaga:</strong> Szczegółowe dane płatnicze (numery kart, dane bankowe) 
                  są przetwarzane wyłącznie przez Stripe i nie są przechowywane w naszej bazie danych.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">3.5. Dane techniczne</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Adres IP</li>
                  <li>Typ przeglądarki i systemu operacyjnego</li>
                  <li>Data i godzina logowania</li>
                  <li>Informacje o urządzeniu</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Cel przetwarzania */}
          <section className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              4. Cel Przetwarzania Danych
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed">Przetwarzamy Twoje dane osobowe w następujących celach:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Świadczenie usług:</strong> Umożliwienie korzystania z platformy LinguaLab, zarządzania szkołą językową, uczniami, nauczycielami, harmonogramem zajęć i płatnościami</li>
                <li><strong>Autentykacja i bezpieczeństwo:</strong> Weryfikacja tożsamości użytkowników, zapewnienie bezpieczeństwa konta</li>
                <li><strong>Obsługa płatności:</strong> Przetwarzanie płatności za subskrypcje i pakiety lekcji poprzez Stripe</li>
                <li><strong>Komunikacja:</strong> Wysyłanie powiadomień e-mail dotyczących zajęć, płatności, przypomnień</li>
                <li><strong>Raporty i statystyki:</strong> Generowanie raportów dotyczących frekwencji, płatności, postępów uczniów</li>
                <li><strong>Wsparcie techniczne:</strong> Rozwiązywanie problemów technicznych i odpowiadanie na zapytania</li>
                <li><strong>Wymogi prawne:</strong> Spełnienie obowiązków prawnych, w tym podatkowych i rachunkowych</li>
                <li><strong>Marketing:</strong> Wysyłanie informacji o nowych funkcjach i ofertach (tylko za zgodą użytkownika)</li>
              </ul>
            </div>
          </section>

          {/* Podstawa prawna */}
          <section className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              5. Podstawa Prawna Przetwarzania
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed">Przetwarzamy Twoje dane osobowe na podstawie:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Art. 6 ust. 1 lit. b RODO</strong> - wykonanie umowy o świadczenie usług (rejestracja, korzystanie z platformy)</li>
                <li><strong>Art. 6 ust. 1 lit. a RODO</strong> - zgoda użytkownika (newsletter, marketing)</li>
                <li><strong>Art. 6 ust. 1 lit. c RODO</strong> - obowiązek prawny (rachunkowość, podatki)</li>
                <li><strong>Art. 6 ust. 1 lit. f RODO</strong> - prawnie uzasadniony interes administratora (bezpieczeństwo, zapobieganie nadużyciom)</li>
              </ul>
            </div>
          </section>

          {/* Odbiorcy danych */}
          <section className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              6. Odbiorcy Danych
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">Twoje dane mogą być przekazywane następującym odbiorcom:</p>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">6.1. Supabase (Dostawca infrastruktury)</h3>
                <p className="leading-relaxed">
                  Platforma wykorzystuje Supabase jako dostawcę usług hostingowych i bazy danych. 
                  Supabase przechowuje dane w centrach danych zgodnych z normami bezpieczeństwa. 
                  Więcej informacji: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://supabase.com/privacy</a>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">6.2. Stripe (Przetwarzanie płatności)</h3>
                <p className="leading-relaxed">
                  W celu przetwarzania płatności za subskrypcje i pakiety lekcji wykorzystujemy Stripe. 
                  Stripe przetwarza dane płatnicze zgodnie z własną polityką prywatności i standardami PCI DSS. 
                  Więcej informacji: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://stripe.com/privacy</a>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">6.3. Inni użytkownicy w ramach szkoły</h3>
                <p className="leading-relaxed">
                  Administratorzy, managerowie i nauczyciele przypisani do tej samej szkoły mają dostęp 
                  do danych uczniów i informacji o zajęciach w zakresie niezbędnym do wykonywania swoich obowiązków.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">6.4. Organy państwowe</h3>
                <p className="leading-relaxed">
                  W przypadku wymogu prawnego możemy przekazać dane organom państwowym (np. urzędom skarbowym, 
                  organom ścigania) na podstawie obowiązujących przepisów prawa.
                </p>
              </div>
            </div>
          </section>

          {/* Okres przechowywania */}
          <section className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              7. Okres Przechowywania Danych
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Dane konta użytkownika:</strong> Przechowywane przez czas trwania konta oraz przez okres wymagany przepisami prawa (np. przepisy podatkowe - 5 lat)</li>
                <li><strong>Dane uczniów:</strong> Przechowywane przez czas trwania relacji z uczniami oraz przez okres wymagany przepisami prawa</li>
                <li><strong>Dane płatności:</strong> Przechowywane przez okres wymagany przepisami podatkowymi i rachunkowymi (minimum 5 lat)</li>
                <li><strong>Dane subskrypcji:</strong> Przechowywane przez czas trwania subskrypcji oraz przez okres wymagany przepisami prawa</li>
                <li><strong>Dane techniczne (logi):</strong> Przechowywane przez okres niezbędny do zapewnienia bezpieczeństwa (maksymalnie 12 miesięcy)</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Po upływie okresu przechowywania dane są trwale usuwane lub anonimizowane.
              </p>
            </div>
          </section>

          {/* Prawa użytkownika */}
          <section className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              8. Twoje Prawa
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed">Zgodnie z RODO przysługują Ci następujące prawa:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Prawo dostępu (Art. 15 RODO):</strong> Możesz żądać informacji o przetwarzanych danych osobowych</li>
                <li><strong>Prawo do sprostowania (Art. 16 RODO):</strong> Możesz żądać poprawienia nieprawidłowych danych</li>
                <li><strong>Prawo do usunięcia (Art. 17 RODO):</strong> Możesz żądać usunięcia danych w określonych sytuacjach</li>
                <li><strong>Prawo do ograniczenia przetwarzania (Art. 18 RODO):</strong> Możesz żądać ograniczenia przetwarzania danych</li>
                <li><strong>Prawo do przenoszenia danych (Art. 20 RODO):</strong> Możesz żądać przekazania danych w formacie strukturalnym</li>
                <li><strong>Prawo do sprzeciwu (Art. 21 RODO):</strong> Możesz wnieść sprzeciw wobec przetwarzania danych</li>
                <li><strong>Prawo do cofnięcia zgody:</strong> Możesz w każdej chwili cofnąć zgodę na przetwarzanie danych (jeśli przetwarzanie opiera się na zgodzie)</li>
                <li><strong>Prawo do wniesienia skargi:</strong> Możesz złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych (UODO)</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Aby skorzystać z powyższych praw, skontaktuj się z nami pod adresem: <strong className="text-foreground">kontakt@lingualab.pl</strong>
              </p>
            </div>
          </section>

          {/* Bezpieczeństwo */}
          <section className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              9. Bezpieczeństwo Danych
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed">
                Stosujemy odpowiednie środki techniczne i organizacyjne zapewniające ochronę danych osobowych:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Szyfrowanie danych podczas przesyłania (HTTPS/TLS)</li>
                <li>Szyfrowanie haseł (hashowanie z użyciem bezpiecznych algorytmów)</li>
                <li>Row Level Security (RLS) w bazie danych zapewniające dostęp tylko do danych własnej szkoły</li>
                <li>Regularne aktualizacje systemu i zabezpieczeń</li>
                <li>Ograniczony dostęp do danych tylko dla autoryzowanego personelu</li>
                <li>Regularne kopie zapasowe danych</li>
                <li>Monitorowanie i logowanie dostępu do systemu</li>
              </ul>
              <p className="leading-relaxed mt-4 text-sm italic">
                <strong>Uwaga:</strong> Pomimo zastosowanych środków bezpieczeństwa, żaden system nie jest w 100% bezpieczny. 
                Prosimy o zachowanie ostrożności i nieudostępnianie danych logowania osobom trzecim.
              </p>
            </div>
          </section>

          {/* Pliki cookies */}
          <section className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              10. Pliki Cookies i Technologie Śledzące
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed">
                Platforma LinguaLab wykorzystuje pliki cookies i podobne technologie w następujących celach:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Niezbędne cookies:</strong> Wymagane do działania platformy (sesja użytkownika, autentykacja)</li>
                <li><strong>Funkcjonalne cookies:</strong> Zapamiętywanie preferencji użytkownika (motyw, język)</li>
                <li><strong>Analityczne cookies:</strong> Zbieranie informacji o sposobie korzystania z platformy (opcjonalnie, za zgodą)</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Możesz zarządzać plikami cookies w ustawieniach przeglądarki. Wyłączenie niektórych plików cookies 
                może wpłynąć na funkcjonalność platformy.
              </p>
            </div>
          </section>

          {/* Przekazywanie danych poza UE */}
          <section className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-primary" />
              11. Przekazywanie Danych poza Europejski Obszar Gospodarczy
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed">
                Niektóre z naszych dostawców usług (np. Supabase, Stripe) mogą przetwarzać dane poza Europejskim 
                Obszarem Gospodarczym (EOG). W takich przypadkach zapewniamy odpowiednie zabezpieczenia prawne, 
                w tym standardowe klauzule umowne zatwierdzone przez Komisję Europejską.
              </p>
            </div>
          </section>

          {/* Zmiany w polityce */}
          <section className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              12. Zmiany w Polityce Prywatności
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed">
                Zastrzegamy sobie prawo do wprowadzania zmian w niniejszej Polityce Prywatności. 
                O wszelkich zmianach będziemy informować użytkowników poprzez:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Wyświetlenie powiadomienia na platformie</li>
                <li>Wysłanie wiadomości e-mail (w przypadku istotnych zmian)</li>
                <li>Zaktualizowanie daty "Ostatniej aktualizacji" na początku dokumentu</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Kontynuowanie korzystania z platformy po wprowadzeniu zmian oznacza akceptację nowej Polityki Prywatności.
              </p>
            </div>
          </section>

          {/* Kontakt */}
          <section className="bg-card border border-border rounded-xl p-6 sm:p-8 bg-gradient-to-br from-primary/5 to-primary/10">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              13. Kontakt
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">
                W przypadku pytań dotyczących przetwarzania danych osobowych lub skorzystania z przysługujących praw, 
                prosimy o kontakt:
              </p>
              <div className="bg-background/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-semibold text-foreground">Email</div>
                    <a href="mailto:kontakt@lingualab.pl" className="text-primary hover:underline">
                      kontakt@lingualab.pl
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-semibold text-foreground">Telefon</div>
                    <a href="tel:+48123456789" className="text-primary hover:underline">
                      +48 123 456 789
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Powrót do strony głównej
            </Button>
          </Link>
          <div className="text-sm text-muted-foreground text-center sm:text-right">
            © {new Date().getFullYear()} LinguaLab. Wszystkie prawa zastrzeżone.
          </div>
        </div>
      </main>
    </div>
  );
}
