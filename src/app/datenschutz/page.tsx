export default function DatenschutzPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Datenschutzerklärung</h1>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">1. Verantwortlicher</h2>
        <p>
          Omar Opaktiani
          <br />
          Barbershop Hirsch
          <br />
          Talstraße 111, 40217 Düsseldorf
          <br />
          Telefon: 0211 93077801
          <br />
          E-Mail: info@barberhirsch.de
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">2. Welche Daten wir bei einer Online-Buchung erheben</h2>
        <p>
          Wenn du über unsere Website einen Termin buchst, erheben wir: deinen Namen,
          deine E-Mail-Adresse, deine Telefonnummer, die gewählte(n) Leistung(en), den
          gewünschten Termin sowie ggf. den gewählten Mitarbeiter/die gewählte
          Mitarbeiterin.
        </p>
        <p>
          Diese Daten werden ausschließlich zur Vereinbarung, Durchführung und
          Verwaltung deines Termins sowie zur Kontaktaufnahme bei Rückfragen zu diesem
          Termin verwendet.
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">3. Rechtsgrundlage</h2>
        <p>
          Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, da sie
          zur Erfüllung eines Vertrags bzw. zur Durchführung vorvertraglicher Maßnahmen
          (deine Terminbuchung) erforderlich ist. Die Angabe der Daten ist für die
          Buchung notwendig; ohne diese Angaben können wir den Termin nicht vereinbaren.
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">4. Weitergabe an Auftragsverarbeiter</h2>
        <p>
          Für den Betrieb dieser Website nutzen wir folgende technische Dienstleister,
          die in unserem Auftrag Daten verarbeiten, jedoch keinen eigenen Zugriff für
          eigene Zwecke haben:
        </p>
        <ul className="list-inside list-disc">
          <li>Supabase (Datenbank, Serverstandort EU/Frankfurt)</li>
          <li>Vercel (Hosting der Website)</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">5. Speicherdauer</h2>
        <p>
          Wir speichern deine Daten so lange, wie es für die Verwaltung deines Termins
          erforderlich ist. Ein konkretes Löschkonzept für ältere Termine wird aktuell
          erarbeitet. Du kannst jederzeit die Löschung deiner Daten verlangen (siehe
          Punkt 6).
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">6. Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der
          Verarbeitung, Widerspruch gegen die Verarbeitung sowie auf
          Datenübertragbarkeit bezüglich deiner gespeicherten Daten (Art. 15–21 DSGVO).
          Wende dich dafür einfach an die oben genannten Kontaktdaten.
        </p>
        <p>
          Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu
          beschweren, z. B. bei der Landesbeauftragten für Datenschutz und
          Informationsfreiheit Nordrhein-Westfalen.
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">7. Keine automatisierte Entscheidungsfindung</h2>
        <p>
          Wir setzen keine automatisierte Entscheidungsfindung oder Profiling im Sinne
          von Art. 22 DSGVO ein.
        </p>
      </section>
    </main>
  );
}
