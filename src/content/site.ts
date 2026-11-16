/* Данные о студии. Сюда попадает только подтверждённое.
   Пустые поля (null) не выводятся на сайте. */
export const site = {
  name: "Бюро",
  legalName: null as string | null,
  url: process.env.NEXT_PUBLIC_SITE_URL ?? null,
  contacts: {
    instagram: { handle: "@byuro_design.studio", url: "https://www.instagram.com/byuro_design.studio/" },
    telegram: null as { handle: string; url: string } | null,
    email: null as string | null,
    phone: null as string | null,
  },
} as const;
