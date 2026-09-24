"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { TriangleAlert } from "lucide-react";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      icon={<TriangleAlert className="size-7" />}
      title="Algo no cargó bien"
      description="No pudimos obtener tu información. Revisa tu conexión e intenta de nuevo."
      action={<Button onClick={reset}>Reintentar</Button>}
    />
  );
}
