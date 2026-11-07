import { CalendarRange } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export function TanpaPeriode() {
  return (
    <div className="panel">
      <EmptyState
        icon={<CalendarRange />}
        title="Belum ada periode"
        description="Buat periode penilaian terlebih dahulu."
        action={<ButtonLink href="/periode">Ke halaman periode</ButtonLink>}
      />
    </div>
  );
}
