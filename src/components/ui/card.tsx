import { Corner } from "@/components/deco";
import { cn } from "@/lib/cn";

/** Tarjeta normal: borde simple y sombra suave. */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-md border border-brass/30 bg-surface p-4 shadow-card dark:bg-[linear-gradient(to_bottom,rgb(255_255_255/0.04),transparent_45%)]", className)}>{children}</div>;
}

/** Tarjeta destacada: marco de latón de doble línea, esquinas achaflanadas y ornamentos. */
export function FeaturedCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("chamfer bg-brass p-px shadow-card", className)}>
      <div className="chamfer relative bg-surface p-1">
        <div className="chamfer relative border border-brass/50 p-4">
          <Corner className="left-1 top-1" />
          <Corner className="right-1 top-1" rotate={90} />
          <Corner className="bottom-1 right-1" rotate={180} />
          <Corner className="bottom-1 left-1" rotate={270} />
          {children}
        </div>
      </div>
    </div>
  );
}
