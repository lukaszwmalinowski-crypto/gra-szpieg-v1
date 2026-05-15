# Szpieg

Mobilna aplikacja PWA do gry imprezowej „Szpieg”. Ten dokument prowadzi krok po kroku od pustego komputera do działającej aplikacji online.

## Co będzie potrzebne

- Konto GitHub: https://github.com
- Konto Supabase: https://supabase.com
- Zainstalowany Node.js: https://nodejs.org
- Edytor kodu, np. Visual Studio Code: https://code.visualstudio.com

Jeśli nie wiesz, którą wersję Node.js wybrać, pobierz wersję LTS. Po instalacji uruchom terminal i sprawdź:

```bash
node -v
npm -v
```

Jeśli widzisz numery wersji, wszystko jest gotowe.

## 1. Uruchomienie aplikacji na swoim komputerze

1. Otwórz terminal w folderze projektu.
2. Zainstaluj paczki:

```bash
npm install
```

3. Uruchom aplikację:

```bash
npm run dev
```

4. Terminal pokaże adres podobny do:

```bash
http://localhost:5173
```

5. Otwórz ten adres w przeglądarce.

Na tym etapie aplikacja może pokazać komunikat o braku konfiguracji Supabase. To normalne. Supabase ustawiamy w następnym kroku.

## 2. Konfiguracja Supabase

Supabase będzie przechowywać pokoje, graczy, głosy i synchronizować telefony graczy na żywo.

### 2.1. Utwórz projekt

1. Wejdź na https://supabase.com
2. Kliknij `Start your project` albo `Sign in`.
3. Zaloguj się, najlepiej kontem GitHub.
4. Kliknij `New project`.
5. Wypełnij formularz:
   - `Organization`: wybierz domyślną organizację.
   - `Project name`: wpisz `szpieg`.
   - `Database Password`: ustaw hasło i zapisz je w bezpiecznym miejscu.
   - `Region`: wybierz najbliższy region, np. Europa.
6. Kliknij `Create new project`.
7. Poczekaj kilka minut, aż Supabase utworzy projekt.

### 2.2. Utwórz tabele w bazie

1. W panelu Supabase otwórz swój projekt.
2. Po lewej stronie kliknij `SQL Editor`.
3. Kliknij `New query`.
4. Otwórz w tym projekcie plik [supabase/schema.sql](./supabase/schema.sql).
5. Skopiuj całą zawartość tego pliku.
6. Wklej ją do okna `SQL Editor` w Supabase.
7. Kliknij `Run`.

Po wykonaniu tego kroku Supabase utworzy tabele:

- `rooms`
- `players`
- `votes`

Ustawi też podstawowe zasady dostępu i włączy synchronizację Realtime.

### 2.3. Sprawdź Realtime

1. W Supabase po lewej stronie kliknij `Database`.
2. Znajdź sekcję `Replication` albo `Publications`.
3. Otwórz publikację `supabase_realtime`.
4. Upewnij się, że są tam tabele:
   - `rooms`
   - `players`
   - `votes`

Jeśli ich nie ma, dodaj je ręcznie do publikacji Realtime.

### 2.4. Pobierz dane do połączenia aplikacji z Supabase

1. W Supabase kliknij ikonę koła zębatego `Project Settings`.
2. Kliknij `API`.
3. Skopiuj wartość `Project URL`.
4. Skopiuj klucz `anon public`.

To nie jest hasło administratora. Ten klucz jest przeznaczony do użycia w aplikacji przeglądarkowej.

### 2.5. Utwórz plik `.env`

1. W folderze projektu znajdź plik `.env.example`.
2. Utwórz obok niego nowy plik o nazwie `.env`.
3. Wklej do niego:

```bash
VITE_SUPABASE_URL=TU_WKLEJ_PROJECT_URL
VITE_SUPABASE_ANON_KEY=TU_WKLEJ_ANON_PUBLIC_KEY
```

Przykład:

```bash
VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

4. Zatrzymaj lokalny serwer, jeśli działa.
5. Uruchom go ponownie:

```bash
npm run dev
```

Aplikacja powinna już tworzyć pokoje i zapisywać dane w Supabase.

## 3. Test lokalny na kilku telefonach

Najprostszy test:

1. Uruchom aplikację lokalnie przez `npm run dev`.
2. Otwórz ją na komputerze.
3. Utwórz pokój jako host.
4. Na drugim urządzeniu otwórz ten sam adres, jeśli urządzenia są w tej samej sieci Wi-Fi.

Vite może pokazać tylko adres `localhost`, który działa wyłącznie na Twoim komputerze. Żeby telefon widział aplikację w sieci lokalnej, uruchom:

```bash
npm run dev -- --host
```

Terminal pokaże adres sieciowy, np.:

```bash
http://192.168.1.20:5173
```

Ten adres wpisz w telefonie.

## 4. Wrzucenie projektu na GitHub

GitHub będzie miejscem, gdzie trzymasz kod aplikacji.

### 4.1. Utwórz repozytorium

1. Wejdź na https://github.com
2. Kliknij `+` w prawym górnym rogu.
3. Kliknij `New repository`.
4. Nazwa repozytorium, np. `szpieg`.
5. Wybierz `Public` albo `Private`.
6. Nie musisz zaznaczać `Add a README file`, bo README już istnieje w projekcie.
7. Kliknij `Create repository`.

### 4.2. Połącz lokalny projekt z GitHub

W terminalu, w folderze projektu, wykonaj:

```bash
git init
git add .
git commit -m "Pierwsza wersja aplikacji Szpieg"
git branch -M main
git remote add origin https://github.com/TWOJ_LOGIN/szpieg.git
git push -u origin main
```

Zamień `TWOJ_LOGIN` na swój login GitHub.

Jeśli GitHub poprosi o logowanie, zaloguj się zgodnie z instrukcją w terminalu albo użyj aplikacji GitHub Desktop.

## 5. Ustawienia sekretów na GitHub

Sekrety to bezpieczne miejsce na dane Supabase potrzebne podczas publikacji.

1. Wejdź do repozytorium na GitHub.
2. Kliknij `Settings`.
3. W lewym menu kliknij `Secrets and variables`.
4. Kliknij `Actions`.
5. Kliknij `New repository secret`.
6. Dodaj pierwszy sekret:
   - `Name`: `VITE_SUPABASE_URL`
   - `Secret`: wklej `Project URL` z Supabase.
7. Kliknij `Add secret`.
8. Dodaj drugi sekret:
   - `Name`: `VITE_SUPABASE_ANON_KEY`
   - `Secret`: wklej `anon public key` z Supabase.
9. Kliknij `Add secret`.

## 6. Publikacja przez GitHub Pages

W projekcie jest już gotowy plik publikacji:

[.github/workflows/deploy-github-pages.yml](./.github/workflows/deploy-github-pages.yml)

### 6.1. Włącz GitHub Pages

1. Wejdź do repozytorium na GitHub.
2. Kliknij `Settings`.
3. W lewym menu kliknij `Pages`.
4. Przy `Source` wybierz `GitHub Actions`.
5. Zapisz ustawienia, jeśli GitHub pokaże przycisk zapisu.

### 6.2. Uruchom publikację

Publikacja uruchomi się automatycznie po każdym `git push` na gałąź `main`.

Możesz też uruchomić ją ręcznie:

1. Wejdź w zakładkę `Actions`.
2. Kliknij `Deploy to GitHub Pages`.
3. Kliknij `Run workflow`.
4. Poczekaj, aż zadanie zakończy się na zielono.

Po kilku minutach strona będzie dostępna pod adresem podobnym do:

```bash
https://TWOJ_LOGIN.github.io/szpieg/
```

## 7. Publikacja przez Netlify, prostsza alternatywa

Netlify jest często łatwiejsze dla początkujących niż GitHub Pages.

1. Wejdź na https://www.netlify.com
2. Zaloguj się kontem GitHub.
3. Kliknij `Add new site`.
4. Kliknij `Import an existing project`.
5. Wybierz GitHub.
6. Wybierz repozytorium `szpieg`.
7. Ustaw:
   - `Build command`: `npm run build`
   - `Publish directory`: `dist`
8. Otwórz sekcję `Environment variables`.
9. Dodaj:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
10. Kliknij `Deploy`.

Netlify pokaże adres strony, np.:

```bash
https://szpieg-twojanazwa.netlify.app
```

## 8. Jak sprawdzić, czy wszystko działa

1. Otwórz opublikowaną aplikację.
2. Kliknij `Utwórz pokój`.
3. Wpisz nick hosta.
4. Utwórz pokój.
5. Skopiuj link albo kod pokoju.
6. Otwórz link na kilku telefonach.
7. Każdy gracz wpisuje nick i dołącza.
8. Gdy jest minimum 3 graczy, host klika `Rozpocznij grę`.
9. Gracze widzą swoje role.
10. Host wybiera osobę do pytania.
11. Host uruchamia głosowanie.
12. Gracze oddają głosy.
13. Aplikacja pokazuje wynik.

## 9. Najczęstsze problemy

### Aplikacja mówi: `Uzupełnij konfigurację Supabase`

Brakuje pliku `.env` albo zmienne są puste. Sprawdź krok 2.5.

### Pokój się nie tworzy

Sprawdź, czy w Supabase uruchomiono cały plik `supabase/schema.sql`.

### Gracze nie widzą zmian na żywo

Sprawdź Realtime w Supabase. Tabele `rooms`, `players` i `votes` muszą być dodane do publikacji `supabase_realtime`.

### GitHub Pages pokazuje pustą stronę

Sprawdź zakładkę `Actions` w GitHub. Jeśli workflow jest czerwony, kliknij go i zobacz błąd. Najczęstszy powód to brak sekretów `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`.

### Komenda `npm` nie działa

Zainstaluj Node.js LTS z https://nodejs.org i otwórz terminal ponownie.

## 10. Ważna uwaga o bezpieczeństwie

Ta wersja jest MVP do gry imprezowej bez logowania. Aplikacja pozwala anonimowym użytkownikom tworzyć pokoje, dołączać i głosować. To jest dobre na start, ale przy publicznej aplikacji z dużym ruchem warto później dodać mocniejsze zabezpieczenia po stronie Supabase.
