# Landjugend Festplaner – Anleitung von Null bis zur fertigen App

Diese Anleitung führt dich in drei Schritten zur fertigen App:
1. Supabase einrichten (die Datenbank, ca. 10 Minuten)
2. Netlify einrichten (die Webseite, ca. 10 Minuten)
3. App am Handy installieren (1 Minute pro Person)

Du brauchst keine Kreditkarte – die Gratis-Stufen von Supabase und Netlify reichen für den Vereinsgebrauch locker aus.

---

## Schritt 1: Supabase einrichten (Datenbank + Live-Abgleich)

1. Gehe auf **https://supabase.com** und erstelle ein kostenloses Konto.
2. Klicke auf **"New project"**:
   - Name: z. B. `landjugend-festplaner`
   - Datenbank-Passwort: irgendein sicheres Passwort (gut aufheben, wird aber im Alltag nicht gebraucht)
   - Region: **Central EU (Frankfurt)** – am nächsten zu Österreich
3. Warte, bis das Projekt fertig erstellt ist (1–2 Minuten).
4. Öffne links im Menü den **SQL Editor**.
5. Öffne die Datei **`supabase/schema.sql`** aus diesem Projekt, kopiere den **gesamten Inhalt** hinein und klicke auf **"Run"**.
   - Damit werden alle Tabellen angelegt, der Live-Abgleich aktiviert und sämtliche To-dos der Festwoche, die drei Fahrzeuge (Weißer Bus, Pickup, Pritsche) und die Geschäfte bereits eingetragen.
6. Hole dir jetzt die zwei Zugangsdaten für die App. Gehe zu **Settings (Zahnrad) → API**:
   - **Project URL** → das ist deine `VITE_SUPABASE_URL`
   - **anon public** Schlüssel (unter "Project API keys") → das ist dein `VITE_SUPABASE_ANON_KEY`
   - Beide kopieren, die brauchst du gleich bei Netlify.

> Hinweis: Der "anon"-Schlüssel ist dafür gemacht, öffentlich in einer Web-App zu stecken – das ist so vorgesehen. Den **"service_role"-Schlüssel dagegen niemals** verwenden oder weitergeben.

---

## Schritt 2: Netlify einrichten (die App ins Internet bringen)

Der einfachste Weg geht über GitHub:

1. Erstelle ein kostenloses Konto auf **https://github.com** (falls noch keines vorhanden).
2. Erstelle dort ein neues Repository (z. B. `landjugend-festplaner`) und lade den gesamten Projektordner hoch.
   - Entweder über die GitHub-Webseite ("uploading an existing file" – einfach alle Dateien hineinziehen)
   - Oder per Git, wenn du das schon kennst.
3. Gehe auf **https://netlify.com**, erstelle ein Konto und wähle **"Add new site → Import an existing project → GitHub"**.
4. Wähle dein Repository aus. Netlify erkennt die Datei `netlify.toml` automatisch:
   - Build command: `npm run build` (steht schon drin)
   - Publish directory: `dist` (steht schon drin)
5. **Wichtig, bevor du auf Deploy klickst:** Gehe zu **"Site configuration → Environment variables"** und lege zwei Variablen an:

   | Name | Wert |
   |---|---|
   | `VITE_SUPABASE_URL` | deine Project URL aus Schritt 1 |
   | `VITE_SUPABASE_ANON_KEY` | dein anon-Schlüssel aus Schritt 1 |

6. Klicke auf **"Deploy"**. Nach 1–2 Minuten ist die App unter einer Adresse wie `https://landjugend-festplaner.netlify.app` erreichbar.
7. Optional: Unter "Domain management" kannst du den Namen ändern, damit er leichter zu merken ist.

Diesen Link teilst du dann in eurer WhatsApp-Gruppe – mehr braucht niemand.

**Alternative ohne GitHub:** Du kannst das Projekt auch lokal bauen (`npm install`, dann `npm run build` – vorher eine Datei `.env` nach dem Muster von `.env.example` anlegen) und den entstandenen `dist`-Ordner per Drag & Drop auf https://app.netlify.com/drop ziehen. Der GitHub-Weg ist aber besser, weil spätere Änderungen dann automatisch online gehen.

---

## Schritt 3: App am Handy installieren (Android)

Die App ist eine sogenannte PWA – sie lässt sich wie eine echte App am Startbildschirm ablegen, mit eigenem Icon in den Landjugend-Farben:

**Android (Chrome):**
1. Den Netlify-Link in Chrome öffnen.
2. Oben rechts auf die **drei Punkte** tippen.
3. **"App installieren"** bzw. **"Zum Startbildschirm hinzufügen"** wählen.
4. Fertig – das grün-orange Icon liegt jetzt am Startbildschirm und die App öffnet im Vollbild ohne Browserleiste.

**iPhone (Safari):**
1. Link in Safari öffnen.
2. Auf das **Teilen-Symbol** (Quadrat mit Pfeil) tippen.
3. **"Zum Home-Bildschirm"** wählen.

---

## Wie die App funktioniert (fürs Team)

- **Anmelden:** Nur den Namen eingeben – kein Passwort, kein PIN. Das Gerät merkt sich den Namen dauerhaft; beim nächsten Öffnen ist man automatisch wieder angemeldet. Wer schon einmal dabei war, erscheint für alle als Schnellauswahl-Knopf.
- **Abhaken:** Beim Erledigen einer Aufgabe werden automatisch Name und Uhrzeit gespeichert und für alle sichtbar angezeigt.
- **Verschieben:** Der orange Knopf schiebt alle offenen Aufgaben eines Tages auf den nächsten Tag – jede verschobene Aufgabe bekommt das Kennzeichen "⏩ verschoben von …".
- **Live:** Alle Änderungen (Aufgaben, Einkaufsliste, Fahrzeuge) erscheinen bei allen anderen sofort, ohne die Seite neu zu laden. Oben im Kopfbereich zeigt "🟢 live" an, dass die Verbindung steht.
- **Fahrzeuge:** Weißer Bus, Pickup und Pritsche sind pro Tag in Vormittag und Nachmittag unterteilt. Ein Tipp reserviert, ein weiterer Tipp gibt frei. Fremde Reservierungen kann man nicht überschreiben – die Datenbank verhindert Doppelbuchungen sogar dann, wenn zwei Personen gleichzeitig tippen.

---

## Häufige Fragen

**Es erscheint "Supabase noch nicht verbunden"?**
Die zwei Umgebungsvariablen fehlen oder sind falsch geschrieben. Bei Netlify prüfen (Site configuration → Environment variables) und danach unter "Deploys" auf **"Trigger deploy → Clear cache and deploy site"** klicken – Umgebungsvariablen wirken erst nach einem neuen Build.

**Kann jemand von außen auf unsere Daten zugreifen?**
Nur wer den Link kennt, kann die App nutzen. Es gibt bewusst keine Passwörter, damit die Bedienung für alle einfach bleibt – teilt den Link also nur intern. Nach dem Fest kann man das Supabase-Projekt pausieren oder löschen.

**Wie setze ich alles für das nächste Fest zurück?**
Im Supabase SQL-Editor ausführen: `truncate tasks, store_items, vehicle_bookings;` – dann sind alle Häkchen, Einkäufe und Reservierungen weg, die Struktur bleibt. Neue To-dos können direkt in der App angelegt werden.

**Was kostet das?**
Nichts. Supabase Free und Netlify Free reichen für eine Vereins-App mit ein paar Dutzend Nutzern problemlos.
