# Шрифты для PDF коммерческого предложения

Используются только на сервере в `/api/quote-pdf` (в браузер не загружаются).

| Файл | Шрифт | Для чего |
|---|---|---|
| Unbounded-Bold.ttf | Unbounded | заголовки (латиница, кириллица) |
| Onest-Regular / SemiBold.ttf | Onest | основной текст |
| NotoSansDevanagari-*.ttf | Noto Sans Devanagari | хинди |
| NotoSansSC-*.ttf | Noto Sans SC | китайский (GB2312) |
| NotoSansJP-*.ttf | Noto Sans JP | японский (JIS X 0208) |

Все шрифты распространяются по SIL Open Font License 1.1 (текст лицензии — `OFL.txt`;
авторы: The Unbounded Project Authors, The Onest Project Authors, Google LLC / Adobe — Noto).
Файлы подготовлены скриптом `scripts/pdf-fonts.py` из исходников github.com/google/fonts.
