import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { logout } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <html lang="et">
      <body>
        <header className="site-header">
          <Link href="/" className="logo">
            EatMeFirst
          </Link>
          {user && (
            <form action={logout}>
              <button className="link-button">Logi välja</button>
            </form>
          )}
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
