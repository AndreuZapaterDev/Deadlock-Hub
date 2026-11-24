import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/lib/brand-image";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Perfil de jugador en Deadlock Hub";

// Genérica a propósito: no se consulta la API ni se publican datos personales del jugador en la imagen.
export default async function Image({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const id = /^\d{1,12}$/.test(accountId) ? `Cuenta #${accountId}` : undefined;
  return new ImageResponse(<OgCard title="Perfil de jugador" subtitle={id} kicker="Deadlock Hub" />, size);
}
