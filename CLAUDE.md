# Friseur-Buchung – Projektstatus

Terminbuchungs-App für Barbershop Hirsch (barberhirsch.de, Düsseldorf). Besteht aus einem internen Tool für Mitarbeiter (Login, Kalender, Team, Leistungen) und einer öffentlichen Buchungsseite für Kunden.

Der Nutzer ist Programmier-Anfänger: wichtige Entscheidungen kurz und einfach erklären, bevor sie umgesetzt werden, und größere Änderungen in überschaubaren Schritten angehen statt alles auf einmal.

## Stack
- Next.js 16 (App Router, TypeScript, Tailwind)
- Supabase (Postgres-Datenbank + Auth) – Projekt-Ref `ahakwuxodcuolhlpygen`, SQL Editor: https://supabase.com/dashboard/project/ahakwuxodcuolhlpygen/sql/new
- Vercel Hosting, **Hobby-Plan** (bewusst, wegen 50€/Monat-Budgetziel – vor echtem Live-Gang mit zahlenden Kunden ggf. auf Pro upgraden)
- Stabile Produktions-URL: https://friseur-buchung-zeta.vercel.app (NICHT die einzelnen Deployment-URLs mit Zufalls-Hash verwenden, die frieren beim jeweiligen Deploy ein)
- FullCalendar (kostenlose Standard-Version, bewusst keine Premium-Ressourcenansicht wegen ~480$/Jahr Lizenzkosten)
- GitHub: `nguyenkv/friseur-buchung` (privat), Push per SSH-Key (`~/.ssh/id_ed25519_github`)

## Umgesetzte Phasen
- ✅ Phase 0: Next.js + Supabase + Vercel Grundgerüst
- ✅ Phase 1: Datenmodell, Mitarbeiter-Login, Team-Übersicht (mit Bearbeiten-Modus, Hinzufügen/Löschen)
- ✅ Phase 2: Interner Kalender (Tages-/Wochenansicht, Kategorien Kundentermin/Urlaub/Krankheit/Sonstiges, Detailansicht mit Bearbeiten/Löschen)
- ✅ Phase 3: Leistungs-/Preiskatalog
- ✅ Phase 4: Öffentliche Buchungsseite (`/buchen`) mit automatischer Slot-Berechnung
- ⏸ Phase 5: Bestätigungs-E-Mail (Resend) – **zurückgestellt**, wartet auf Entscheidung, welche zentral verwaltete Domain fürs Versenden genutzt wird (nicht die Salon-Domain). Bis dahin: Hinweis auf der Bestätigungsseite, einen Screenshot zu machen.
- ✅ Phase 6: PWA-Manifest, Apple-Touch-Icon (Platzhalter "BH", da kein sauberes Logo verfügbar ist – das echte Salon-Logo ist nur ein Foto vom Wandschild), Responsive-Test auf iPad bestanden

## Weitere Features (Stand 2026-08-15)
- **Datenschutz:** `/impressum` und `/datenschutz` (Verantwortlicher: Omar Opaktiani, Daten von barberhirsch.de/impressum übernommen), Checkbox-Pflicht vor Buchungsabschluss. Texte sind guter Wille, kein Rechtsrat – vor echtem Go-Live juristisch prüfen lassen. Löschkonzept und Auskunft/Löschung-Suchfunktion noch offen.
- **Einstellungen (`/einstellungen`):** neue `settings`-Tabelle (eine Zeile) mit `booking_horizon_weeks` (Standard 4), `min_lead_hours` (Standard 2), `default_weekday_start/end` + `default_saturday_start/end` (Standard 09:00-19:00 / 09:00-18:30). Erreichbar über ein Zahnrad-Icon in der Hauptnav. Beide Buchungsgrenzen serverseitig UND clientseitig durchgesetzt (RLS-Policy auf `calendar_entries` prüft `settings` direkt, `get_available_slots` ebenso). Arbeitszeiten gelten einheitlich fürs ganze Team – Speichern überschreibt `working_hours` bei allen Mitarbeitern, nicht nur bei neuen.
- **Sonntag gesperrt:** Kalender blendet Sonntag komplett aus (`hiddenDays={[0]}`), Buchungsseite korrigiert eine gewählte Sonntag automatisch auf Montag (natives Datumsfeld kann keine einzelnen Wochentage sperren).
- **Mobile-Optimierung Kalender:** kompaktere Buttons, FullCalendar-Kopfzeile per CSS responsive gemacht, Start automatisch in Tagesansicht unter 640px Breite. Wichtig: KEIN `windowResize`-Handler zum Ansicht-Wechseln mehr verwenden – iOS Safari feuert beim Scrollen (Adressleiste ein-/ausklappend) falsche Resize-Events, das hat ungewollt zurück zur Tagesansicht springen lassen.

## Bekannte Stolpersteine (nicht erneut debuggen)
- Supabase RLS-Policies mit `to anon` haben beim neuen Publishable-Key-System nicht zuverlässig gegriffen, obwohl `auth.role()` korrekt 'anon' zurückgab. Fix: Rollen-Einschränkung weglassen (Policy gilt dann für `public`), nur über die eigentliche Bedingung (z. B. `category = 'kundentermin'`) einschränken.
- Nach einem `.insert()` für anonyme/öffentliche Nutzer **kein** `.select()` anhängen – das löst eine implizite RLS-Leserechte-Prüfung aus, die anonyme Nutzer nicht bestehen. Stattdessen die ID vorher im Browser mit `crypto.randomUUID()` erzeugen.
- Der SQL Editor von Supabase rollt bei einem Fehler in einem Mehrfach-Statement-Skript nicht immer alles zurück – nach einem Fehler mit `select * from pg_policies` / `pg_proc` prüfen, was wirklich angelegt wurde, statt es anzunehmen.
- Nach Anlegen neuer Funktionen/Tabellen ggf. `NOTIFY pgrst, 'reload schema';` ausführen, damit die API sie erkennt.
- Nach jedem Deploy kann der Browser-/PWA-Cache alte Versionen zeigen. Tab schließen reicht oft NICHT – privaten/Inkognito-Tab zum sicheren Testen nutzen. Das Home-Bildschirm-Icon (PWA) hat einen eigenen, separaten Cache von normalem Safari.
- Vor dem Bitten um erneutes Testen: neue CSS/JS-Bundles per `curl` direkt am Server prüfen (spart Rückfragen).

## Offene Punkte
- Phase 5 (E-Mail) nachholen, sobald Domain-Entscheidung steht
- Vercel-Plan vor echtem Kundenbetrieb von Hobby auf Pro prüfen (auch wegen AVV, siehe Business-Notizen)
- Löschkonzept (Aufbewahrungsdauer) und Auskunft/Löschung-Suchfunktion für Kundendaten
- Doppelbuchungsschutz auf DB-Ebene (aktuell nur durch Anwendungslogik verhindert)
- Preismodell: 39€/Monat empfohlen, Supabase Free-Tier reicht bis 2 Kunden, danach Pro (~10€+/Kunde zusätzlich)
