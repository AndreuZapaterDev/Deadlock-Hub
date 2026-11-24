import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const FIX = "./mock/deadlock-mock/fixtures";

const nextConfig: NextConfig = {
  // Los fixtures se leen en runtime (ruta dinámica), así que el trazado de Vercel no los ve: se incluyen a mano.
  outputFileTracingIncludes: { "/**": [`${FIX}/**`] },
  // Fuera lo que la web no usa y lo más pesado (límite de tamaño de las funciones de Vercel).
  outputFileTracingExcludes: {
    "/**": [
      `${FIX}/v1__assets__sounds.json`,
      `${FIX}/v1__assets__models.json`,
      `${FIX}/v1__matches__demo__schema.json`,
      `${FIX}/v1__info__live-requests.txt`,
      `${FIX}/*.bin`,
      `${FIX}/synthetic/**`,
      `${FIX}/v1__sql__*`,
      `${FIX}/*patron*`,
      `${FIX}/*custom*`,
      `${FIX}/v1__commands__*`,
      `${FIX}/*.py`,
    ],
  },
};

export default createNextIntlPlugin()(nextConfig);
