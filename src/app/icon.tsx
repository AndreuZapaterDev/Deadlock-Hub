import { ImageResponse } from "next/og";
import { EmblemImage } from "@/lib/brand-image";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Favicon.
export default function Icon() {
  return new ImageResponse(<EmblemImage size={64} safe={0.92} />, size);
}
