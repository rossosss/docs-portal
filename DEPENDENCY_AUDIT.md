# Dependency audit — 2026-09-04

Проверены `npm audit` обоих packages.

- API: 0 vulnerabilities после npm install.
- Портал: 17 high, 0 moderate, 0 critical в итоговом npm audit.
- Все оставшиеся записи относятся к `image-size` и зависимым пакетам Docusaurus. Это не 17 независимых уязвимостей: npm также помечает родительские зависимости.
- Для установленного image-size 2.0.2 npm сообщает No fix available.

Известные проблемы image-size:

- [ICNS parser: infinite loop](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr)
- [JXL / HEIF parsers: infinite loops](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq)

Риск относится к обработке специально подготовленных изображений сборщиком. Подключайте доверенные repositories, проверяйте Markdown/MDX и assets при review, ограничивайте время CI. Не считайте этот PoC готовым к приёму произвольных недоверенных источников.

Применены явно зафиксированные overrides:

- webpackbar 7.0.0 — совместимость с текущим Webpack ProgressPlugin;
- serialize-javascript 7.1.1 — исправления известных advisories;
- qs 6.16.0 — исправления parser DoS;
- uuid 11.1.1 — исправление bounds check.

Docusaurus обновлён с 3.9.2 до 3.10.2.
После overrides повторно выполняются production build и проверки. Они сохранены в package.json и package-lock.json.
После появления исправлений upstream следует пересмотреть overrides и повторить build/test/audit.

