import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "./nav";
import { Providers } from "@/components/providers";
import Script from "next/script";

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
        <Script id="gtm-head" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TCFLGNHK');`}
        </Script>
      </head>
      <body style={{ background: "#0a0e17", color: "#e2e8f0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TCFLGNHK"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
