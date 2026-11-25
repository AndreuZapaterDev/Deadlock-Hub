import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { themeInitScript } from "@/components/layout/theme-toggle";
import { getLanguage } from "@/lib/language";
import { htmlLang } from "@/lib/languages";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Ambient } from "@/components/motion/ambient";
import { MotionProvider } from "@/components/motion/provider";
import { Pwa } from "@/components/pwa/pwa";
import "./globals.css";

const serif = Playfair_Display({ subsets: ["latin", "latin-ext", "cyrillic", "vietnamese"], variable: "--f-serif", style: ["normal", "italic"] });
const sans = Inter({ subsets: ["latin", "latin-ext", "cyrillic", "greek", "vietnamese"], variable: "--f-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site");
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://deadlockhub.vercel.app"),
    title: { default: "Deadlock Hub", template: "%s · Deadlock Hub" },
    description: t("description"),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [messages, language] = await Promise.all([getMessages(), getLanguage()]);
  const locale = await getLocale();
  return (
    <html lang={htmlLang(language)} data-theme="dark" suppressHydrationWarning className={`${serif.variable} ${sans.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Las imágenes de héroes y objetos salen de este CDN: abrir la conexión antes ahorra ~150-300 ms en móvil. */}
        <link rel="preconnect" href="https://assets-bucket.deadlock-api.com" />
        {/* Sin JavaScript nadie dispara la aparición al hacer scroll: todo se ve desde el principio. */}
        <noscript><style>{".reveal{opacity:1!important;transform:none!important;clip-path:none!important;transition:none!important}"}</style></noscript>
      </head>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <MotionProvider>
            <Ambient />
            <SiteHeader />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
            <SiteFooter />
            <Pwa />
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
