# IMPLEMENTATION REPORT

Дата: 2026-09-04. Окружение: Windows, PowerShell, Node.js 24.14.0, npm 11.9.0.

## Что реализовано

Три независимых локальных Git repository на main: terminal-demo, gateway-demo, docs-portal.
В каждом создан начальный commit. Origin не настроен; внешних GitHub-записей и публикаций не выполнялось.

- 11 демонстрационных страниц на русском: Terminal — 4, Gateway — 4, общие — 3.
- Централизованный sources.yml, проверка структуры, уникальности id и отсутствия перекрытия targetPath.
- Локальные источники через LOCAL_<ID>_PATH и shallow clone main для GitHub.
- Отказ при недоступном обязательном источнике; staging перед заменой готового дерева.
- Symlink не копируются. В CI требуется commit SHA и чистый docsPath.
- generated-docs не коммитится; отслеживается только .gitkeep.
- Manifest сборки: SHA, dirty, время, хеши файлов и дерева.
- Manifest происхождения: project, repository, sourcePath, sourceCommit и SHA-256.
- Docusaurus 3.10.2 / React / TypeScript, автоматический sidebar, страницы источников, форма создания и редактор.
- Frontend получает список проектов из manifest/API, не принимает произвольный repository URL.
- Безопасный Markdown preview без выполнения raw HTML.
- Fastify / Octokit / Zod: GET projects, GET documents, POST create, PUT edit, health.
- Whitelist проектов, slug/section/path validation, пределы UTF-8 размера и длины title, strict input schemas.
- Отдельные ветки, commit, PR в main. Повторная защита от прямой записи в main в GitHub adapter.
- Edit проверяет blob SHA, сохраняет frontmatter и обнаруживает обновление main во время отправки.
- Credential provider отделён для последующего GitHub App; auth middleware выделен с TODO.
- CORS настраивается. Технические логи не содержат токенов, тел документов и Octokit request headers.
- Notifications по docs/** push main, repository_dispatch, ручной запуск, центральный build и reusable deploy Pages.
- Подробные README.md, DEVELOPMENT.md, ARCHITECTURE.md с Mermaid, DEPENDENCY_AUDIT.md.
- Оба lockfile сохранены. CI использует npm ci.

## Что реально проверено

| Проверка | Результат |
| --- | --- |
| Установка frontend и backend dependencies | PASS |
| Portal lint | PASS |
| Portal typecheck | PASS |
| Portal tests | PASS, 3/3 |
| Portal docs:validate | PASS |
| Portal docs:collect, docs:manifest | PASS, все 3 источника |
| Docusaurus production build | PASS |
| verify:site | PASS |
| Backend lint | PASS |
| Backend typecheck | PASS |
| Backend tests | PASS, 17/17 |
| Backend TypeScript build | PASS |
| Backend production process | PASS, /health HTTP 200 |
| GET /api/projects реального локального API | PASS, 3 проекта и разделы |
| POST /api/documents без токена | PASS, HTTP 503 GITHUB_NOT_CONFIGURED |
| Docusaurus dev start | PASS, клиент скомпилирован |
| Dev HTTP routes с Accept: text/html | PASS, 6 маршрутов |
| Static serve HTTP routes | PASS, 6 маршрутов + 2 JSON manifest |
| YAML всех 4 workflow | PASS, parse + базовая структура |
| Проверка Git ignore | PASS, .env, generated pages и manifests игнорируются |
| Отсутствие токена в build | PASS, сборка с контрольным GITHUB_TOKEN=POC_TOKEN_DO_NOT_BUNDLE; маркер отсутствует во всех JS/HTML/JSON/CSS |
| Автоматическое UI clicking / visual regression | Не выполнялось |

Проверенные маршруты: корень, create-document, edit-document, Terminal/payments, Gateway/rcps, common.
Production output проверен чтением HTML и manifest и HTTP-запросами к docusaurus serve.
Это подтверждает сборку/маршруты; реальный browser-to-GitHub submit без credentials не проверялся.

### Тесты backend

1. Допустимые и недопустимые slug.
2. Section/path traversal, абсолютные и Windows-пути, кодированные пути.
3. Формирование пути внутри docsPath.
4. Поиск projectId и запрет repository injection.
5. Уникальность и формат ветки.
6. Вычисление разделов по Markdown-файлам.
7. YAML frontmatter, отсутствие дублирования H1, отказ от пользовательского frontmatter.
8. Ограничения title и размера UTF-8.
9. Последовательность create branch → commit → PR.
10. Отказ до мутаций при существующем файле.
11. Отказ при неизвестном разделе.
12. Edit с сохранением метаданных и SHA.
13. Конфликт stale editor.
14. Изменение main во время отправки.
15. Сообщения ошибок branch/commit/PR.
16. Прямой запрет main на уровне GitHub adapter.
17. HTTP contract, validation, body limit, CORS.

GitHubPort подменяется in-memory тестовой реализацией. Тесты проверяют архитектурную последовательность, но не доказывают доступность реального GitHub API или права PAT.

### Тесты сборщика

Временный настоящий Git repository создаётся в тесте. Проверяются SHA и provenance, отказ от dirty в CI, маркировка dirty локально и сохранение предыдущего полного результата при недоступном источнике.
Отдельно проверяются manifest и небезопасные пути.

## Какие команды запускались

В docs-portal:

```text
npm install
npm install @docusaurus/core@3.10.2 @docusaurus/preset-classic@3.10.2
  @docusaurus/module-type-aliases@3.10.2 @docusaurus/tsconfig@3.10.2
  @docusaurus/types@3.10.2 --save-exact
npm audit
npm audit fix
npm install
npm run docs:validate
npm run docs:collect
npm run docs:manifest
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:site
npm run start -- --no-open
npm run serve -- --port 3001 --no-open
```

В server:

```text
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Также: git init/add/commit/status/check-ignore/ls-files, парсинг YAML через yaml, Invoke-WebRequest/Invoke-RestMethod для HTTP проверок.
npm ci указан в CI, но чистая повторная установка через npm ci локально отдельно не выполнялась; локально выполнен npm install с сохранёнными lockfile.

## Ошибки, найденные и исправленные

- Слишком ранняя первая проверка до окончания npm install: повторена после завершения установки.
- Неподключённые type declarations темы Docusaurus: добавлены в tsconfig.
- Lint control-regex: заменён явной проверкой кодов символов.
- Тест ошибочно требовал один тип YAML-кавычек: теперь проверяет значение через YAML parse.
- Webpack 5.110 / webpackbar 6: override webpackbar 7.
- require.resolveWeak при SSG: убран type: module из package портала. Скрипты остаются .mjs, backend — ESM.
- JSON manifest через Docusaurus Link получал лишний завершающий slash: заменён обычным anchor с useBaseUrl.
- Dev history fallback требует HTML Accept header; HTTP-проверка приведена к запросу браузера. Production URLs проверены отдельно без этого условия.
- Допуск размера исходного файла API включает генерируемый frontmatter; лимит Markdown body остаётся 100 KB.

Все перечисленные ошибки устранены в итоговом коде. Проверки не отключались ради успешной сборки; onBrokenLinks остаётся throw.

## Что требует GitHub credentials

**NOT VERIFIED: requires GitHub token**

- Реальные shallow clone приватных/удалённых проектных repositories.
- Реальные create branch, create/update file, commit и Pull Request.
- Реальный edit conflict при изменении файла в GitHub.
- Межрепозиторный repository_dispatch.
- Запуск Actions на GitHub и настройка environment permissions.
- Deployment в GitHub Pages.
- Цикл review → merge → notify → rebuild → опубликованная новая страница.

Работающие backend методы реализованы через официальный Octokit REST API. Никакие фиктивные PR не показываются обычному пользователю без токена.

## Секреты и настройки вручную

- terminal-demo: secret DOCS_PORTAL_TOKEN; variable DOCS_PORTAL_REPOSITORY=OWNER/docs-portal.
- gateway-demo: такие же secret/variable.
- docs-portal: необязательный DOCS_READ_TOKEN для private sources; variable DOCS_API_URL для внешнего HTTPS API.
- backend .env: GITHUB_TOKEN, GITHUB_OWNER, CORS_ORIGINS; по необходимости HOST/PORT.
- Backend PAT: Contents read/write + Pull requests read/write на выбранных repositories.
- Dispatch PAT: Contents read/write только docs-portal.
- Reader PAT: Contents read на private источниках.
- Создать пустые GitHub repositories, настроить origin и push main.
- Включить Actions и Pages Source = GitHub Actions.
- Настроить main protection/review и доступ к github-pages environment.
- Для публичного использования сначала добавить auth, HTTPS и права пользователей в backend.

Пошаговая инструкция, команды и сценарии A–D приведены в README.md портала.

## Ограничения

1. Нет пользовательской auth и persistent idempotency. Backend по умолчанию слушает loopback; CORS не заменяет auth.
2. После ошибки commit/PR может остаться docs-ветка. Её имя логируется; автоматического удаления нет.
3. Повторный submit до merge может создать второй PR.
4. GitHub не предоставляет транзакцию между чтением main и созданием ветки. Последняя гонка разрешается review/merge и branch protection; main никогда не перезаписывается API.
5. MDX — доверенный исполняемый источник сборки. Веб-редактор поддерживает .md; для .mdx используется GitHub.
6. Межпроектные относительные ссылки не переписываются автоматически.
7. Сборка отражает SHA каждого проекта на момент его клонирования, не глобальный атомарный снимок.
8. Локальные dirty документы не воспроизводимы только по SHA; manifest явно содержит dirty и хеши.
9. npm audit портала: 17 high записей, связанных с image-size и зависимыми пакетами; исправления upstream нет. Backend: 0. Подробности в DEPENDENCY_AUDIT.md.
10. Нет браузерных end-to-end тестов с реальным GitHub и production backend hosting.

## Архитектурные уточнения

- Common также проходит через агрегатор. Docusaurus читает одно итоговое дерево; это сохраняет разделение источников и упрощает provenance.
- Использован GitHub Pages, как задано, а не стандартный hosting-шаблон Sites.
- Ветка содержит timestamp и короткий random suffix, чтобы избежать коллизий.
- Исходные Markdown-файлы при копировании не изменяются; metadata хранится в отдельном индексе.
- Build workflow дополнительно запускается на pull_request для проверки портала, но не публикует PR-сборки.

## Следующий шаг

Создать три GitHub repositories, настроить PAT/secrets по README, запустить workflow вручную и пройти сценарии создания/редактирования PR и merge. Для внешнего API затем реализовать auth middleware и HTTPS deployment.

## Итоговое дерево

Полное дерево исходных файлов находится в FILE_TREE.md рядом с этим отчётом.
node_modules, .git internals, .env и воспроизводимые build/cache каталоги в дерево не включены.

