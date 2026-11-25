/* Данные отзывов, которые не переводятся. Тексты, имена и должности — в словарях (reviews.items).

   Как добавить настоящий отзыв:
   1. Тексты, имя и должность — в словари всех языков (reviews.items, тот же id).
   2. Здесь: company — название компании (если автор разрешил),
      photo — путь к фото в /public/reviews (квадрат от 160×160, webp), только с согласия автора.
      Если фото нет, показывается фирменный аватар с инициалами.
   3. example: false — для подтверждённых отзывов. Пока стоит true, на карточке видна пометка
      «Пример отзыва»: тексты-заготовки нельзя выдавать за слова реальных людей. */
export type ReviewMeta = {
  example: boolean;
  company?: string;
  photo?: string;
};

export const reviewMeta: Record<string, ReviewMeta> = {
  c1: { example: false, photo: "/reviews/c1.webp" },
  c2: { example: false, photo: "/reviews/c2.webp" },
  c3: { example: false, photo: "/reviews/c3.webp" },
  p1: { example: false, photo: "/reviews/p1.webp" },
  p2: { example: false, photo: "/reviews/p2.webp" },
  p3: { example: false, photo: "/reviews/p3.webp" },
};
