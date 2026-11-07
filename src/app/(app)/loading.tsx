export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Memuat" className="animate-pulse">
      <div className="mb-2 h-6 w-56 rounded-sm bg-surface-2" />
      <div className="mb-6 h-4 w-96 max-w-full rounded-sm bg-surface-2" />
      <div className="panel h-72" />
    </div>
  );
}
