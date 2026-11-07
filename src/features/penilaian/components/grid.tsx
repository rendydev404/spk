"use client";

import * as RS from "@radix-ui/react-select";
import { Check, ChevronDown, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/ui/misc";
import { useAksi } from "@/components/ui/use-aksi";
import { parseAngka } from "@/lib/format";
import { cariRentang, type SubKriteriaKonversi } from "@/lib/konversi";
import { simpanPenilaian } from "../actions";

export type KriteriaGrid = {
  id: string;
  kode: string;
  nama: string;
  jenis: "BENEFIT" | "COST";
  tipeInput: "ANGKA" | "RENTANG" | "PILIHAN";
  nilaiMin: number | null;
  nilaiMax: number | null;
  sub: SubKriteriaKonversi[];
};
export type BarisGrid = { siswaId: string; kode: string; nis: string; nama: string };
type Sel = { mentah: string; sub: string | null };
type NilaiAwal = Record<string, Sel>;

const k = (s: string, kr: string) => `${s}:${kr}`;
const KOSONG = "__kosong";

function cekSel(kr: KriteriaGrid, v: Sel): { isi: boolean; galat: string | null; skala: number | null } {
  if (kr.tipeInput === "PILIHAN") {
    const s = kr.sub.find((x) => x.id === v.sub);
    return { isi: !!s, galat: null, skala: s?.nilai ?? null };
  }
  if (v.mentah.trim() === "") return { isi: false, galat: null, skala: null };
  const n = parseAngka(v.mentah);
  if (n === null) return { isi: true, galat: "Bukan angka", skala: null };
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-9)
    return { isi: true, galat: "Maks. 2 desimal", skala: null };
  if (kr.nilaiMin !== null && n < kr.nilaiMin)
    return { isi: true, galat: `Min. ${kr.nilaiMin}`, skala: null };
  if (kr.nilaiMax !== null && n > kr.nilaiMax)
    return { isi: true, galat: `Maks. ${kr.nilaiMax}`, skala: null };
  if (kr.tipeInput === "RENTANG") {
    const s = cariRentang(kr.sub, n);
    return s
      ? { isi: true, galat: null, skala: s.nilai }
      : { isi: true, galat: "Di luar rentang", skala: null };
  }
  return { isi: true, galat: null, skala: n };
}

const sama = (a: Sel | undefined, b: Sel) => (a?.mentah ?? "") === b.mentah && (a?.sub ?? null) === b.sub;

const PilihanSel = memo(function PilihanSel({
  kr,
  value,
  onChange,
  disabled,
  r,
  c,
  label,
  berubah,
}: {
  kr: KriteriaGrid;
  value: string | null;
  onChange: (v: string | null) => void;
  disabled: boolean;
  r: number;
  c: number;
  label: string;
  berubah: boolean;
}) {
  return (
    <RS.Root
      value={value ?? KOSONG}
      onValueChange={(v) => onChange(v === KOSONG ? null : v)}
      disabled={disabled}
    >
      <RS.Trigger
        data-r={r}
        data-c={c}
        aria-label={label}
        className={cn(
          "inline-flex h-8 w-full min-w-36 items-center justify-between gap-1 rounded-sm border bg-surface px-2 text-left text-[13px] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-70",
          berubah ? "border-info bg-info-soft/40" : "border-border-strong",
          !value && "text-muted",
        )}
      >
        <span className="truncate">
          <RS.Value />
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted" aria-hidden />
      </RS.Trigger>
      <RS.Portal>
        <RS.Content
          position="popper"
          sideOffset={4}
          className="z-50 min-w-[var(--radix-select-trigger-width)] rounded-md border border-border bg-surface p-1 shadow-pop"
        >
          <RS.Viewport>
            {[{ id: KOSONG, label: "Belum diisi", nilai: 0 }, ...kr.sub].map((s) => (
              <RS.Item
                key={s.id}
                value={s.id}
                className="relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-7 pr-3 text-[13px] outline-none data-[highlighted]:bg-surface-2"
              >
                <RS.ItemIndicator className="absolute left-2">
                  <Check className="size-3.5 text-accent" aria-hidden />
                </RS.ItemIndicator>
                <RS.ItemText>
                  {s.id === KOSONG ? <span className="text-muted">Belum diisi</span> : s.label}
                </RS.ItemText>
                {s.id !== KOSONG ? (
                  <span className="ml-auto pl-3 text-xs text-muted tabular">{s.nilai}</span>
                ) : null}
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
});

const Baris = memo(function Baris({
  b,
  r,
  kriteria,
  awal,
  bisaUbah,
  lapor,
}: {
  b: BarisGrid;
  r: number;
  kriteria: KriteriaGrid[];
  awal: NilaiAwal;
  bisaUbah: boolean;
  lapor: (key: string, v: Sel, berubah: boolean) => void;
}) {
  // State per baris: mengubah satu sel hanya me-render ulang baris ini.
  const [nilai, setNilai] = useState<Record<string, Sel>>(() =>
    Object.fromEntries(kriteria.map((kr) => [kr.id, awal[k(b.siswaId, kr.id)] ?? { mentah: "", sub: null }])),
  );
  const ubah = (krId: string, v: Sel) => {
    setNilai((s) => ({ ...s, [krId]: v }));
    lapor(k(b.siswaId, krId), v, !sama(awal[k(b.siswaId, krId)], v));
  };
  const cek = kriteria.map((kr) => cekSel(kr, nilai[kr.id] as Sel));
  const terisi = cek.filter((x) => x.isi && !x.galat).length;

  return (
    <tr>
      <td className="sticky left-0 z-[1] bg-surface">
        <div className="flex items-center gap-2">
          <Badge tone="accent" className="shrink-0">
            {b.kode}
          </Badge>
          <div className="min-w-0">
            <p className="truncate font-medium">{b.nama}</p>
            <p className="text-[11.5px] text-muted tabular">{b.nis}</p>
          </div>
        </div>
      </td>
      {kriteria.map((kr, c) => {
        const v = nilai[kr.id] as Sel;
        const h = cek[c]!;
        const berubah = !sama(awal[k(b.siswaId, kr.id)], v);
        const label = `${kr.kode} ${b.nama}`;
        return (
          <td key={kr.id} className="align-top">
            {kr.tipeInput === "PILIHAN" ? (
              <PilihanSel
                kr={kr}
                value={v.sub}
                onChange={(s) => ubah(kr.id, { mentah: "", sub: s })}
                disabled={!bisaUbah}
                r={r}
                c={c}
                label={label}
                berubah={berubah}
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  data-r={r}
                  data-c={c}
                  aria-label={label}
                  aria-invalid={h.galat ? true : undefined}
                  title={h.galat ?? undefined}
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={!bisaUbah}
                  value={v.mentah}
                  onChange={(e) => ubah(kr.id, { mentah: e.target.value, sub: null })}
                  className={cn(
                    "h-8 w-20 rounded-sm border bg-surface px-2 text-right text-[13px] tabular focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-70",
                    h.galat
                      ? "border-danger bg-danger-soft/40"
                      : berubah
                        ? "border-info bg-info-soft/40"
                        : "border-border-strong",
                  )}
                />
                {kr.tipeInput === "RENTANG" ? (
                  <span className="w-8 text-xs text-muted tabular" title="Skala hasil konversi">
                    {h.skala !== null ? `→ ${h.skala}` : ""}
                  </span>
                ) : null}
              </div>
            )}
            {h.galat ? <p className="mt-0.5 text-[11px] text-danger">{h.galat}</p> : null}
          </td>
        );
      })}
      <td className="num">
        {terisi === kriteria.length ? (
          <Badge tone="success">Lengkap</Badge>
        ) : (
          <span className="text-xs text-muted tabular">
            {terisi}/{kriteria.length}
          </span>
        )}
      </td>
    </tr>
  );
});

export function GridPenilaian({
  kelasId,
  kriteria,
  baris,
  awal,
  bisaUbah,
}: {
  kelasId: string;
  kriteria: KriteriaGrid[];
  baris: BarisGrid[];
  awal: NilaiAwal;
  bisaUbah: boolean;
}) {
  const router = useRouter();
  const { jalan, pending } = useAksi();
  const draf = useRef(new Map<string, Sel>());
  const [jumlahUbah, setJumlahUbah] = useState(0);
  const [tersimpan, setTersimpan] = useState<string | null>(null);
  const petaK = useRef(new Map(kriteria.map((x) => [x.id, x])));

  const lapor = useCallback((key: string, v: Sel, berubah: boolean) => {
    if (berubah) draf.current.set(key, v);
    else draf.current.delete(key);
    setJumlahUbah(draf.current.size);
  }, []);

  useEffect(() => {
    if (jumlahUbah === 0) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [jumlahUbah]);

  const simpan = useCallback(() => {
    if (draf.current.size === 0) return;
    const entri = [...draf.current.entries()].map(([key, v]) => {
      const [siswaId, kriteriaId] = key.split(":") as [string, string];
      const kr = petaK.current.get(kriteriaId)!;
      const kosong = kr.tipeInput === "PILIHAN" ? v.sub === null : v.mentah.trim() === "";
      return {
        siswaId,
        kriteriaId,
        mentah: kosong || kr.tipeInput === "PILIHAN" ? null : parseAngka(v.mentah),
        subKriteriaId: v.sub,
        hapus: kosong,
      };
    });
    jalan(() => simpanPenilaian(kelasId, entri), {
      onOk: () => {
        draf.current.clear();
        setJumlahUbah(0);
        setTersimpan(
          new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
        );
        router.refresh();
      },
    });
  }, [jalan, kelasId, router]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (bisaUbah) simpan();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [simpan, bisaUbah]);

  // Enter/panah bawah ke baris berikutnya, panah atas ke baris sebelumnya (kolom sama).
  function navigasi(e: React.KeyboardEvent<HTMLTableElement>) {
    const t = e.target as HTMLElement;
    if (t.tagName !== "INPUT" || !t.dataset.r) return;
    const r = Number(t.dataset.r);
    const c = t.dataset.c;
    let tujuan: number | null = null;
    if (e.key === "Enter" || e.key === "ArrowDown") tujuan = r + 1;
    else if (e.key === "ArrowUp") tujuan = r - 1;
    if (tujuan === null) return;
    const el = document.querySelector<HTMLElement>(`[data-r="${tujuan}"][data-c="${c}"]`);
    if (el) {
      e.preventDefault();
      el.focus();
      if (el instanceof HTMLInputElement) el.select();
    }
  }

  return (
    <div className="panel">
      {bisaUbah ? (
        <div className="sticky top-12 z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-md border-b border-border bg-surface px-4 py-2.5 lg:top-0">
          <p className="text-[13px] text-muted" aria-live="polite">
            {pending
              ? "Menyimpan..."
              : jumlahUbah > 0
                ? `${jumlahUbah} sel berubah, belum disimpan`
                : tersimpan
                  ? `Tersimpan pukul ${tersimpan}`
                  : "Belum ada perubahan"}
          </p>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted md:inline">
              <span className="kbd">Enter</span> baris berikutnya · <span className="kbd">Ctrl</span>+
              <span className="kbd">S</span> simpan
            </span>
            <Button size="sm" onClick={simpan} loading={pending} disabled={jumlahUbah === 0}>
              <Save className="size-4" aria-hidden /> Simpan
            </Button>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="tabel" onKeyDown={navigasi}>
          <caption className="sr-only">Grid penilaian: baris siswa, kolom kriteria</caption>
          <thead>
            <tr>
              <th className="sticky left-0 z-[2] min-w-56">Alternatif</th>
              {kriteria.map((kr) => (
                <th key={kr.id} title={kr.nama} className="min-w-28">
                  <span className="text-fg">{kr.kode}</span>{" "}
                  <span className="font-normal">
                    {kr.nama.length > 22 ? `${kr.nama.slice(0, 22)}...` : kr.nama}
                    {kr.tipeInput !== "PILIHAN" && kr.nilaiMax !== null
                      ? ` (${kr.nilaiMin}-${kr.nilaiMax})`
                      : ""}
                  </span>
                </th>
              ))}
              <th className="num">Status</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b, r) => (
              <Baris
                key={b.siswaId}
                b={b}
                r={r}
                kriteria={kriteria}
                awal={awal}
                bisaUbah={bisaUbah}
                lapor={lapor}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
