import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/lib/brand-image";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Deadlock Hub: wiki, estadísticas y tracker de Deadlock";

export default function Image() {
  return new ImageResponse(<OgCard title="Deadlock Hub" subtitle="Wiki, estadísticas y tracker de jugadores" kicker="Web fan no oficial" />, size);
}
