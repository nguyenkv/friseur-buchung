"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function InternalNav() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <nav className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-black/10 pb-4 dark:border-white/20">
      <div className="flex gap-4 text-sm font-medium">
        <Link href="/kalender">Kalender</Link>
        <Link href="/mitarbeiter">Mitarbeiter</Link>
      </div>
      <button onClick={handleLogout} className="text-sm underline">
        Ausloggen
      </button>
    </nav>
  );
}
