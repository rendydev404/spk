import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { StatusBadge } from "@/components/layout/sidebar";
import { FilterSelect } from "@/components/ui/filter";
import { Alert, Badge, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { Tabs } from "@/components/ui/tabs";
import { RunAksi } from "@/features/perhitungan/components/run-aksi";
import { SimulasiBobot } from "@/features/perhitungan/components/simulasi";
import { StatusRun } from "@/features/perhitungan/components/status-run";
import { catatanValidasi, daftarKelompokRun, getRun, hasilKelompok } from "@/features/perhitungan/queries";
import { getPeriode } from "@/features/periode/queries";
import { fmt4, fmtAngka, fmtWaktu } from "@/lib/format";
import { requireRole } from "@/lib/rbac";
import { LABEL_CAKUPAN } from "@/lib/status";

export const metadata: Metadata = { title: "Detail perhitungan" };

const PER = 50;
const label = (g: string) => (g === "SEKOLAH" ? "Seluruh sekolah" : g);

function Rumus({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-md border border-border bg-surface-2 px-4 py-3 font-mono text-[13px]">
      {children}
    </div>
  );
}

export default async function RunPage({
  params,
  searchParams,
}: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ kelompok?: string; page?: string }>;
}) {
  const { runId } = await params;
  if (!z.string().uuid().safeParse(runId).success) notFound();
  const u = await requireRole("ADMIN", "KEPSEK");
  const run = await getRun(runId);
  if (!run) notFound();
  const sp = await searchParams;
  const [periode, kelompokList, catatan] = await Promise.all([
    getPeriode(run.periodeId),
    daftarKelompokRun(runId),
    catatanValidasi(runId),
  ]);
  const kelompok =
    kelompokList.find((k) => k.kelompok === sp.kelompok)?.kelompok ?? kelompokList[0]?.kelompok ?? "SEKOLAH";
  const n = kelompokList.find((k) => k.kelompok === kelompok)?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(n / PER));
  const page = Math.min(totalPages, Math.max(1, Number(sp.page) || 1));
  const [rows, semua] = await Promise.all([
    hasilKelompok(runId, kelompok, { limit: PER, offset: (page - 1) * PER }),
    n <= 500 ? hasilKelompok(runId, kelompok) : Promise.resolve(null),
  ]);
  const ks = run.snapshot.kriteria;
  const mm = run.snapshot.kelompok[kelompok];
  const urutX = [...rows].sort((a, b) => a.kode.localeCompare(b.kode, "id", { numeric: true }));
  const href = (p: number) => `/perhitungan/${runId}?kelompok=${encodeURIComponent(kelompok)}&page=${p}`;
  const admin = u.role === "ADMIN";
  const kuota = periode?.kuota ?? null;

  const tabelX = (
    <table className="tabel">
      <thead>
        <tr>
          <th>Alternatif</th>
          {ks.map((k) => (
            <th key={k.id} className="num" title={k.nama}>
              {k.kode}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {urutX.map((r) => (
          <tr key={r.siswaId}>
            <td>
              <span className="font-medium">{r.kode}</span> <span className="text-muted">{r.nama}</span>
            </td>
            {ks.map((k) => (
              <td key={k.id} className="num">
                {fmtAngka(r.nilaiX[k.id])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const items = [
    {
      value: "kriteria",
      label: "1. Kriteria dan bobot",
      content: (
        <>
          <Rumus>ΣW = 1 · bobot dari snapshot saat perhitungan dijalankan</Rumus>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Kriteria</th>
                  <th>Jenis</th>
                  <th className="num">Bobot (%)</th>
                  <th className="num">W</th>
                </tr>
              </thead>
              <tbody>
                {ks.map((k) => (
                  <tr key={k.id}>
                    <td className="font-medium">{k.kode}</td>
                    <td>{k.nama}</td>
                    <td>
                      {k.jenis === "BENEFIT" ? (
                        <Badge tone="info">Benefit</Badge>
                      ) : (
                        <Badge tone="warning">Cost</Badge>
                      )}
                    </td>
                    <td className="num">{fmtAngka(k.bobot)}</td>
                    <td className="num">{(k.bobot / 100).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ),
    },
    {
      value: "x",
      label: "2. Matriks keputusan X",
      content: (
        <>
          <Rumus>X = [x_ij] · nilai setelah konversi skala (sub-kriteria)</Rumus>
          <div className="overflow-x-auto rounded-md border border-border">{tabelX}</div>
        </>
      ),
    },
    {
      value: "maxmin",
      label: "3. Nilai max/min",
      content: (
        <>
          <Rumus>
            Benefit memakai max_i(x_ij) · Cost memakai min_i(x_ij) · dihitung dalam kelompok {label(kelompok)}
          </Rumus>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="tabel">
              <thead>
                <tr>
                  <th />
                  {ks.map((k) => (
                    <th key={k.id} className="num">
                      {k.kode}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">Jenis</td>
                  {ks.map((k) => (
                    <td key={k.id} className="num">
                      {k.jenis === "BENEFIT" ? "Benefit" : "Cost"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="font-medium">Max</td>
                  {ks.map((k) => (
                    <td
                      key={k.id}
                      className={k.jenis === "BENEFIT" ? "num font-semibold text-accent" : "num text-muted"}
                    >
                      {fmtAngka(mm?.max[k.id])}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="font-medium">Min</td>
                  {ks.map((k) => (
                    <td
                      key={k.id}
                      className={k.jenis === "COST" ? "num font-semibold text-accent" : "num text-muted"}
                    >
                      {fmtAngka(mm?.min[k.id])}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ),
    },
    {
      value: "r",
      label: "4. Normalisasi R",
      content: (
        <>
          <Rumus>Benefit: r_ij = x_ij / max_i(x_ij) · Cost: r_ij = min_i(x_ij) / x_ij</Rumus>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Alternatif</th>
                  {ks.map((k) => (
                    <th key={k.id} className="num">
                      {k.kode}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {urutX.map((r) => (
                  <tr key={r.siswaId}>
                    <td>
                      <span className="font-medium">{r.kode}</span>{" "}
                      <span className="text-muted">{r.nama}</span>
                    </td>
                    {ks.map((k) => (
                      <td key={k.id} className="num">
                        {fmt4(r.normalisasi[k.id] ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ),
    },
    {
      value: "v",
      label: "5. Nilai preferensi V",
      content: (
        <>
          <Rumus>
            V_i = Σ_j W_j × r_ij · urut dari terbesar · seri: r kriteria berbobot terbesar, lalu nilai mentah
            C1, lalu nama
          </Rumus>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="tabel">
              <thead>
                <tr>
                  <th className="num w-20">Peringkat</th>
                  <th>Alternatif</th>
                  <th>Kelas</th>
                  {ks.map((k) => (
                    <th key={k.id} className="num">
                      W×r {k.kode}
                    </th>
                  ))}
                  <th className="num">V</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.siswaId}
                    className={kuota && r.peringkat <= kuota ? "bg-success-soft/40" : undefined}
                  >
                    <td className="num font-semibold">{r.peringkat}</td>
                    <td>
                      <span className="font-medium">{r.kode}</span> {r.nama}
                    </td>
                    <td>{r.kelasNama}</td>
                    {ks.map((k) => (
                      <td key={k.id} className="num text-muted">
                        {fmt4(((r.normalisasi[k.id] ?? 0) * k.bobot) / 100)}
                      </td>
                    ))}
                    <td className="num font-semibold">{fmt4(r.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {kuota ? (
            <p className="mt-2 text-xs text-muted">Baris berwarna masuk kuota {kuota} besar.</p>
          ) : null}
        </>
      ),
    },
    ...(semua
      ? [
          {
            value: "simulasi",
            label: "Simulasi bobot",
            content: (
              <SimulasiBobot
                kriteria={ks}
                alternatif={semua.map((r) => ({
                  id: r.siswaId,
                  kode: r.kode,
                  nama: r.nama,
                  nilaiX: r.nilaiX,
                  peringkat: r.peringkat,
                }))}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Detail perhitungan SAW"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {periode?.nama} <StatusBadge status={periode?.status ?? "DRAFT"} /> {LABEL_CAKUPAN[run.cakupan]} ·{" "}
            {run.jumlahSiswa} alternatif · {fmtWaktu(run.dihitungPada)} oleh {run.oleh ?? "-"} ·{" "}
            <StatusRun status={run.status} />
          </span>
        }
        actions={
          admin ? (
            <RunAksi
              runId={runId}
              bisaAjukan={
                periode?.status === "PERHITUNGAN" && (run.status === "DRAFT" || run.status === "DITOLAK")
              }
              bisaHapus={periode?.status === "PERHITUNGAN" && run.status === "DRAFT"}
            />
          ) : null
        }
      />
      {catatan.map((c) => (
        <div key={c.createdAt.toISOString()} className="mb-4">
          <Alert
            tone={c.keputusan === "DISETUJUI" ? "success" : "danger"}
            title={`${c.keputusan === "DISETUJUI" ? "Disetujui" : "Ditolak"} oleh ${c.oleh ?? "-"} · ${fmtWaktu(c.createdAt)}`}
          >
            {c.catatan}
          </Alert>
        </div>
      ))}
      <div className="panel p-4 sm:p-5">
        {kelompokList.length > 1 ? (
          <div className="mb-3">
            <FilterSelect
              param="kelompok"
              label="Kelompok"
              semuaLabel={label(kelompokList[0]!.kelompok)}
              options={kelompokList
                .slice(1)
                .map((k) => ({ value: k.kelompok, label: `${label(k.kelompok)} (${k.n})` }))}
              className="sm:w-72"
            />
          </div>
        ) : null}
        <Tabs items={items} defaultValue="v" />
        {totalPages > 1 ? <Pagination page={page} totalPages={totalPages} total={n} href={href} /> : null}
      </div>
    </>
  );
}
