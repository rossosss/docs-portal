# Docs Portal — распределённая документация

Полноценный локальный PoC: документация хранится в независимых проектах, собирается в Docusaurus, а изменения из веб-форм проходят через отдельную ветку и Pull Request.

## Что реализовано

```text
terminal-demo/docs ────┐
gateway-demo/docs ────┼─> aggregator -> generated-docs -> Docusaurus -> GitHub Pages
docs-portal/docs/common┘
```

- Единственный список проектов — `sources.yml`.
- Shallow clone в CI, локальные каталоги через переменные окружения.
- Все источники обязательны; ошибка любого источника блокирует сборку и deploy.
- Временное дерево, автоматические sidebar, относительные картинки и ссылки внутри проекта.
- `build-manifest.json` с commit SHA, признаком dirty, хешами каждого файла и всего дерева.
- `source-manifest.json` с происхождением каждой Markdown/MDX страницы.
- На страницах: источник, версия, GitHub-ссылка и переход в редактор.
- Создание и редактирование Markdown через Fastify / Octokit / Zod.
- Отдельные ветки и PR в main; API не пишет непосредственно в main.
- При редактировании сохраняются существующие метаданные, проверяется blob SHA.
- GET /api/projects работает локально без PAT; операции с GitHub требуют PAT.
- Обновления docs в проектах отправляют repository_dispatch в портал.
- Deploy вызывается только после успешных проверок и сборки.

## Требования

Node.js 22+ (локально проверено с Node.js 24), npm, Git.
Windows PowerShell, Linux и macOS поддерживаются. Нужен доступ к npm для установки.
Backend читает общий manifest и поэтому запускается вместе с checkout всего docs-portal, а не из отдельно скопированного server/dist.

## Локальный запуск

Расположите каталоги рядом:

```text
workspace/
  terminal-demo/
  gateway-demo/
  docs-portal/
```

Если репозитории уже опубликованы:

```bash
git clone https://github.com/OWNER/terminal-demo.git
git clone https://github.com/OWNER/gateway-demo.git
git clone https://github.com/OWNER/docs-portal.git
cd docs-portal
npm ci
```

Скопируйте `.env.example` в `.env`:

```powershell
Copy-Item .env.example .env
```

На Linux/macOS: `cp .env.example .env`.
В поставленном локальном PoC `.env` уже создан без секретов.

```dotenv
LOCAL_TERMINAL_PATH=../terminal-demo
LOCAL_GATEWAY_PATH=../gateway-demo
LOCAL_COMMON_PATH=.
GITHUB_OWNER=YOUR_GITHUB_USERNAME
GITHUB_TOKEN=
DOCS_API_URL=http://127.0.0.1:4000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Затем:

```bash
npm run docs:validate
npm run docs:collect
npm run start
```

Откройте http://localhost:3000/docs-portal/ .
Формы: /docs-portal/create-document/ и /docs-portal/edit-document/?project=terminal&path=docs/payments.md.

В другом терминале:

```bash
cd docs-portal/server
npm ci
npm run dev
```

API: http://127.0.0.1:4000/health и http://127.0.0.1:4000/api/projects .
`server` читает `.env` из корня docs-portal. Отдельный server/.env не нужен.
После изменения источников повторите `npm run docs:collect`: сборщик не следит за файлами автоматически.
Production-проверка сайта: `npm run build`, затем `npm run serve`.
Production-запуск API: `npm run build` и `npm start` в server.

### Без GitHub credentials

Чтение портала, агрегация, предпросмотр, список проектов, тесты и сборки доступны без токена.
Создание/редактирование реальных файлов не подменяется фиктивным успехом: API вернёт понятную ошибку отсутствия токена.
Unit/integration tests используют внедряемый GitHubPort и проверяют последовательность операций без внешних записей.

## Конфигурация проектов

`sources.yml` содержит id, name, owner, repository, branch, docsPath и targetPath.
Owner `YOUR_GITHUB_USERNAME` заменяется на `GITHUB_OWNER`; конкретный owner в YAML сохраняется — можно подключать проекты разных владельцев.
Для PoC branch обязан быть main, чтобы читаемая и редактируемая ветки не расходились.

Подключение четвёртого проекта:

1. Добавить запись в sources.yml с уникальными id и targetPath.
2. Создать docs в проекте и перенести туда notify-docs.yml.
3. При локальной разработке задать `LOCAL_<ID>_PATH`; id переводится в верхний регистр, дефис заменяется на подчёркивание.
4. Для private repository выдать соответствующие разрешения токенам.
5. Запустить docs:validate, docs:collect и build.

Никаких новых React-компонентов или хардкода списка страниц не требуется.
Разделы формы выводятся из директорий, содержащих .md документы. Для нового раздела сначала добавьте overview.md через обычный PR.
Корень документации всегда доступен. Папки только с картинками не считаются разделами.
Центральный repository docs-portal по умолчанию берётся из текущего checkout; внешние источники без LOCAL-переменной клонируются из GitHub.

## Как создать три GitHub repository

1. В GitHub создайте пустые terminal-demo, gateway-demo и docs-portal.
2. Не добавляйте автоматически README, license или .gitignore: они уже есть локально.
3. В каждом соответствующем каталоге, если он ещё не Git repository:

```bash
git init -b main
git add .
git commit -m "Initial distributed documentation PoC"
```

В подготовленном PoC локальные репозитории могут быть уже инициализированы. Проверьте `git status` и `git log -1`; повторный init/initial commit не требуется.

4. Для каждого проекта задайте собственный origin и отправьте main:

```bash
git remote add origin https://github.com/OWNER/terminal-demo.git
git push -u origin main
```

Повторите с gateway-demo и docs-portal из их каталогов.
Не отправляйте внешний workspace как монорепозиторий: каждый из трёх каталогов имеет отдельный origin.
5. Укажите owner через переменную окружения локально. CI использует github.repository_owner, если в YAML оставлен placeholder.
6. Включите Actions в каждом репозитории.
7. В docs-portal: Settings → Pages → Build and deployment → Source: GitHub Actions.
8. Рекомендуется защитить main ruleset: изменения только через PR, review и успешные checks. Сам API не требует права bypass.
9. Если используются private repositories, убедитесь, что тариф и политика организации разрешают требуемую публикацию Pages. Публикуемый статический сайт включает содержимое документации и manifest — его аудитория определяется настройками Pages.

## Токены и секреты

Fine-grained PAT создаётся в GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens.
Выберите правильный resource owner, ограниченный срок действия и только нужные repositories.
Для организации может потребоваться одобрение токена администратором.

| Где | Имя | Назначение и минимальные разрешения |
| --- | --- | --- |
| backend .env | GITHUB_TOKEN | Выбранные три repositories; Contents: read/write, Pull requests: read/write; Metadata: read |
| terminal-demo Actions secret | DOCS_PORTAL_TOKEN | Только docs-portal; Contents: read/write для repository_dispatch |
| gateway-demo Actions secret | DOCS_PORTAL_TOKEN | Только docs-portal; Contents: read/write |
| docs-portal Actions secret | DOCS_READ_TOKEN | Необязательно для public sources; Contents: read для всех private источников |
| docs-portal Actions | встроенный GITHUB_TOKEN | Выдаётся GitHub автоматически; не создавайте его вручную |

Variables, не secrets:

| Repository / окружение | Variable | Пример |
| --- | --- | --- |
| terminal-demo и gateway-demo | DOCS_PORTAL_REPOSITORY | OWNER/docs-portal |
| docs-portal | DOCS_API_URL | https://docs-api.example.org |
| docs-portal | SITE_URL | Необязательно; https://OWNER.github.io |
| локальный .env | GITHUB_OWNER | Ваш GitHub owner |
| backend .env | CORS_ORIGINS | https://OWNER.github.io |
| backend .env | HOST / PORT | 127.0.0.1 / 4000 |

Для dispatch недостаточно обычного GITHUB_TOKEN исходного проекта: он ограничен этим repository. Нужен межрепозиторный PAT или GitHub App.
Actions permissions для PAT не нужны: отправляется repository_dispatch через REST API, а не workflow_dispatch.
Не передавайте PAT через DOCS_API_URL или какие-либо frontend variables.
Frontend config экспортирует только URL API и публичные сведения о проектах.

Официальные справочники: [repository_dispatch](https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event), [создание PR](https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request), [Docusaurus configuration](https://docusaurus.io/docs/configuration).

## GitHub Pages и backend

Портал настроен на https://OWNER.github.io/docs-portal/ .
`url`, `baseUrl`, `organizationName`, `projectName` конфигурируются в docusaurus.config.ts.
BASE_URL должен начинаться и заканчиваться /.
Если меняете имя repository или публикуете user-site, измените projectName, BASE_URL в workflow и ссылки в инструкции согласованно.

GitHub Pages запускает только статический сайт. Fastify API нужно запускать отдельно.
Локальный URL API — для локального портала. Для страницы на HTTPS нужен доступный HTTPS backend с разрешённым CORS origin.
CORS содержит origin без пути /docs-portal, например https://OWNER.github.io.
Переменная DOCS_API_URL встраивается при сборке: после изменения пересоберите портал.
PoC не содержит пользовательской авторизации; не открывайте этот backend в интернет до реализации auth.ts и ограничения прав пользователей. По умолчанию сервер слушает loopback.

## Как проверить автоматическое обновление

1. Изменить terminal-demo/docs/payments.md.
2. Сделать commit и push в main (в защищённом репозитории — PR и merge).
3. В terminal-demo открыть Actions и проверить Notify docs portal.
4. В docs-portal проверить запуск Build documentation по repository_dispatch.
5. Убедиться, что collect, проверки, build и deploy прошли.
6. Открыть GitHub Pages и увидеть изменение.
7. Открыть build-manifest.json и сверить SHA terminal с репозиторием.

Изменение только src/** не запускает notify. Изменение общих docs в docs-portal запускает сборку напрямую.
Dispatch payload содержит уведомляющий SHA, но сборщик берёт HEAD main каждого источника на момент клонирования.
Фактически включённые SHA сохраняются в manifest. События не считаются атомарным снимком всех repositories.
Concurrent deploy сериализован, не отменяет выполняющийся deploy. GitHub может объединять очереди — итоговый портал отражает актуальные main при следующей сборке.

## Как проверить создание документа

1. Запустить API с PAT и правильным owner.
2. Открыть /create-document, выбрать Terminal, раздел identification.
3. Название «Проверка клиента», slug client-check, Markdown без frontmatter.
4. Нажать «Отправить на проверку».
5. Открыть возвращённый PR в terminal-demo.
6. Проверить путь docs/identification/client-check.md и base main.
7. Проверить, что commit находится в docs/add-client-check-TIMESTAMP-RANDOM, main не изменился.
8. Провести review и merge.
9. Убедиться, что уведомление запустило rebuild, а новая страница появилась в sidebar.

Повторное создание существующего файла вернёт 409 «Файл уже существует».
Суффикс random добавлен к timestamp, чтобы параллельные запросы не создавали одинаковые имена веток.
При повторной отправке до merge могут появиться два PR: persistent idempotency в PoC не реализована.

## Редактирование

1. На странице документа нажать «Редактировать».
2. API прочитает файл из актуального main и вернёт content, title, blob SHA и commit.
3. Изменить текст и отправить на review.
4. Создаётся docs/edit-... с обновлением файла и отдельным PR.
5. Если файл после открытия редактора изменился в main, API вернёт 409:
   «Документ изменился после открытия редактора. Обновите страницу и повторите изменения».
6. Перед обновлением страницы сохраните несохранённый текст отдельно.

Существующие frontmatter поля сохраняются, title и sidebar_label обновляются из поля названия.
Web-редактор поддерживает .md. Исходные .mdx собираются Docusaurus, редактирование для них ведёт в GitHub.
Произвольный MDX является исполняемым кодом сборки: включайте только доверенные репозитории и проверяйте PR перед merge.

### Правило заголовков

Пользователь вводит только Markdown body, без YAML frontmatter.
Backend всегда добавляет frontmatter через YAML serializer, безопасно обрабатывающий кавычки, двоеточия и переносы.
Backend никогда не вставляет H1: уже введённый H1 сохраняется, а при его отсутствии Docusaurus показывает title.
Это исключает автоматическое дублирование H1. Preview показывает body; заголовок из frontmatter появится на странице портала.

## API

- GET /health — готовность процесса.
- GET /api/projects — id, name, sections, available; список только из sources.yml.
- POST /api/documents — projectId, section, title, slug, content.
- GET /api/documents?projectId=terminal&path=docs/payments.md — актуальный файл из GitHub.
- PUT /api/documents — projectId, path, expectedSha, title, content.

POST/PUT возвращают 201 с repository, branch, path, pullRequestNumber, pullRequestUrl.
400 — неправильные поля/пути; 404 — неизвестный проект/файл; 409 — существующий файл или конфликт; 413 — размер; 502 — ошибка GitHub; 503 — токен не настроен.
Лимит body — 128000 байт, Markdown — 100000 байт UTF-8, title — 160 символов, slug — 80.
Repository URL и неожиданные поля запрещены strict-схемой.
Raw HTML в предпросмотре не выполняется; .md строится как Markdown, не как произвольный MDX.

## Версии и generated-docs

generated-docs, .collection.json и static/*-manifest.json игнорируются Git.
В generated-docs отслеживается только пустой .gitkeep. Документация копируется на время сборки.
Общая документация тоже проходит через сборщик: единое дерево и единый формат происхождения без второго Docusaurus docs-plugin.
Docusaurus не модифицирует канонические документы.

При локальном запуске без отдельного Git repository commit=null, dirty=true. Хеши контента остаются точными.
В Git repository SHA относится к HEAD; dirty явно показывает расхождение docs с commit.
CI отказывается работать без SHA или с грязным docsPath.
Статический manifest фиксирует все исходные файлы и их SHA-256. Для воспроизведения версии checkout каждого указанного commit и запустите сборку с тем же lockfile/Node. При dirty=true для полного воспроизведения нужны сами локальные файлы, одного SHA недостаточно.

Сборщик сначала строит отдельный staging-каталог. Только после успешного получения всех источников заменяет generated-docs.
При ошибке CLI возвращает ненулевой exit code; предыдущая локальная сборка может оставаться на диске, но CI останавливается и не публикует её.

## Проверки

```bash
npm run lint
npm run typecheck
npm test
npm run docs:collect
npm run docs:manifest
npm run build
cd server
npm run lint
npm run typecheck
npm test
npm run build
```

Оба package-lock.json включены в репозитории; CI использует npm ci.
Tests проверяют пути, slug, lookup, branch names, ограничения, создание/редактирование, SHA conflict, ошибки GitHub и HTTP contract.
Результаты конкретного запуска и ограничения — в IMPLEMENTATION_REPORT.md.

## Диагностика

- Проект недоступен: проверьте owner, доступ PAT, наличие main и docsPath.
- Файл уже существует: выберите новый slug или редактируйте существующий файл.
- Не удалось создать ветку: проверьте Contents: write и правила веток.
- Не удалось создать commit: проверьте Contents: write и допустимость пути.
- Не удалось создать Pull Request: проверьте Pull requests: write и policies организации.
- API недоступен: процесс server, DOCS_API_URL, HTTPS, CORS.
- После ошибки commit/PR может остаться отдельная docs-ветка. Найдите её в серверном логе и GitHub, завершите PR вручную либо удалите после проверки. Автоматического удаления веток с возможной полезной работой нет.
- Главная ветка изменилась во время отправки: повторите запрос после проверки текста.

