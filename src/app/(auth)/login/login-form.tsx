"use client";

import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ tujuan }: { tujuan: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lihat, setLihat] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    const { error } = await authClient.signIn.username({
      username: String(fd.get("username") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
    });
    if (error) {
      setLoading(false);
      setError(
        error.status === 429
          ? "Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi."
          : "Username atau password salah, atau akun tidak aktif.",
      );
      return;
    }
    router.replace(tujuan);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      {error ? (
        <div role="alert" className="flex gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-[13px]">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
          {error}
        </div>
      ) : null}
      <TextField label="Username" name="username" autoComplete="username" required autoFocus />
      <div className="relative">
        <TextField
          label="Password"
          name="password"
          type={lihat ? "text" : "password"}
          autoComplete="current-password"
          required
        />
        <button
          type="button"
          onClick={() => setLihat((v) => !v)}
          aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}
          className="absolute right-1 top-[29px] grid size-7 place-items-center rounded-sm text-muted hover:bg-surface-2"
        >
          {lihat ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
      <Button type="submit" loading={loading} className="mt-1 w-full">
        Masuk
      </Button>
    </form>
  );
}
