CREATE TYPE "public"."role" AS ENUM('ADMIN', 'WALI_KELAS', 'KEPSEK');--> statement-breakpoint
CREATE TYPE "public"."cakupan" AS ENUM('SEKOLAH', 'TINGKAT', 'KELAS');--> statement-breakpoint
CREATE TYPE "public"."jenis_kelamin" AS ENUM('L', 'P');--> statement-breakpoint
CREATE TYPE "public"."jenis_kriteria" AS ENUM('BENEFIT', 'COST');--> statement-breakpoint
CREATE TYPE "public"."keputusan" AS ENUM('DISETUJUI', 'DITOLAK');--> statement-breakpoint
CREATE TYPE "public"."mode_bobot" AS ENUM('PERSEN', 'KEPENTINGAN');--> statement-breakpoint
CREATE TYPE "public"."semester" AS ENUM('GANJIL', 'GENAP');--> statement-breakpoint
CREATE TYPE "public"."status_perhitungan" AS ENUM('DRAFT', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK');--> statement-breakpoint
CREATE TYPE "public"."status_periode" AS ENUM('DRAFT', 'PENILAIAN', 'PERHITUNGAN', 'VALIDASI', 'FINAL');--> statement-breakpoint
CREATE TYPE "public"."tipe_input" AS ENUM('ANGKA', 'RENTANG', 'PILIHAN');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" "citext" NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" "citext" NOT NULL,
	"display_username" text,
	"role" "role" DEFAULT 'WALI_KELAS' NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"wajib_ganti_password" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alternatif" (
	"periode_id" uuid NOT NULL,
	"siswa_id" uuid NOT NULL,
	"kode" text NOT NULL,
	"ditambahkan_oleh" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alternatif_periode_id_siswa_id_pk" PRIMARY KEY("periode_id","siswa_id"),
	CONSTRAINT "alternatif_kode_unik" UNIQUE("periode_id","kode")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text,
	"aksi" text NOT NULL,
	"entitas" text NOT NULL,
	"entitas_id" text,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hasil" (
	"perhitungan_id" uuid NOT NULL,
	"siswa_id" uuid NOT NULL,
	"kelompok" text NOT NULL,
	"kode_alternatif" text NOT NULL,
	"kelas_nama" text NOT NULL,
	"nilai_x" jsonb NOT NULL,
	"normalisasi" jsonb NOT NULL,
	"nilai_preferensi" numeric(10, 6) NOT NULL,
	"peringkat" integer NOT NULL,
	"terpilih" boolean DEFAULT false NOT NULL,
	CONSTRAINT "hasil_perhitungan_id_siswa_id_pk" PRIMARY KEY("perhitungan_id","siswa_id")
);
--> statement-breakpoint
CREATE TABLE "kelas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"periode_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"tingkat" smallint NOT NULL,
	"wali_kelas_id" text,
	CONSTRAINT "kelas_periodeId_nama_unique" UNIQUE("periode_id","nama"),
	CONSTRAINT "kelas_tingkat_valid" CHECK ("kelas"."tingkat" between 1 and 12)
);
--> statement-breakpoint
CREATE TABLE "kelas_siswa" (
	"kelas_id" uuid NOT NULL,
	"siswa_id" uuid NOT NULL,
	"periode_id" uuid NOT NULL,
	CONSTRAINT "kelas_siswa_kelas_id_siswa_id_pk" PRIMARY KEY("kelas_id","siswa_id"),
	CONSTRAINT "kelas_siswa_satu_kelas_per_periode" UNIQUE("periode_id","siswa_id")
);
--> statement-breakpoint
CREATE TABLE "kriteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"periode_id" uuid NOT NULL,
	"kode" text NOT NULL,
	"nama" text NOT NULL,
	"jenis" "jenis_kriteria" NOT NULL,
	"bobot" numeric(5, 2) DEFAULT '0' NOT NULL,
	"kepentingan" smallint,
	"tipe_input" "tipe_input" NOT NULL,
	"nilai_min" numeric(8, 2),
	"nilai_max" numeric(8, 2),
	"urutan" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "kriteria_periodeId_kode_unique" UNIQUE("periode_id","kode"),
	CONSTRAINT "kriteria_kode_format" CHECK ("kriteria"."kode" ~ '^C\d+$'),
	CONSTRAINT "kriteria_bobot_valid" CHECK ("kriteria"."bobot" >= 0 and "kriteria"."bobot" <= 100),
	CONSTRAINT "kriteria_kepentingan_valid" CHECK ("kriteria"."kepentingan" is null or "kriteria"."kepentingan" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "pengaturan_sekolah" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"nama_sekolah" text DEFAULT 'Nama Sekolah' NOT NULL,
	"alamat" text DEFAULT '' NOT NULL,
	"kota" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"nama_kepsek" text DEFAULT '' NOT NULL,
	"nip_kepsek" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pengaturan_satu_baris" CHECK ("pengaturan_sekolah"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "penilaian" (
	"periode_id" uuid NOT NULL,
	"siswa_id" uuid NOT NULL,
	"kriteria_id" uuid NOT NULL,
	"nilai_mentah" numeric(8, 2),
	"sub_kriteria_id" uuid,
	"nilai" numeric(8, 2) NOT NULL,
	"diinput_oleh" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "penilaian_periode_id_siswa_id_kriteria_id_pk" PRIMARY KEY("periode_id","siswa_id","kriteria_id")
);
--> statement-breakpoint
CREATE TABLE "perhitungan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"periode_id" uuid NOT NULL,
	"cakupan" "cakupan" NOT NULL,
	"dihitung_oleh" text,
	"dihitung_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"snapshot" jsonb NOT NULL,
	"status" "status_perhitungan" DEFAULT 'DRAFT' NOT NULL,
	"jumlah_siswa" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "periode" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"tahun_ajaran" text NOT NULL,
	"semester" "semester" NOT NULL,
	"status" "status_periode" DEFAULT 'DRAFT' NOT NULL,
	"cakupan_default" "cakupan" DEFAULT 'SEKOLAH' NOT NULL,
	"mode_bobot" "mode_bobot" DEFAULT 'PERSEN' NOT NULL,
	"kuota" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "periode_tahunAjaran_semester_unique" UNIQUE("tahun_ajaran","semester"),
	CONSTRAINT "periode_tahun_ajaran_format" CHECK ("periode"."tahun_ajaran" ~ '^\d{4}/\d{4}$'),
	CONSTRAINT "periode_kuota_positif" CHECK ("periode"."kuota" is null or "periode"."kuota" >= 1)
);
--> statement-breakpoint
CREATE TABLE "siswa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nis" text NOT NULL,
	"nisn" char(10),
	"nama" text NOT NULL,
	"jenis_kelamin" "jenis_kelamin" NOT NULL,
	"tanggal_lahir" date,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "siswa_nis_unique" UNIQUE("nis"),
	CONSTRAINT "siswa_nisn_unique" UNIQUE("nisn"),
	CONSTRAINT "siswa_nisn_format" CHECK ("siswa"."nisn" is null or "siswa"."nisn" ~ '^\d{10}$')
);
--> statement-breakpoint
CREATE TABLE "sub_kriteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kriteria_id" uuid NOT NULL,
	"label" text NOT NULL,
	"nilai" numeric(6, 2) NOT NULL,
	"batas_bawah" numeric(8, 2),
	"batas_atas" numeric(8, 2),
	"urutan" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "sub_kriteria_kriteriaId_label_unique" UNIQUE("kriteria_id","label"),
	CONSTRAINT "sub_kriteria_nilai_positif" CHECK ("sub_kriteria"."nilai" > 0)
);
--> statement-breakpoint
CREATE TABLE "validasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"perhitungan_id" uuid NOT NULL,
	"kepsek_id" text,
	"keputusan" "keputusan" NOT NULL,
	"catatan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "validasi_catatan_wajib_saat_tolak" CHECK ("validasi"."keputusan" = 'DISETUJUI' or length(trim(coalesce("validasi"."catatan", ''))) > 0)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alternatif" ADD CONSTRAINT "alternatif_periode_id_periode_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."periode"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alternatif" ADD CONSTRAINT "alternatif_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alternatif" ADD CONSTRAINT "alternatif_ditambahkan_oleh_user_id_fk" FOREIGN KEY ("ditambahkan_oleh") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alternatif" ADD CONSTRAINT "alternatif_terdaftar_di_kelas" FOREIGN KEY ("periode_id","siswa_id") REFERENCES "public"."kelas_siswa"("periode_id","siswa_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hasil" ADD CONSTRAINT "hasil_perhitungan_id_perhitungan_id_fk" FOREIGN KEY ("perhitungan_id") REFERENCES "public"."perhitungan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hasil" ADD CONSTRAINT "hasil_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_periode_id_periode_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."periode"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_wali_kelas_id_user_id_fk" FOREIGN KEY ("wali_kelas_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas_siswa" ADD CONSTRAINT "kelas_siswa_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas_siswa" ADD CONSTRAINT "kelas_siswa_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas_siswa" ADD CONSTRAINT "kelas_siswa_periode_id_periode_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."periode"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kriteria" ADD CONSTRAINT "kriteria_periode_id_periode_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."periode"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penilaian" ADD CONSTRAINT "penilaian_kriteria_id_kriteria_id_fk" FOREIGN KEY ("kriteria_id") REFERENCES "public"."kriteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penilaian" ADD CONSTRAINT "penilaian_sub_kriteria_id_sub_kriteria_id_fk" FOREIGN KEY ("sub_kriteria_id") REFERENCES "public"."sub_kriteria"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penilaian" ADD CONSTRAINT "penilaian_diinput_oleh_user_id_fk" FOREIGN KEY ("diinput_oleh") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penilaian" ADD CONSTRAINT "penilaian_alternatif_fk" FOREIGN KEY ("periode_id","siswa_id") REFERENCES "public"."alternatif"("periode_id","siswa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perhitungan" ADD CONSTRAINT "perhitungan_periode_id_periode_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."periode"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perhitungan" ADD CONSTRAINT "perhitungan_dihitung_oleh_user_id_fk" FOREIGN KEY ("dihitung_oleh") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_kriteria" ADD CONSTRAINT "sub_kriteria_kriteria_id_kriteria_id_fk" FOREIGN KEY ("kriteria_id") REFERENCES "public"."kriteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validasi" ADD CONSTRAINT "validasi_perhitungan_id_perhitungan_id_fk" FOREIGN KEY ("perhitungan_id") REFERENCES "public"."perhitungan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validasi" ADD CONSTRAINT "validasi_kepsek_id_user_id_fk" FOREIGN KEY ("kepsek_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_index" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_index" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "alternatif_siswa_id_index" ON "alternatif" USING btree ("siswa_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_index" ON "audit_log" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_entitas_entitas_id_index" ON "audit_log" USING btree ("entitas","entitas_id");--> statement-breakpoint
CREATE INDEX "audit_log_user_id_index" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hasil_perhitungan_id_kelompok_peringkat_index" ON "hasil" USING btree ("perhitungan_id","kelompok","peringkat");--> statement-breakpoint
CREATE INDEX "hasil_siswa_id_index" ON "hasil" USING btree ("siswa_id");--> statement-breakpoint
CREATE INDEX "kelas_wali_kelas_id_periode_id_index" ON "kelas" USING btree ("wali_kelas_id","periode_id");--> statement-breakpoint
CREATE INDEX "kelas_siswa_siswa_id_index" ON "kelas_siswa" USING btree ("siswa_id");--> statement-breakpoint
CREATE INDEX "penilaian_periode_id_kriteria_id_index" ON "penilaian" USING btree ("periode_id","kriteria_id");--> statement-breakpoint
CREATE INDEX "perhitungan_periode_id_dihitung_pada_index" ON "perhitungan" USING btree ("periode_id","dihitung_pada" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "perhitungan_satu_disetujui" ON "perhitungan" USING btree ("periode_id") WHERE "perhitungan"."status" = 'DISETUJUI';--> statement-breakpoint
CREATE UNIQUE INDEX "periode_satu_aktif" ON "periode" USING btree ((true)) WHERE "periode"."status" in ('PENILAIAN','PERHITUNGAN','VALIDASI');--> statement-breakpoint
CREATE INDEX "siswa_nama_lower_idx" ON "siswa" USING btree (lower("nama") text_pattern_ops);--> statement-breakpoint
CREATE INDEX "validasi_perhitungan_id_index" ON "validasi" USING btree ("perhitungan_id");