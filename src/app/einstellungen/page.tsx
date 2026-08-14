"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { InternalNav } from "@/components/InternalNav";

type Settings = {
  id: string;
  booking_horizon_weeks: number;
  min_lead_hours: number;
  default_weekday_start: string;
  default_weekday_end: string;
  default_saturday_start: string;
  default_saturday_end: string;
};

export default function EinstellungenPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setCheckingSession(false);
      loadSettings();
    });
  }, [router]);

  async function loadSettings() {
    const { data } = await supabase.from("settings").select("*").limit(1).maybeSingle();
    setSettings(data);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setSaved(false);
    setError(null);

    const { error } = await supabase
      .from("settings")
      .update({
        booking_horizon_weeks: settings.booking_horizon_weeks,
        min_lead_hours: settings.min_lead_hours,
        default_weekday_start: settings.default_weekday_start,
        default_weekday_end: settings.default_weekday_end,
        default_saturday_start: settings.default_saturday_start,
        default_saturday_end: settings.default_saturday_end,
      })
      .eq("id", settings.id);

    if (error) {
      setSaving(false);
      setError("Speichern fehlgeschlagen: " + error.message);
      return;
    }

    // Arbeitszeiten gelten fuer alle Mitarbeiter gleich: bestehende Zeiten
    // durch die neuen Werte ersetzen, nicht nur fuer kuenftige neue Mitarbeiter.
    const { data: allEmployees } = await supabase.from("employees").select("id");
    if (allEmployees && allEmployees.length > 0) {
      await supabase.from("working_hours").delete().lte("weekday", 6);

      const rows = allEmployees.flatMap((employee) => [
        ...[1, 2, 3, 4, 5].map((weekday) => ({
          employee_id: employee.id,
          weekday,
          start_time: settings.default_weekday_start,
          end_time: settings.default_weekday_end,
        })),
        {
          employee_id: employee.id,
          weekday: 6,
          start_time: settings.default_saturday_start,
          end_time: settings.default_saturday_end,
        },
      ]);

      await supabase.from("working_hours").insert(rows);
    }

    setSaving(false);
    setSaved(true);
  }

  if (checkingSession || !settings) {
    return null;
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <InternalNav />
      <h1 className="mb-6 text-2xl font-semibold">Einstellungen</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-3">
          <h2 className="font-medium">Online-Buchung</h2>

          <div>
            <label className="mb-1 block text-sm">
              Wie viele Wochen im Voraus dürfen Kunden buchen?
            </label>
            <input
              type="number"
              min={1}
              required
              value={settings.booking_horizon_weeks}
              onChange={(e) =>
                setSettings({ ...settings, booking_horizon_weeks: Number(e.target.value) })
              }
              className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm">
              Mindestvorlauf: Wie viele Stunden im Voraus muss mindestens gebucht werden?
            </label>
            <input
              type="number"
              min={0}
              required
              value={settings.min_lead_hours}
              onChange={(e) =>
                setSettings({ ...settings, min_lead_hours: Number(e.target.value) })
              }
              className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-medium">Arbeitszeiten (für alle Mitarbeiter)</h2>
          <p className="text-xs text-zinc-500">
            Gelten einheitlich für das gesamte Team. Beim Speichern werden die
            Arbeitszeiten aller Mitarbeiter auf diese Werte gesetzt.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm">Mo-Fr Start</label>
              <input
                type="time"
                required
                value={settings.default_weekday_start}
                onChange={(e) =>
                  setSettings({ ...settings, default_weekday_start: e.target.value })
                }
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Mo-Fr Ende</label>
              <input
                type="time"
                required
                value={settings.default_weekday_end}
                onChange={(e) =>
                  setSettings({ ...settings, default_weekday_end: e.target.value })
                }
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Sa Start</label>
              <input
                type="time"
                required
                value={settings.default_saturday_start}
                onChange={(e) =>
                  setSettings({ ...settings, default_saturday_start: e.target.value })
                }
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Sa Ende</label>
              <input
                type="time"
                required
                value={settings.default_saturday_end}
                onChange={(e) =>
                  setSettings({ ...settings, default_saturday_end: e.target.value })
                }
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
              />
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">Gespeichert.</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded bg-black py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {saving ? "Speichern..." : "Speichern"}
        </button>
      </form>
    </main>
  );
}
