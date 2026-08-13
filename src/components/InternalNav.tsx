"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Props = {
  confirmBeforeLeave?: boolean;
};

export function InternalNav({ confirmBeforeLeave = false }: Props) {
  const router = useRouter();

  function confirmLeave() {
    if (!confirmBeforeLeave) return true;
    return window.confirm(
      "Du bist noch im Bearbeitungsmodus beim Team. Wirklich verlassen?"
    );
  }

  function goTo(path: string) {
    if (!confirmLeave()) return;
    router.push(path);
  }

  async function handleLogout() {
    if (!confirmLeave()) return;
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <nav className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-black/10 pb-4 dark:border-white/20">
      <div className="flex gap-4 text-sm font-medium">
        <button onClick={() => goTo("/kalender")} className="bg-transparent p-0">
          Kalender
        </button>
        <button onClick={() => goTo("/mitarbeiter")} className="bg-transparent p-0">
          Mitarbeiter
        </button>
      </div>
      <button onClick={handleLogout} className="bg-transparent p-0 text-sm underline">
        Ausloggen
      </button>
    </nav>
  );
}
