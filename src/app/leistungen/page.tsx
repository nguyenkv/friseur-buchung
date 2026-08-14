"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { InternalNav } from "@/components/InternalNav";

type Service = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price);
}

export default function LeistungenPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [addedServiceIds, setAddedServiceIds] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setCheckingSession(false);
      loadServices();
    });
  }, [router]);

  async function loadServices() {
    const { data } = await supabase
      .from("services")
      .select("id, name, price, duration_minutes")
      .order("name");
    setServices(data ?? []);
  }

  function openCreateForm() {
    setEditingServiceId(null);
    setFormName("");
    setFormPrice("");
    setFormDuration("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(service: Service) {
    setEditingServiceId(service.id);
    setFormName(service.name);
    setFormPrice(String(service.price));
    setFormDuration(String(service.duration_minutes));
    setFormError(null);
    setFormOpen(true);
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();

    const price = Number(formPrice.replace(",", "."));
    const duration = Number(formDuration);

    if (!formName.trim() || Number.isNaN(price) || price < 0 || !Number.isInteger(duration) || duration <= 0) {
      setFormError("Bitte Name, einen gültigen Preis und eine Dauer in Minuten angeben.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = { name: formName.trim(), price, duration_minutes: duration };

    if (editingServiceId) {
      const { error } = await supabase.from("services").update(payload).eq("id", editingServiceId);
      setSaving(false);
      if (error) {
        setFormError("Speichern fehlgeschlagen: " + error.message);
        return;
      }
    } else {
      const { data: newService, error } = await supabase
        .from("services")
        .insert(payload)
        .select("id")
        .single();
      setSaving(false);
      if (error || !newService) {
        setFormError("Speichern fehlgeschlagen: " + error?.message);
        return;
      }
      setAddedServiceIds((prev) => [...prev, newService.id]);
    }

    setFormOpen(false);
    setEditingServiceId(null);
    loadServices();
  }

  async function handleDelete(service: Service) {
    const confirmDelete = window.confirm(`"${service.name}" wirklich löschen?`);
    if (!confirmDelete) return;

    await supabase.from("services").delete().eq("id", service.id);
    setAddedServiceIds((prev) => prev.filter((id) => id !== service.id));
    loadServices();
  }

  function startEditing() {
    setAddedServiceIds([]);
    setEditMode(true);
  }

  function finishEditing() {
    setAddedServiceIds([]);
    setEditMode(false);
  }

  async function handleBeforeLeave() {
    if (!editMode) return true;

    const message =
      addedServiceIds.length > 0
        ? "Du bist noch im Bearbeitungsmodus bei den Leistungen. Neu hinzugefügte, noch nicht gespeicherte Leistungen werden verworfen. Wirklich verlassen?"
        : "Du bist noch im Bearbeitungsmodus bei den Leistungen. Wirklich verlassen?";
    const proceed = window.confirm(message);
    if (!proceed) return false;

    if (addedServiceIds.length > 0) {
      await supabase.from("services").delete().in("id", addedServiceIds);
    }
    setAddedServiceIds([]);
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
        <h1 className="text-2xl font-semibold">Leistungen</h1>
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
            onClick={openCreateForm}
            className="rounded-full bg-black px-4 py-1.5 text-sm text-white dark:bg-white dark:text-black"
          >
            Leistung hinzufügen
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {services.map((service) => (
          <li
            key={service.id}
            className="rounded border border-black/10 p-3 dark:border-white/20"
          >
            <div className="font-medium">{service.name}</div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-500">
                {formatPrice(service.price)} · {service.duration_minutes} Min.
              </div>
              {editMode && (
                <div className="flex gap-3">
                  <button
                    onClick={() => openEditForm(service)}
                    className="text-sm underline"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(service)}
                    className="text-sm text-red-600 underline"
                  >
                    Löschen
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleFormSubmit}
            className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 dark:bg-zinc-900"
          >
            <h2 className="text-lg font-semibold">
              {editingServiceId ? "Leistung bearbeiten" : "Neue Leistung"}
            </h2>

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
              <label className="mb-1 block text-sm">Preis (€)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="z. B. 25.00"
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm">Dauer (Minuten)</label>
              <input
                type="number"
                inputMode="numeric"
                required
                min={1}
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
                placeholder="z. B. 30"
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
              />
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setEditingServiceId(null);
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
