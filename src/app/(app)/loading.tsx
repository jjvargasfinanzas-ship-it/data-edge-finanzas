import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-2 h-4 w-80" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-[1.25rem]" />
        ))}
      </div>
      <Skeleton className="mt-6 h-72 rounded-[1.25rem]" />
    </div>
  );
}
