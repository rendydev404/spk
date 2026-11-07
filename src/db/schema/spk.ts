import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

export const statusPeriodeEnum = pgEnum("status_periode", [
  "DRAFT",
  "PENILAIAN",
  "PERHITUNGAN",
  "VALIDASI",
  "FINAL",
]);
export const semesterEnum = pgEnum("semester", ["GANJIL", "GENAP"]);
export const cakupanEnum = pgEnum("cakupan", ["SEKOLAH", "TINGKAT", "KELAS"]);
export const modeBobotEnum = pgEnum("mode_bobot", ["PERSEN", "KEPENTINGAN"]);
export const jenisKelaminEnum = pgEnum("jenis_kelamin", ["L", "P"]);
export const jenisKriteriaEnum = pgEnum("jenis_kriteria", ["BENEFIT", "COST"]);
export const tipeInputEnum = pgEnum("tipe_input", ["ANGKA", "RENTANG", "PILIHAN"]);
export const statusPerhitunganEnum = pgEnum("status_perhitungan", [
  "DRAFT",
  "DIAJUKAN",
  "DISETUJUI",
  "DITOLAK",
]);
export const keputusanEnum = pgEnum("keputusan", ["DISETUJUI", "DITOLAK"]);
export const jenjangEnum = pgEnum("jenjang", ["SD", "SMP", "SMA", "LAINNYA"]);

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const periode = pgTable(
  "periode",
  {
    id: uuid().primaryKey().defaultRandom(),
    nama: text().notNull(),
    tahunAjaran: text().notNull(),
    semester: semesterEnum().notNull(),
    status: statusPeriodeEnum().notNull().default("DRAFT"),
    cakupanDefault: cakupanEnum().notNull().default("SEKOLAH"),
    modeBobot: modeBobotEnum().notNull().default("PERSEN"),
    kuota: integer(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.tahunAjaran, t.semester),
    check("periode_tahun_ajaran_format", sql`${t.tahunAjaran} ~ '^\\d{4}/\\d{4}$'`),
    check("periode_kuota_positif", sql`${t.kuota} is null or ${t.kuota} >= 1`),
    // Hanya satu periode aktif (bukan DRAFT/FINAL) pada satu waktu.
    uniqueIndex("periode_satu_aktif")
      .on(sql`(true)`)
      .where(sql`${t.status} in ('PENILAIAN','PERHITUNGAN','VALIDASI')`),
  ],
);

export const kelas = pgTable(
  "kelas",
  {
    id: uuid().primaryKey().defaultRandom(),
    periodeId: uuid()
      .notNull()
      .references(() => periode.id, { onDelete: "restrict" }),
    nama: text().notNull(),
    tingkat: smallint().notNull(),
    waliKelasId: text().references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    unique().on(t.periodeId, t.nama),
    index().on(t.waliKelasId, t.periodeId),
    check("kelas_tingkat_valid", sql`${t.tingkat} between 1 and 12`),
  ],
);

export const siswa = pgTable(
  "siswa",
  {
    id: uuid().primaryKey().defaultRandom(),
    nis: text().notNull().unique(),
    nisn: char({ length: 10 }).unique(),
    nama: text().notNull(),
    jenisKelamin: jenisKelaminEnum().notNull(),
    tanggalLahir: date(),
    aktif: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [
    check("siswa_nisn_format", sql`${t.nisn} is null or ${t.nisn} ~ '^\\d{10}$'`),
    index("siswa_nama_lower_idx").on(sql`lower(${t.nama}) text_pattern_ops`),
  ],
);

export const kelasSiswa = pgTable(
  "kelas_siswa",
  {
    kelasId: uuid()
      .notNull()
      .references(() => kelas.id, { onDelete: "cascade" }),
    siswaId: uuid()
      .notNull()
      .references(() => siswa.id, { onDelete: "restrict" }),
    periodeId: uuid()
      .notNull()
      .references(() => periode.id, { onDelete: "restrict" }),
  },
  (t) => [
    primaryKey({ columns: [t.kelasId, t.siswaId] }),
    unique("kelas_siswa_satu_kelas_per_periode").on(t.periodeId, t.siswaId),
    index().on(t.siswaId),
  ],
);

export const kriteria = pgTable(
  "kriteria",
  {
    id: uuid().primaryKey().defaultRandom(),
    periodeId: uuid()
      .notNull()
      .references(() => periode.id, { onDelete: "cascade" }),
    kode: text().notNull(),
    nama: text().notNull(),
    jenis: jenisKriteriaEnum().notNull(),
    bobot: numeric({ precision: 5, scale: 2 }).notNull().default("0"),
    kepentingan: smallint(),
    tipeInput: tipeInputEnum().notNull(),
    nilaiMin: numeric({ precision: 8, scale: 2 }),
    nilaiMax: numeric({ precision: 8, scale: 2 }),
    urutan: smallint().notNull().default(0),
  },
  (t) => [
    unique().on(t.periodeId, t.kode),
    check("kriteria_kode_format", sql`${t.kode} ~ '^C\\d+$'`),
    check("kriteria_bobot_valid", sql`${t.bobot} >= 0 and ${t.bobot} <= 100`),
    check("kriteria_kepentingan_valid", sql`${t.kepentingan} is null or ${t.kepentingan} between 1 and 5`),
  ],
);

export const subKriteria = pgTable(
  "sub_kriteria",
  {
    id: uuid().primaryKey().defaultRandom(),
    kriteriaId: uuid()
      .notNull()
      .references(() => kriteria.id, { onDelete: "cascade" }),
    label: text().notNull(),
    nilai: numeric({ precision: 6, scale: 2 }).notNull(),
    batasBawah: numeric({ precision: 8, scale: 2 }),
    batasAtas: numeric({ precision: 8, scale: 2 }),
    urutan: smallint().notNull().default(0),
  },
  (t) => [unique().on(t.kriteriaId, t.label), check("sub_kriteria_nilai_positif", sql`${t.nilai} > 0`)],
);

export const alternatif = pgTable(
  "alternatif",
  {
    periodeId: uuid()
      .notNull()
      .references(() => periode.id, { onDelete: "cascade" }),
    siswaId: uuid()
      .notNull()
      .references(() => siswa.id, { onDelete: "restrict" }),
    kode: text().notNull(),
    ditambahkanOleh: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.periodeId, t.siswaId] }),
    unique("alternatif_kode_unik").on(t.periodeId, t.kode),
    index().on(t.siswaId),
    foreignKey({
      name: "alternatif_terdaftar_di_kelas",
      columns: [t.periodeId, t.siswaId],
      foreignColumns: [kelasSiswa.periodeId, kelasSiswa.siswaId],
    }).onDelete("restrict"),
  ],
);

export const penilaian = pgTable(
  "penilaian",
  {
    periodeId: uuid().notNull(),
    siswaId: uuid().notNull(),
    kriteriaId: uuid()
      .notNull()
      .references(() => kriteria.id, { onDelete: "cascade" }),
    nilaiMentah: numeric({ precision: 8, scale: 2 }),
    subKriteriaId: uuid().references(() => subKriteria.id, { onDelete: "restrict" }),
    nilai: numeric({ precision: 8, scale: 2 }).notNull(),
    diinputOleh: text().references(() => user.id, { onDelete: "set null" }),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.periodeId, t.siswaId, t.kriteriaId] }),
    index().on(t.periodeId, t.kriteriaId),
    foreignKey({
      name: "penilaian_alternatif_fk",
      columns: [t.periodeId, t.siswaId],
      foreignColumns: [alternatif.periodeId, alternatif.siswaId],
    }).onDelete("cascade"),
  ],
);

export type SnapshotPerhitungan = {
  kriteria: {
    id: string;
    kode: string;
    nama: string;
    jenis: "BENEFIT" | "COST";
    bobot: number;
  }[];
  kelompok: Record<string, { max: Record<string, number>; min: Record<string, number> }>;
  durasiMs: number;
};

export const perhitungan = pgTable(
  "perhitungan",
  {
    id: uuid().primaryKey().defaultRandom(),
    periodeId: uuid()
      .notNull()
      .references(() => periode.id, { onDelete: "cascade" }),
    cakupan: cakupanEnum().notNull(),
    dihitungOleh: text().references(() => user.id, { onDelete: "set null" }),
    dihitungPada: timestamp({ withTimezone: true }).notNull().defaultNow(),
    snapshot: jsonb().$type<SnapshotPerhitungan>().notNull(),
    status: statusPerhitunganEnum().notNull().default("DRAFT"),
    jumlahSiswa: integer().notNull(),
  },
  (t) => [
    index().on(t.periodeId, t.dihitungPada.desc()),
    uniqueIndex("perhitungan_satu_disetujui").on(t.periodeId).where(sql`${t.status} = 'DISETUJUI'`),
  ],
);

export const hasil = pgTable(
  "hasil",
  {
    perhitunganId: uuid()
      .notNull()
      .references(() => perhitungan.id, { onDelete: "cascade" }),
    siswaId: uuid()
      .notNull()
      .references(() => siswa.id, { onDelete: "restrict" }),
    kelompok: text().notNull(),
    kodeAlternatif: text().notNull(),
    kelasNama: text().notNull(),
    nilaiX: jsonb().$type<Record<string, number>>().notNull(),
    normalisasi: jsonb().$type<Record<string, number>>().notNull(),
    nilaiPreferensi: numeric({ precision: 10, scale: 6 }).notNull(),
    peringkat: integer().notNull(),
    terpilih: boolean().notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.perhitunganId, t.siswaId] }),
    index().on(t.perhitunganId, t.kelompok, t.peringkat),
    index().on(t.siswaId),
  ],
);

export const validasi = pgTable(
  "validasi",
  {
    id: uuid().primaryKey().defaultRandom(),
    perhitunganId: uuid()
      .notNull()
      .references(() => perhitungan.id, { onDelete: "cascade" }),
    kepsekId: text().references(() => user.id, { onDelete: "set null" }),
    keputusan: keputusanEnum().notNull(),
    catatan: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.perhitunganId),
    check(
      "validasi_catatan_wajib_saat_tolak",
      sql`${t.keputusan} = 'DISETUJUI' or length(trim(coalesce(${t.catatan}, ''))) > 0`,
    ),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    aksi: text().notNull(),
    entitas: text().notNull(),
    entitasId: text(),
    data: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.createdAt.desc()), index().on(t.entitas, t.entitasId), index().on(t.userId)],
);

export const pengaturanSekolah = pgTable(
  "pengaturan_sekolah",
  {
    id: smallint().primaryKey().default(1),
    namaSekolah: text().notNull().default("Nama Sekolah"),
    alamat: text().notNull().default(""),
    kota: text().notNull().default(""),
    logoUrl: text(),
    namaKepsek: text().notNull().default(""),
    nipKepsek: text().notNull().default(""),
    jenjang: jenjangEnum().notNull().default("SMA"),
    npsn: text().notNull().default(""),
    telepon: text().notNull().default(""),
    email: text().notNull().default(""),
    website: text().notNull().default(""),
    /** Jabatan di tanda tangan laporan, misal "Kepala Sekolah" atau "Kepala Madrasah". */
    jabatanPenandatangan: text().notNull().default("Kepala Sekolah"),
    /** Jenis nomor induk penandatangan: NIP, NIY, NUPTK, dst. */
    labelNomorInduk: text().notNull().default("NIP"),
    /** Nama seleksi di judul laporan, misal "Siswa Berprestasi" atau "Penerima Beasiswa". */
    judulSeleksi: text().notNull().default("Siswa Berprestasi"),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [check("pengaturan_satu_baris", sql`${t.id} = 1`)],
);
