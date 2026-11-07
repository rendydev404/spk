"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";

export function PasswordSementara({ password, onSelesai }: { password: string; onSelesai: () => void }) {
  const [disalin, setDisalin] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="warning" title="Catat password ini sekarang">
        Password hanya ditampilkan sekali. Berikan langsung ke pemilik akun; ia wajib menggantinya saat
        pertama masuk.
      </Alert>
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2 px-4 py-3">
        <code className="text-lg font-semibold tracking-wider">{password}</code>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(password);
            setDisalin(true);
          }}
        >
          {disalin ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {disalin ? "Disalin" : "Salin"}
        </Button>
      </div>
      <div className="flex justify-end">
        <Button onClick={onSelesai}>Selesai</Button>
      </div>
    </div>
  );
}
