"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  name: string;
  title: string | null;
};

export default function MitarbeiterPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);

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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (checkingSession) {
    return null;
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mitarbeiter</h1>
        <button onClick={handleLogout} className="text-sm underline">
          Ausloggen
        </button>
      </div>

      <ul className="space-y-2">
        {employees.map((employee) => (
          <li
            key={employee.id}
            className="rounded border border-black/10 p-3 dark:border-white/20"
          >
            <div className="font-medium">{employee.name}</div>
            {employee.title && (
              <div className="text-sm text-zinc-500">{employee.title}</div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
