"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Props = {
  /**
   * Wird vor dem Verlassen der Seite aufgerufen (Navigation oder Logout).
   * Rueckgabewert false bricht das Verlassen ab.
   */
  beforeLeave?: () => boolean | Promise<boolean>;
};

export function InternalNav({ beforeLeave }: Props) {
  const router = useRouter();

  async function guarded(action: () => void | Promise<void>) {
    if (beforeLeave) {
      const proceed = await beforeLeave();
      if (!proceed) return;
    }
    await action();
  }

  function goTo(path: string) {
    guarded(() => router.push(path));
  }

  function handleLogout() {
    guarded(async () => {
      await supabase.auth.signOut();
      router.replace("/login");
    });
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
        <button onClick={() => goTo("/leistungen")} className="bg-transparent p-0">
          Leistungen
        </button>
      </div>
      <button onClick={handleLogout} className="bg-transparent p-0 text-sm underline">
        Ausloggen
      </button>
    </nav>
  );
}
