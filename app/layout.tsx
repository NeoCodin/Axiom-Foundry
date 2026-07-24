import type { Metadata } from "next";
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
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
