"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImporExcel } from "@/components/ui/impor-excel";
import { Alert } from "@/components/ui/misc";
import { type AkunBaru, imporPengguna } from "../actions";

function DaftarAkun({ akun, tutup }: { akun: AkunBaru[]; tutup: () => void }) {
  const [disalin, setDisalin] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="warning" title="Catat password sementara ini sekarang">
        Password hanya ditampilkan sekali. Setiap pengguna wajib menggantinya saat pertama masuk.
      </Alert>
      <div className="max-h-[45vh] overflow-auto rounded-md border border-border">
        <table className="tabel">
          <thead className="sticky top-0">
            <tr>
              <th>Nama</th>
              <th>Username</th>
              <th>Peran</th>
              <th>Password sementara</th>
            </tr>
          </thead>
          <tbody>
            {akun.map((a) => (
              <tr key={a.username}>
                <td>{a.nama}</td>
                <td>{a.username}</td>
                <td>{a.peran}</td>
                <td>
                  <code className="font-semibold">{a.password}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(
              [
                "Nama\tUsername\tPeran\tPassword",
                ...akun.map((a) => `${a.nama}\t${a.username}\t${a.peran}\t${a.password}`),
              ].join("\n"),
            );
            setDisalin(true);
          }}
        >
          {disalin ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {disalin ? "Disalin" : "Salin semua (tempel ke Excel)"}
        </Button>
        <Button onClick={tutup}>Selesai</Button>
      </div>
    </div>
  );
}

export function ImporPengguna() {
  return (
    <ImporExcel<AkunBaru[]>
      judul="Impor pengguna dari Excel"
      keterangan="Buat banyak akun sekaligus, misalnya seluruh wali kelas. Peran: Admin, Wali Kelas, atau Kepala Sekolah."
      templateHref="/api/ekspor/template/pengguna"
      action={imporPengguna}
      hasil={(akun, tutup) => <DaftarAkun akun={akun} tutup={tutup} />}
    />
  );
}
