"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export type WindowKey = "7d" | "30d" | "90d" | "ytd";

const WINDOW_OPTIONS: Array<{ value: WindowKey; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
];

type ClientLite = { id: string; name: string };

export function ValueReportFilters({
  windowKey,
  clientId,
  clients,
}: {
  windowKey: WindowKey;
  clientId: string | null;
  clients: ClientLite[];
}) {
  const router = useRouter();

  function update(next: { windowKey?: WindowKey; clientId?: string | null }) {
    const w = next.windowKey ?? windowKey;
    const c = next.clientId === undefined ? clientId : next.clientId;
    const params = new URLSearchParams();
    params.set("window", w);
    if (c) params.set("clientId", c);
    router.push(`/agency/value?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-[10px]">
      <div className="min-w-[180px]">
        <Select
          value={windowKey}
          onValueChange={(v) => update({ windowKey: v as WindowKey })}
        >
          <SelectTrigger className="h-[36px] text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOW_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-[200px]">
        <Select
          value={clientId ?? ALL}
          onValueChange={(v) =>
            update({ clientId: v === ALL ? null : v })
          }
        >
          <SelectTrigger className="h-[36px] text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
