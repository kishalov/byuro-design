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
  c1: { example: true },
  c2: { example: true },
  c3: { example: true },
  p1: { example: true },
  p2: { example: true },
  p3: { example: true },
};
