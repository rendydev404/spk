"use client";

import * as RD from "@radix-ui/react-dropdown-menu";
import {
  BarChart3,
  CalendarRange,
  Calculator,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  School,
  Scale,
  Settings,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/misc";
import { Select } from "@/components/ui/select";
import { cn } from "@/components/ui/cn";
import { pilihPeriodeKerja } from "@/features/periode/kerja-actions";
import { authClient } from "@/lib/auth-client";
import { LABEL_ROLE, LABEL_STATUS, type StatusPeriode } from "@/lib/status";
import type { Role } from "@/lib/rbac";
import { type IkonNav, menu } from "./nav";

const IKON: Record<IkonNav, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  siswa: Users,
  kelas: School,
  periode: CalendarRange,
  kriteria: ListChecks,
  bobot: Scale,
  alternatif: UsersRound,
  penilaian: ClipboardList,
  perhitungan: Calculator,
  hasil: BarChart3,
  validasi: ShieldCheck,
  laporan: FileText,
  audit: History,
  pengguna: UserCog,
  pengaturan: Settings,
};

const TONE_STATUS: Record<StatusPeriode, "netral" | "info" | "warning" | "accent" | "success"> = {
  DRAFT: "netral",
  PENILAIAN: "info",
  PERHITUNGAN: "warning",
  VALIDASI: "accent",
  FINAL: "success",
};

export function StatusBadge({ status }: { status: StatusPeriode }) {
  return <Badge tone={TONE_STATUS[status]}>{LABEL_STATUS[status]}</Badge>;
}

interface Props {
  pengguna: { name: string; username: string; role: Role };
  periode: { id: string; nama: string; status: StatusPeriode }[];
  periodeKerja: { id: string; nama: string; status: StatusPeriode } | null;
  namaSekolah: string;
}

function Isi({ pengguna, periode, periodeKerja, namaSekolah, onNavigate }: Props & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const grup = menu(periodeKerja?.id ?? null)
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(pengguna.role)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-accent-fg">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold leading-tight">SPK Siswa Berprestasi</p>
          <p className="truncate text-[11.5px] text-muted">{namaSekolah}</p>
        </div>
      </div>

      <div className="mx-3 mb-2 rounded-md border border-border bg-surface-2/60 p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Periode kerja</span>
          {periodeKerja ? <StatusBadge status={periodeKerja.status} /> : null}
        </div>
        {periode.length > 0 ? (
          <Select
            size="sm"
            aria-label="Pilih periode kerja"
            value={periodeKerja?.id ?? ""}
            disabled={pending}
            onValueChange={(v) => start(() => pilihPeriodeKerja(v))}
            options={periode.map((p) => ({ value: p.id, label: p.nama, keterangan: LABEL_STATUS[p.status] }))}
          />
        ) : (
          <p className="text-xs text-muted">Belum ada periode</p>
        )}
      </div>

      <nav aria-label="Menu utama" className="flex-1 overflow-y-auto px-2 pb-4">
        {grup.map((g) => (
          <div key={g.judul || "utama"} className="mt-3 first:mt-1">
            {g.judul ? (
              <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted">{g.judul}</p>
            ) : null}
            <ul>
              {g.items.map((i) => {
                const Ikon = IKON[i.ikon];
                const aktif = pathname === i.href || pathname.startsWith(`${i.href}/`);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={onNavigate}
                      aria-current={aktif ? "page" : undefined}
                      className={cn(
                        "flex h-8 items-center gap-2.5 rounded-sm px-2.5 text-[13.5px] transition-colors",
                        aktif ? "bg-accent-soft font-medium text-accent" : "text-fg/85 hover:bg-surface-2",
                      )}
                    >
                      <Ikon className="size-4 shrink-0" aria-hidden />
                      {i.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <MenuAkun pengguna={pengguna} />
    </div>
  );
}

function MenuAkun({ pengguna }: { pengguna: Props["pengguna"] }) {
  const router = useRouter();
  return (
    <RD.Root>
      <RD.Trigger className="m-2 flex items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-surface-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-[12px] font-semibold text-muted">
          {pengguna.name
            .split(" ")
            .slice(0, 2)
            .map((s) => s[0])
            .join("")
            .toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium">{pengguna.name}</span>
          <span className="block truncate text-[11.5px] text-muted">{LABEL_ROLE[pengguna.role]}</span>
        </span>
      </RD.Trigger>
      <RD.Portal>
        <RD.Content
          side="top"
          align="start"
          sideOffset={4}
          className="z-50 min-w-52 rounded-md border border-border bg-surface p-1 shadow-pop"
        >
          <RD.Item asChild>
            <Link href="/akun" className="flex h-8 items-center gap-2 rounded-sm px-2 text-[13px] outline-none data-[highlighted]:bg-surface-2">
              <UserRound className="size-4 text-muted" aria-hidden /> Akun saya
            </Link>
          </RD.Item>
          <RD.Separator className="my-1 h-px bg-border" />
          <RD.Item
            onSelect={async () => {
              await authClient.signOut();
              router.replace("/login");
              router.refresh();
            }}
            className="flex h-8 cursor-default items-center gap-2 rounded-sm px-2 text-[13px] text-danger outline-none data-[highlighted]:bg-danger-soft"
          >
            <LogOut className="size-4" aria-hidden /> Keluar
          </RD.Item>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

export function Sidebar(props: Props) {
  const [buka, setBuka] = useState(false);
  const pathname = usePathname();
  useEffect(() => setBuka(false), [pathname]);
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-border bg-surface lg:block print:hidden">
        <Isi {...props} />
      </aside>
      <div className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-surface px-3 lg:hidden print:hidden">
        <button
          type="button"
          onClick={() => setBuka(true)}
          className="grid size-8 place-items-center rounded-sm hover:bg-surface-2"
          aria-label="Buka menu"
          aria-expanded={buka}
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <span className="text-[13.5px] font-semibold">SPK Siswa Berprestasi</span>
      </div>
      {buka ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Tutup menu"
            onClick={() => setBuka(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-[fade_150ms_ease-out] bg-surface shadow-pop">
            <button
              type="button"
              onClick={() => setBuka(false)}
              className="absolute right-2 top-3 grid size-8 place-items-center rounded-sm text-muted hover:bg-surface-2"
              aria-label="Tutup menu"
            >
              <X className="size-4" aria-hidden />
            </button>
            <Isi {...props} onNavigate={() => setBuka(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

