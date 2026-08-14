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

## Bekannte Stolpersteine (nicht erneut debuggen)
- Supabase RLS-Policies mit `to anon` haben beim neuen Publishable-Key-System nicht zuverlässig gegriffen, obwohl `auth.role()` korrekt 'anon' zurückgab. Fix: Rollen-Einschränkung weglassen (Policy gilt dann für `public`), nur über die eigentliche Bedingung (z. B. `category = 'kundentermin'`) einschränken.
- Nach einem `.insert()` für anonyme/öffentliche Nutzer **kein** `.select()` anhängen – das löst eine implizite RLS-Leserechte-Prüfung aus, die anonyme Nutzer nicht bestehen. Stattdessen die ID vorher im Browser mit `crypto.randomUUID()` erzeugen.
- Der SQL Editor von Supabase rollt bei einem Fehler in einem Mehrfach-Statement-Skript nicht immer alles zurück – nach einem Fehler mit `select * from pg_policies` / `pg_proc` prüfen, was wirklich angelegt wurde, statt es anzunehmen.
- Nach Anlegen neuer Funktionen/Tabellen ggf. `NOTIFY pgrst, 'reload schema';` ausführen, damit die API sie erkennt.

## Offene Punkte
- Phase 5 (E-Mail) nachholen, sobald Domain-Entscheidung steht
- Vercel-Plan vor echtem Kundenbetrieb von Hobby auf Pro prüfen
