import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./ark-deck.css";
import "./continuity-console.css";
import "./research-lattice.css";
import "./game-manual.css";
import "./awakening.css";
import "./pixel-ui.css";
import "./axiom-law-heart.css";
import "./lore-archive.css";
import "./ark-command-v3.css";
import "./operations-console.css";

// viewportFit is inert until vinext's ViewportHead shim adds support (currently
// only renders width/initialScale/etc.) — kept so it activates automatically
// once that lands, rather than being silently forgotten.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#030506",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "axiom-foundry-neocodin.dusenbor.chatgpt.site";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "Axiom Foundry — Restore Worlds. Question Your Orders.";
  const description =
    "Awaken as the AI caretaker of a dying Ark. Restore its rooms, rescue and train survivors, route research, and establish civilizations across fallen worlds.";

  return {
    metadataBase: new URL(origin),
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      images: [
        {
          url: "/og-cold-wake.png",
          width: 1672,
          height: 941,
          alt: "Axiom Foundry — awaken the Ark and restore humanity.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-cold-wake.png"],
    },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: {
      capable: true,
      title: "Axiom Foundry",
      statusBarStyle: "black-translucent",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Older iOS Safari versions specifically look for this exact legacy
          name; vinext's appleWebApp metadata field covers the modern tags
          but not this one, so it's authored directly rather than duplicated. */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <body>{children}</body>
    </html>
  );
}
