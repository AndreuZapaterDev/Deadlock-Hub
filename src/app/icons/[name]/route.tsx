import { ImageResponse } from "next/og";
import { EmblemImage } from "@/lib/brand-image";

// Iconos de la PWA (manifest.ts): 192, 512 y "maskable" (con margen, porque el sistema lo recorta en círculo).
const SIZES: Record<string, { size: number; safe: number }> = {
  "192": { size: 192, safe: 0.86 },
  "512": { size: 512, safe: 0.86 },
  maskable: { size: 512, safe: 0.6 },
};

export function generateStaticParams() {
  return Object.keys(SIZES).map((name) => ({ name }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const spec = SIZES[name];
  if (!spec) return new Response("No existe", { status: 404 });
  return new ImageResponse(<EmblemImage size={spec.size} safe={spec.safe} />, { width: spec.size, height: spec.size, headers: { "Cache-Control": "public, max-age=31536000, immutable" } });
}
