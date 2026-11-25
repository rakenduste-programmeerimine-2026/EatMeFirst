import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { logout } from "@/app/login/actions";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/server";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
// Self-hosted fonts (no requests to Google): Schibsted Grotesk for text,
// Martian Mono for the "best before" date stamps. Both cover Estonian letters.
import "@fontsource-variable/schibsted-grotesk";
import "@fontsource-variable/martian-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "EatMeFirst",
  description: "Näe kohe, mida külmkapist esimesena ära süüa.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Saved light/dark choice; without one the CSS follows the device setting.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html lang="et" data-theme={theme ?? undefined}>
      <body>
        <header className="site-header">
          <Link href="/" className="logo">
            EatMeFirst
          </Link>
          <div className="header-actions">
            {user && (
              <nav className="header-nav">
                <Link href="/fridges">Külmkapid</Link>
                <form action={logout}>
                  <button className="link-button">Logi välja</button>
                </form>
              </nav>
            )}
            <ThemeToggle savedTheme={theme} />
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
