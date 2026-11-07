import { Badge } from "@/components/ui/misc";

const MAP = {
  DRAFT: { tone: "netral", label: "Draf" },
  DIAJUKAN: { tone: "accent", label: "Diajukan" },
  DISETUJUI: { tone: "success", label: "Disetujui" },
  DITOLAK: { tone: "danger", label: "Ditolak" },
} as const;

export function StatusRun({ status }: { status: keyof typeof MAP }) {
  const m = MAP[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
