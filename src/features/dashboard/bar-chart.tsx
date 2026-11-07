/** Grafik batang horizontal SVG sederhana (tanpa library). */
export function BarChart({
  data,
  maks = 1,
}: {
  data: { label: string; sub?: string; nilai: number; sorot?: boolean }[];
  maks?: number;
}) {
  const f4 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return (
    <ul className="flex flex-col gap-2.5" aria-label="Grafik nilai preferensi">
      {data.map((d, i) => (
        <li
          key={`${d.label}-${d.sub ?? ""}`}
          className="grid grid-cols-[1.5rem_minmax(0,11rem)_1fr_4.5rem] items-center gap-2 text-[13px]"
        >
          <span className="text-right font-semibold text-muted tabular">{i + 1}</span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{d.label}</span>
            {d.sub ? <span className="block truncate text-[11.5px] text-muted">{d.sub}</span> : null}
          </span>
          <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="h-2.5 w-full" aria-hidden>
            <rect width="100" height="10" rx="2" className="fill-surface-2" />
            <rect
              width={(d.nilai / maks) * 100}
              height="10"
              rx="2"
              className={d.sorot ? "fill-accent" : "fill-accent/45"}
            />
          </svg>
          <span className="text-right tabular">{f4.format(d.nilai)}</span>
        </li>
      ))}
    </ul>
  );
}
