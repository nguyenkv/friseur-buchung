"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import deLocale from "@fullcalendar/core/locales/de";
import type { DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { supabase } from "@/lib/supabase";
import { InternalNav } from "@/components/InternalNav";

type Employee = {
  id: string;
  name: string;
};

type Category = "kundentermin" | "urlaub" | "krankheit" | "sonstiges";

type CalendarEntry = {
  id: string;
  employee_id: string;
  category: Category;
  title: string | null;
  start_time: string;
  end_time: string;
};

type BookingService = { name: string; price: number; duration_minutes: number };

type Booking = {
  customer_email: string;
  customer_phone: string;
  services: BookingService[];
  total_price: number;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price);
}

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: "kundentermin", label: "Kundentermin", color: "#2563eb" },
  { value: "urlaub", label: "Urlaub", color: "#f59e0b" },
  { value: "krankheit", label: "Krankheit", color: "#dc2626" },
  { value: "sonstiges", label: "Sonstiges / Pause", color: "#6b7280" },
];

function categoryLabel(value: Category) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function categoryColor(value: Category) {
  return CATEGORIES.find((c) => c.value === value)?.color ?? "#6b7280";
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateFmt = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeFmt = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${dateFmt.format(start)}, ${timeFmt.format(start)} – ${timeFmt.format(end)} Uhr`;
}

export default function KalenderPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);

  const [viewEntry, setViewEntry] = useState<CalendarEntry | null>(null);
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<Category>("kundentermin");
  const [formTitle, setFormTitle] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setCheckingSession(false);
      loadEmployees();
    });
  }, [router]);

  async function loadEmployees() {
    const { data } = await supabase.from("employees").select("id, name").order("name");
    const list = data ?? [];
    setEmployees(list);
    if (list.length > 0) {
      setSelectedEmployeeId(list[0].id);
    }
  }

  useEffect(() => {
    if (selectedEmployeeId) {
      loadEntries(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  async function loadEntries(employeeId: string) {
    const { data } = await supabase
      .from("calendar_entries")
      .select("id, employee_id, category, title, start_time, end_time")
      .eq("employee_id", employeeId);
    setEntries(data ?? []);
  }

  const events = useMemo(
    () =>
      entries.map((entry) => ({
        id: entry.id,
        title: entry.title?.trim() ? entry.title : categoryLabel(entry.category),
        start: entry.start_time,
        end: entry.end_time,
        backgroundColor: categoryColor(entry.category),
        borderColor: categoryColor(entry.category),
      })),
    [entries]
  );

  function openBlankForm() {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const later = new Date(now.getTime() + 30 * 60 * 1000);
    setEditingEntryId(null);
    setFormCategory("kundentermin");
    setFormTitle("");
    setFormStart(toLocalInputValue(now));
    setFormEnd(toLocalInputValue(later));
    setFormError(null);
    setFormOpen(true);
  }

  function handleSelect(selectInfo: DateSelectArg) {
    setEditingEntryId(null);
    setFormCategory("kundentermin");
    setFormTitle("");
    setFormStart(toLocalInputValue(selectInfo.start));
    setFormEnd(toLocalInputValue(selectInfo.end));
    setFormError(null);
    setFormOpen(true);
  }

  async function handleEventClick(clickInfo: EventClickArg) {
    const entry = entries.find((e) => e.id === clickInfo.event.id);
    if (!entry) return;
    setViewEntry(entry);
    setViewBooking(null);

    if (entry.category === "kundentermin") {
      const { data } = await supabase
        .from("bookings")
        .select("customer_email, customer_phone, services, total_price")
        .eq("calendar_entry_id", entry.id)
        .maybeSingle();
      setViewBooking(data as Booking | null);
    }
  }

  function openEditForm(entry: CalendarEntry) {
    setEditingEntryId(entry.id);
    setFormCategory(entry.category);
    setFormTitle(entry.title ?? "");
    setFormStart(toLocalInputValue(new Date(entry.start_time)));
    setFormEnd(toLocalInputValue(new Date(entry.end_time)));
    setFormError(null);
    setViewEntry(null);
    setViewBooking(null);
    setFormOpen(true);
  }

  async function handleDeleteEntry(entry: CalendarEntry) {
    const confirmDelete = window.confirm(
      `"${entry.title?.trim() ? entry.title : categoryLabel(entry.category)}" wirklich löschen?`
    );
    if (!confirmDelete) return;

    await supabase.from("calendar_entries").delete().eq("id", entry.id);
    setViewEntry(null);
    setViewBooking(null);
    if (selectedEmployeeId) loadEntries(selectedEmployeeId);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    const start = new Date(formStart);
    const end = new Date(formEnd);
    if (end <= start) {
      setFormError("Das Ende muss nach dem Start liegen.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      employee_id: selectedEmployeeId,
      category: formCategory,
      title: formTitle.trim() || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    };

    const { error } = editingEntryId
      ? await supabase.from("calendar_entries").update(payload).eq("id", editingEntryId)
      : await supabase.from("calendar_entries").insert(payload);

    setSaving(false);

    if (error) {
      setFormError("Speichern fehlgeschlagen: " + error.message);
      return;
    }

    setFormOpen(false);
    setEditingEntryId(null);
    loadEntries(selectedEmployeeId);
  }

  if (checkingSession) {
    return null;
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <InternalNav />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {employees.map((employee) => (
            <button
              key={employee.id}
              onClick={() => setSelectedEmployeeId(employee.id)}
              className={`rounded-full px-2.5 py-1 text-xs sm:px-4 sm:py-1.5 sm:text-sm ${
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
          onClick={openBlankForm}
          className="rounded-full bg-black px-2.5 py-1 text-xs text-white sm:px-4 sm:py-1.5 sm:text-sm dark:bg-white dark:text-black"
        >
          + Eintrag
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-400">
        {CATEGORIES.map((c) => (
          <span key={c.value} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: c.color }}
            />
            {c.label}
          </span>
        ))}
      </div>

      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView={
          typeof window !== "undefined" && window.innerWidth < 640
            ? "timeGridDay"
            : "timeGridWeek"
        }
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek,timeGridDay",
        }}
        locale={deLocale}
        firstDay={1}
        hiddenDays={[0]}
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        height="auto"
        selectable
        select={handleSelect}
        events={events}
        eventClick={handleEventClick}
      />

      {viewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: categoryColor(viewEntry.category) }}
              />
              <h2 className="text-lg font-semibold">
                {categoryLabel(viewEntry.category)}
              </h2>
            </div>

            {viewEntry.title?.trim() && (
              <p className="text-sm">{viewEntry.title}</p>
            )}

            <p className="text-sm text-zinc-500">
              {formatRange(viewEntry.start_time, viewEntry.end_time)}
            </p>

            {viewBooking && (
              <div className="space-y-1 rounded border border-black/10 p-3 text-sm dark:border-white/20">
                <p>{viewBooking.customer_email}</p>
                <p>{viewBooking.customer_phone}</p>
                <ul className="mt-2 text-zinc-500">
                  {viewBooking.services.map((s, i) => (
                    <li key={i}>
                      {s.name} · {formatPrice(s.price)} · {s.duration_minutes} Min.
                    </li>
                  ))}
                </ul>
                <p className="pt-1 font-medium">
                  Gesamt: {formatPrice(viewBooking.total_price)}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => openEditForm(viewEntry)}
                className="flex-1 rounded bg-black py-2 text-sm text-white dark:bg-white dark:text-black"
              >
                Bearbeiten
              </button>
              <button
                onClick={() => handleDeleteEntry(viewEntry)}
                className="flex-1 rounded border border-red-600 py-2 text-sm text-red-600"
              >
                Löschen
              </button>
              <button
                onClick={() => {
                  setViewEntry(null);
                  setViewBooking(null);
                }}
                className="flex-1 rounded border border-black/20 py-2 text-sm dark:border-white/20"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleFormSubmit}
            className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 dark:bg-zinc-900"
          >
            <h2 className="text-lg font-semibold">
              {editingEntryId ? "Eintrag bearbeiten" : "Neuer Eintrag"}
            </h2>

            <div>
              <label className="mb-1 block text-sm">Kategorie</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as Category)}
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm">
                {formCategory === "kundentermin" ? "Kundenname" : "Notiz (optional)"}
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm">Start</label>
              <input
                type="datetime-local"
                required
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm">Ende</label>
              <input
                type="datetime-local"
                required
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
              />
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setEditingEntryId(null);
                }}
                className="flex-1 rounded border border-black/20 py-2 dark:border-white/20"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded bg-black py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {saving ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
