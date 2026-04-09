import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "./nav";

export const metadata: Metadata = {
  title: "SEO & MarTech Tools",
  description: "Free technical SEO tools: robots.txt validator, UTM builder, meta tag creator, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: "#0a0e17", color: "#e2e8f0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
