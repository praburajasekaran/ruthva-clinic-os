"use client";

import { useApi } from "@/hooks/useApi";

export function TherapyOptions({ id }: { id: string }) {
  const { data } = useApi<{ results: { name: string }[] }>("/therapies/");

  return (
    <datalist id={id}>
      {data?.results.map((therapy) => (
        <option key={therapy.name} value={therapy.name} />
      ))}
    </datalist>
  );
}
