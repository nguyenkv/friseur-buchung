"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Employee = { id: string; name: string };
type Service = { id: string; name: string; price: number; duration_minutes: number };

const ANY_EMPLOYEE = "any";

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price);
}

function toIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayIso() {
  return toIsoDate(new Date());
}

function skipSunday(iso: string) {
  const date = new Date(iso + "T00:00:00");
  if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }
  return toIsoDate(date);
}

export default function BuchenPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(ANY_EMPLOYEE);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const [selectedDate, setSelectedDate] = useState(() => skipSunday(todayIso()));
  const [slots, setSlots] = useState<string[]>([]);
  const [slotEmployeeMap, setSlotEmployeeMap] = useState<Record<string, string>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [confirmedEmployeeName, setConfirmedEmployeeName] = useState("");

  const [maxDate, setMaxDate] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("employees").select("id, name").order("name").then(({ data }) => {
      setEmployees(data ?? []);
    });
    supabase
      .from("services")
      .select("id, name, price, duration_minutes")
      .order("name")
      .then(({ data }) => {
        setServices(data ?? []);
      });
    supabase
      .from("settings")
      .select("booking_horizon_weeks")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const max = new Date();
          max.setDate(max.getDate() + data.booking_horizon_weeks * 7);
          setMaxDate(toIsoDate(max));
        }
      });
  }, []);

  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function loadSlots() {
    setLoadingSlots(true);
    setSelectedSlot(null);

    if (selectedEmployeeId === ANY_EMPLOYEE) {
      const results = await Promise.all(
        employees.map((emp) =>
          supabase
            .rpc("get_available_slots", {
              p_employee_id: emp.id,
              p_date: selectedDate,
              p_duration_minutes: totalDuration,
            })
            .then((res) => ({ employeeId: emp.id, data: res.data ?? [] }))
        )
      );

      const map: Record<string, string> = {};
      for (const { employeeId, data } of results) {
        for (const row of data as { slot_start: string }[]) {
          if (!map[row.slot_start]) {
            map[row.slot_start] = employeeId;
          }
        }
      }
      setSlotEmployeeMap(map);
      setSlots(Object.keys(map).sort());
    } else {
      const { data } = await supabase.rpc("get_available_slots", {
        p_employee_id: selectedEmployeeId,
        p_date: selectedDate,
        p_duration_minutes: totalDuration,
      });
      const list = (data ?? []) as { slot_start: string }[];
      setSlots(list.map((row) => row.slot_start).sort());
      setSlotEmployeeMap({});
    }

    setLoadingSlots(false);
  }

  useEffect(() => {
    if (step === 3) {
      loadSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedDate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;

    setSubmitting(true);
    setSubmitError(null);

    const targetEmployeeId =
      selectedEmployeeId === ANY_EMPLOYEE ? slotEmployeeMap[selectedSlot] : selectedEmployeeId;

    if (!targetEmployeeId) {
      setSubmitting(false);
      setSubmitError("Leider ist dieser Termin nicht mehr verfügbar. Bitte wähle einen anderen.");
      return;
    }

    const startTime = new Date(selectedSlot);
    const endTime = new Date(startTime.getTime() + totalDuration * 60 * 1000);

    // ID wird hier erzeugt (statt sie nach dem Speichern zurückzulesen), weil Kunden
    // aus Datenschutzgruenden keine Kalendereintraege lesen duerfen - auch nicht ihren eigenen.
    const entryId = crypto.randomUUID();

    const { error: entryError } = await supabase.from("calendar_entries").insert({
      id: entryId,
      employee_id: targetEmployeeId,
      category: "kundentermin",
      title: customerName.trim(),
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    });

    if (entryError) {
      setSubmitting(false);
      setSubmitError(
        "Leider ist dieser Termin gerade nicht mehr verfügbar. Bitte wähle einen anderen Termin."
      );
      return;
    }

    const { error: bookingError } = await supabase.from("bookings").insert({
      calendar_entry_id: entryId,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      customer_phone: customerPhone.trim(),
      services: selectedServices.map((s) => ({
        name: s.name,
        price: s.price,
        duration_minutes: s.duration_minutes,
      })),
      total_price: totalPrice,
    });

    setSubmitting(false);

    if (bookingError) {
      setSubmitError("Etwas ist schiefgelaufen: " + bookingError.message);
      return;
    }

    setConfirmedEmployeeName(
      employees.find((e) => e.id === targetEmployeeId)?.name ?? ""
    );
    setStep(5);
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-8 text-2xl font-semibold">Termin buchen</h1>

      {step === 1 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Mitarbeiter wählen</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedEmployeeId(ANY_EMPLOYEE)}
              className={`rounded-full px-4 py-1.5 text-sm ${
                selectedEmployeeId === ANY_EMPLOYEE
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "border border-black/20 dark:border-white/20"
              }`}
            >
              Egal wer
            </button>
            {employees.map((employee) => (
              <button
                key={employee.id}
                onClick={() => setSelectedEmployeeId(employee.id)}
                className={`rounded-full px-4 py-1.5 text-sm ${
                  selectedEmployeeId === employee.id
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "border border-black/20 dark:border-white/20"
                }`}
              >
                {employee.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full rounded bg-black py-2 text-white dark:bg-white dark:text-black"
          >
            Weiter
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Leistung(en) wählen</h2>
          <ul className="space-y-2">
            {services.map((service) => (
              <li key={service.id}>
                <label className="flex items-center justify-between rounded border border-black/10 p-3 dark:border-white/20">
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(service.id)}
                      onChange={() => toggleService(service.id)}
                    />
                    <span>
                      <span className="block font-medium">{service.name}</span>
                      <span className="block text-sm text-zinc-500">
                        {formatPrice(service.price)} · {service.duration_minutes} Min.
                      </span>
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {selectedServices.length > 0 && (
            <p className="text-sm text-zinc-500">
              Gesamt: {totalDuration} Min. · {formatPrice(totalPrice)}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded border border-black/20 py-2 dark:border-white/20"
            >
              Zurück
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={selectedServices.length === 0}
              className="flex-1 rounded bg-black py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              Weiter
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Termin wählen</h2>

          <div>
            <label className="mb-1 block text-sm">Datum</label>
            <input
              type="date"
              min={todayIso()}
              max={maxDate ?? undefined}
              value={selectedDate}
              onChange={(e) => setSelectedDate(skipSunday(e.target.value))}
              className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
            />
            <p className="mt-1 text-xs text-zinc-500">Sonntags haben wir geschlossen.</p>
          </div>

          {loadingSlots && <p className="text-sm text-zinc-500">Lade freie Termine...</p>}

          {!loadingSlots && slots.length === 0 && (
            <p className="text-sm text-zinc-500">
              Keine freien Termine an diesem Tag. Bitte ein anderes Datum wählen.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => {
              const time = new Date(slot).toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-full px-4 py-1.5 text-sm ${
                    selectedSlot === slot
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "border border-black/20 dark:border-white/20"
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded border border-black/20 py-2 dark:border-white/20"
            >
              Zurück
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!selectedSlot}
              className="flex-1 rounded bg-black py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              Weiter
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-medium">Deine Daten</h2>

          <div>
            <label className="mb-1 block text-sm">Name</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm">E-Mail</label>
            <input
              type="email"
              required
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm">Telefonnummer</label>
            <input
              type="tel"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
            />
          </div>

          <p className="rounded border border-black/10 p-3 text-sm text-zinc-600 dark:border-white/20 dark:text-zinc-400">
            Zahlung erfolgt vor Ort (Barzahlung, EC-Karte, Kreditkarte möglich).
          </p>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              required
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mt-1"
            />
            <span>
              Ich habe die{" "}
              <Link href="/datenschutz" target="_blank" className="underline">
                Datenschutzerklärung
              </Link>{" "}
              zur Kenntnis genommen.
            </span>
          </label>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 rounded border border-black/20 py-2 dark:border-white/20"
            >
              Zurück
            </button>
            <button
              type="submit"
              disabled={submitting || !privacyAccepted}
              className="flex-1 rounded bg-black py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {submitting ? "Wird gebucht..." : "Termin buchen"}
            </button>
          </div>
        </form>
      )}

      {step === 5 && selectedSlot && (
        <section className="space-y-3 rounded border border-black/10 p-4 dark:border-white/20">
          <h2 className="text-lg font-medium">Termin bestätigt</h2>
          <p className="text-sm">
            {new Date(selectedSlot).toLocaleString("de-DE", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            Uhr bei {confirmedEmployeeName}
          </p>
          <ul className="text-sm text-zinc-600 dark:text-zinc-400">
            {selectedServices.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
          <p className="text-sm font-medium">Gesamt: {formatPrice(totalPrice)}</p>
          <p className="text-sm text-zinc-500">
            Zahlung erfolgt vor Ort (Barzahlung, EC-Karte, Kreditkarte möglich).
          </p>
          <p className="rounded border border-black/10 p-3 text-sm text-zinc-600 dark:border-white/20 dark:text-zinc-400">
            Du erhältst aktuell keine Bestätigungs-E-Mail – bitte mache einen
            Screenshot dieser Seite als Nachweis für deinen Termin.
          </p>
        </section>
      )}

      <footer className="mt-10 flex gap-4 text-xs text-zinc-500">
        <Link href="/impressum" className="underline">
          Impressum
        </Link>
        <Link href="/datenschutz" className="underline">
          Datenschutzerklärung
        </Link>
      </footer>
    </main>
  );
}
