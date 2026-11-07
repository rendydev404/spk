CREATE TYPE "public"."jenjang" AS ENUM('SD', 'SMP', 'SMA', 'LAINNYA');--> statement-breakpoint
ALTER TABLE "pengaturan_sekolah" ADD COLUMN "jenjang" "jenjang" DEFAULT 'SMA' NOT NULL;--> statement-breakpoint
ALTER TABLE "pengaturan_sekolah" ADD COLUMN "npsn" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pengaturan_sekolah" ADD COLUMN "telepon" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pengaturan_sekolah" ADD COLUMN "email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pengaturan_sekolah" ADD COLUMN "website" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pengaturan_sekolah" ADD COLUMN "jabatan_penandatangan" text DEFAULT 'Kepala Sekolah' NOT NULL;--> statement-breakpoint
ALTER TABLE "pengaturan_sekolah" ADD COLUMN "label_nomor_induk" text DEFAULT 'NIP' NOT NULL;--> statement-breakpoint
ALTER TABLE "pengaturan_sekolah" ADD COLUMN "judul_seleksi" text DEFAULT 'Siswa Berprestasi' NOT NULL;