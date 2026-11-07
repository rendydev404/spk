"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel">
      <EmptyState
        title="Halaman gagal dimuat"
        description="Terjadi kesalahan di server. Coba muat ulang. Jika masih terjadi, hubungi admin."
        action={<Button onClick={reset}>Coba lagi</Button>}
      />
    </div>
  );
}
