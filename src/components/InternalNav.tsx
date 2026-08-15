"use client";

import Image from "next/image";
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
    <nav className="mb-8 grid grid-cols-2 items-center gap-x-4 gap-y-2 border-b border-black/10 pb-4 sm:grid-cols-[1fr_auto_1fr] dark:border-white/20">
      <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
        <button onClick={() => goTo("/kalender")} className="bg-transparent p-0">
          Kalender
        </button>
        <button onClick={() => goTo("/mitarbeiter")} className="bg-transparent p-0">
          Mitarbeiter
        </button>
        <button onClick={() => goTo("/leistungen")} className="bg-transparent p-0">
          Leistungen
        </button>
        <button
          onClick={() => goTo("/einstellungen")}
          aria-label="Einstellungen"
          title="Einstellungen"
          className="bg-transparent p-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      <Image
        src="/images/logo-hirsch-black.png"
        alt="Barber Hirsch"
        width={630}
        height={547}
        className="hidden h-12 w-auto justify-self-center dark:invert sm:block"
      />

      <button
        onClick={handleLogout}
        className="justify-self-end bg-transparent p-0 text-sm underline"
      >
        Ausloggen
      </button>
    </nav>
  );
}
