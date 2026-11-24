import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { themeInitScript } from "@/components/layout/theme-toggle";
import { MockBanner } from "@/components/layout/mock-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Ambient } from "@/components/motion/ambient";
import { MotionProvider } from "@/components/motion/provider";
import "./globals.css";

const serif = Playfair_Display({ subsets: ["latin"], variable: "--f-serif", style: ["normal", "italic"] });
const sans = Inter({ subsets: ["latin"], variable: "--f-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://deadlockhub.vercel.app"),
  title: { default: "Deadlock Hub", template: "%s · Deadlock Hub" },
  description: "Web fan no oficial sobre Deadlock: wiki, estadísticas y tracker de jugadores.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning className={`${serif.variable} ${sans.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <MotionProvider>
            <Ambient />
            <MockBanner />
            <SiteHeader />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
            <SiteFooter />
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
