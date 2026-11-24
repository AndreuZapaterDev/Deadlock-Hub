import { ImageResponse } from "next/og";
import { EmblemImage } from "@/lib/brand-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Icono de "Añadir a pantalla de inicio" en iOS (no admite el manifest).
export default function AppleIcon() {
  return new ImageResponse(<EmblemImage size={180} safe={0.86} />, size);
}
