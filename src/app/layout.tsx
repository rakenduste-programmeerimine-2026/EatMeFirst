import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "EatMeFirst",
  description: "Näe kohe, mida külmkapist esimesena ära süüa.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="et">
      <body>
        <header className="site-header">
          <Link href="/" className="logo">
            EatMeFirst
          </Link>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
