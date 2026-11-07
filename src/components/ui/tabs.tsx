"use client";

import * as RT from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

export function Tabs({
  items,
  defaultValue,
}: {
  items: { value: string; label: string; content: ReactNode }[];
  defaultValue?: string;
}) {
  return (
    <RT.Root defaultValue={defaultValue ?? items[0]?.value}>
      <RT.List className="flex gap-1 overflow-x-auto border-b border-border" aria-label="Langkah perhitungan">
        {items.map((i) => (
          <RT.Trigger
            key={i.value}
            value={i.value}
            className="-mb-px whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:text-fg data-[state=active]:border-accent data-[state=active]:text-fg"
          >
            {i.label}
          </RT.Trigger>
        ))}
      </RT.List>
      {items.map((i) => (
        <RT.Content key={i.value} value={i.value} className="pt-4 focus:outline-none">
          {i.content}
        </RT.Content>
      ))}
    </RT.Root>
  );
}
