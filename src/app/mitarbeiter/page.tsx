"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { InternalNav } from "@/components/InternalNav";

type Employee = {
  id: string;
  name: string;
  title: string | null;
};

export default function MitarbeiterPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [addedEmployeeIds, setAddedEmployeeIds] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formTitle, setFormTitle] = useState("");
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
    const { data } = await supabase
      .from("employees")
      .select("id, name, title")
      .order("name");
    setEmployees(data ?? []);
  }

  function openForm() {
    setFormName("");
    setFormTitle("");
    setFormError(null);
    setFormOpen(true);
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;

    setSaving(true);
    setFormError(null);

    const { data: newEmployee, error } = await supabase
      .from("employees")
      .insert({ name: formName.trim(), title: formTitle.trim() || null })
      .select("id")
      .single();

    if (error || !newEmployee) {
      setSaving(false);
      setFormError("Speichern fehlgeschlagen: " + error?.message);
      return;
    }

    // Standard-Arbeitszeiten anlegen: Mo-Fr 9-19, Sa 9-18:30 (wie beim restlichen Team)
    const weekdayRows = [1, 2, 3, 4, 5].map((weekday) => ({
      employee_id: newEmployee.id,
      weekday,
      start_time: "09:00",
      end_time: "19:00",
    }));
    weekdayRows.push({
      employee_id: newEmployee.id,
      weekday: 6,
      start_time: "09:00",
      end_time: "18:30",
    });
    await supabase.from("working_hours").insert(weekdayRows);

    setAddedEmployeeIds((prev) => [...prev, newEmployee.id]);
    setSaving(false);
    setFormOpen(false);
    loadEmployees();
  }

  async function handleDelete(employee: Employee) {
    const confirmDelete = window.confirm(
      `"${employee.name}" wirklich löschen? Alle Arbeitszeiten und Kalendereinträge dieser Person werden ebenfalls gelöscht.`
    );
    if (!confirmDelete) return;

    await supabase.from("employees").delete().eq("id", employee.id);
    setAddedEmployeeIds((prev) => prev.filter((id) => id !== employee.id));
    loadEmployees();
  }

  function startEditing() {
    setAddedEmployeeIds([]);
    setEditMode(true);
  }

  function finishEditing() {
    setAddedEmployeeIds([]);
    setEditMode(false);
  }

  async function handleBeforeLeave() {
    if (!editMode) return true;

    const message =
      addedEmployeeIds.length > 0
        ? "Du bist noch im Bearbeitungsmodus beim Team. Neu hinzugefügte, noch nicht gespeicherte Mitarbeiter werden verworfen. Wirklich verlassen?"
        : "Du bist noch im Bearbeitungsmodus beim Team. Wirklich verlassen?";
    const proceed = window.confirm(message);
    if (!proceed) return false;

    if (addedEmployeeIds.length > 0) {
      await supabase.from("employees").delete().in("id", addedEmployeeIds);
    }
    setAddedEmployeeIds([]);
    setEditMode(false);
    return true;
  }

  if (checkingSession) {
    return null;
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <InternalNav beforeLeave={handleBeforeLeave} />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Team</h1>
        {editMode ? (
          <button
            onClick={finishEditing}
            className="rounded-full border border-black/20 px-4 py-1.5 text-sm dark:border-white/20"
          >
            Speichern
          </button>
        ) : (
          <button
            onClick={startEditing}
            className="rounded-full border border-black/20 px-4 py-1.5 text-sm dark:border-white/20"
          >
            Bearbeiten
          </button>
        )}
      </div>

      {editMode && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={openForm}
            className="rounded-full bg-black px-4 py-1.5 text-sm text-white dark:bg-white dark:text-black"
          >
            Mitarbeiter hinzufügen
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {employees.map((employee) => (
          <li
            key={employee.id}
            className="flex items-center justify-between rounded border border-black/10 p-3 dark:border-white/20"
          >
            <div>
              <div className="font-medium">{employee.name}</div>
              {employee.title && (
                <div className="text-sm text-zinc-500">{employee.title}</div>
              )}
            </div>
            {editMode && (
              <button
                onClick={() => handleDelete(employee)}
                className="text-sm text-red-600 underline"
              >
                Löschen
              </button>
            )}
          </li>
        ))}
      </ul>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleFormSubmit}
            className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 dark:bg-zinc-900"
          >
            <h2 className="text-lg font-semibold">Neuer Mitarbeiter</h2>

            <div>
              <label className="mb-1 block text-sm">Name</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm">Titel / Rolle (optional)</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="z. B. Senior Barber"
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
              />
            </div>

            <p className="text-xs text-zinc-500">
              Standard-Arbeitszeiten (Mo-Fr 9-19, Sa 9-18:30) werden automatisch
              angelegt. Änderbar machen wir bei Bedarf später.
            </p>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
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
