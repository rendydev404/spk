import type { Role } from "@/lib/rbac";

export type IkonNav =
  | "dashboard"
  | "siswa"
  | "kelas"
  | "periode"
  | "kriteria"
  | "bobot"
  | "alternatif"
  | "penilaian"
  | "perhitungan"
  | "hasil"
  | "validasi"
  | "laporan"
  | "audit"
  | "pengguna"
  | "pengaturan";

export interface ItemNav {
  href: string;
  label: string;
  ikon: IkonNav;
  roles: Role[];
}

const SEMUA: Role[] = ["ADMIN", "WALI_KELAS", "KEPSEK"];

/** Menu disusun mengikuti 10 modul sistem (PLAN bagian 8). */
export function menu(periodeId: string | null): { judul: string; items: ItemNav[] }[] {
  const p = periodeId ?? "_";
  return [
    { judul: "", items: [{ href: "/dashboard", label: "Dashboard", ikon: "dashboard", roles: SEMUA }] },
    {
      judul: "Data",
      items: [
        { href: "/siswa", label: "Data Siswa", ikon: "siswa", roles: SEMUA },
        { href: "/kelas", label: "Kelas", ikon: "kelas", roles: SEMUA },
        { href: "/periode", label: "Periode", ikon: "periode", roles: SEMUA },
      ],
    },
    {
      judul: "Proses SPK",
      items: [
        { href: `/periode/${p}/kriteria`, label: "Kriteria", ikon: "kriteria", roles: SEMUA },
        { href: `/periode/${p}/bobot`, label: "Bobot Kriteria", ikon: "bobot", roles: SEMUA },
        { href: "/alternatif", label: "Data Alternatif", ikon: "alternatif", roles: SEMUA },
        { href: "/penilaian", label: "Penilaian Siswa", ikon: "penilaian", roles: SEMUA },
        { href: "/perhitungan", label: "Perhitungan SAW", ikon: "perhitungan", roles: ["ADMIN", "KEPSEK"] },
      ],
    },
    {
      judul: "Hasil",
      items: [
        { href: "/hasil", label: "Hasil Perangkingan", ikon: "hasil", roles: SEMUA },
        { href: "/validasi", label: "Validasi", ikon: "validasi", roles: ["KEPSEK", "ADMIN"] },
        { href: "/laporan", label: "Laporan Seleksi", ikon: "laporan", roles: SEMUA },
      ],
    },
    {
      judul: "Sistem",
      items: [
        { href: "/pengguna", label: "Pengguna", ikon: "pengguna", roles: ["ADMIN"] },
        { href: "/audit", label: "Audit Log", ikon: "audit", roles: ["ADMIN", "KEPSEK"] },
        { href: "/pengaturan", label: "Pengaturan Sekolah", ikon: "pengaturan", roles: ["ADMIN"] },
      ],
    },
  ];
}
