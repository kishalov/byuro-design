import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Бюро — дизайн и разработка",
    short_name: "Бюро",
    description: "Byuro — design & development studio: branding, websites, apps, chatbots and creatives in one team.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F1ECE2",
    theme_color: "#121212",
    categories: ["design", "business"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
