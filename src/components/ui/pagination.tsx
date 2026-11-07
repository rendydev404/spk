import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "./cn";

export function Pagination({
  page,
  totalPages,
  total,
  href,
}: {
  page: number;
  totalPages: number;
  total: number;
  href: (p: number) => string;
}) {
  if (totalPages <= 1) return <p className="px-4 py-3 text-xs text-muted">{total} data</p>;
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const list = [...pages].sort((a, b) => a - b);
  const item = "inline-grid h-8 min-w-8 place-items-center rounded-sm px-2 text-[13px] tabular";
  return (
    <nav aria-label="Halaman" className="flex items-center justify-between gap-3 px-4 py-3">
      <p className="text-xs text-muted">{total} data</p>
      <ul className="flex items-center gap-1">
        <li>
          {page > 1 ? (
            <Link href={href(page - 1)} className={cn(item, "hover:bg-surface-2")} aria-label="Sebelumnya">
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          ) : (
            <span className={cn(item, "opacity-40")} aria-hidden>
              <ChevronLeft className="size-4" />
            </span>
          )}
        </li>
        {list.map((p, i) => (
          <li key={p} className="flex items-center gap-1">
            {i > 0 && p - (list[i - 1] ?? 0) > 1 ? <span className="px-1 text-muted">...</span> : null}
            <Link
              href={href(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                item,
                p === page ? "bg-accent-soft font-semibold text-accent" : "hover:bg-surface-2",
              )}
            >
              {p}
            </Link>
          </li>
        ))}
        <li>
          {page < totalPages ? (
            <Link href={href(page + 1)} className={cn(item, "hover:bg-surface-2")} aria-label="Berikutnya">
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span className={cn(item, "opacity-40")} aria-hidden>
              <ChevronRight className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
