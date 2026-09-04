# Docs Portal — GitHub Pages + GitHub Actions

Рабочий режим **без отдельного backend-сервера и без личного PAT**.

Портал: https://rossosss.github.io/docs-portal/

Репозитории: [terminal-demo](https://github.com/rossosss/terminal-demo), [gateway-demo](https://github.com/rossosss/gateway-demo), [docs-portal](https://github.com/rossosss/docs-portal).

## Как это работает

```text
docs в трёх repositories -> временный сборщик -> Docusaurus -> GitHub Pages

Форма -> подтверждение Issue в GitHub -> GitHub Action
      -> отдельная ветка -> commit -> Pull Request -> review / merge
```

GitHub выполняет аутентификацию пользователя и выдаёт краткоживущий GITHUB_TOKEN конкретному workflow конкретного repository.
Токена нет в браузере, локальном конфиге или отдельном хостинге.
GitHub Actions здесь выполняет операцию записи; постоянно работающий HTTP API не используется.

## Создать документ

1. Откройте /create-document на портале.
2. Выберите проект и раздел, введите название, slug и Markdown без frontmatter.
3. Нажмите «Подготовить Pull Request».
4. Нажмите «Открыть запрос в GitHub».
5. Войдите как владелец repository и подтвердите Issue кнопкой Create / Submit new issue.
6. Workflow Create documentation PR создаст ветку docs/add-..., commit и PR в main.
7. Ссылка на PR появится в комментарии к Issue.
8. Проверьте изменения и выполните merge. Сам workflow никогда не изменяет main и не выполняет merge.
9. После сборки новый документ появится на портале.

Для небольшого текста Issue уже заполнен ссылкой. Если URL превышает 6000 символов, портал предлагает явно скопировать подготовленный запрос и вставить его в описание Issue. Это обходит ограничение длины URL без загрузки файлов на сторонние сервисы.

Запрос обрабатывается только от владельца repository (author_association=OWNER). Остальным пользователям Action отвечает отказом.
Issue должен сохранять сформированный формат. Нельзя менять projectId на чужой repository.
Ошибки валидации, конфликты и ошибки GitHub публикуются комментарием к Issue; stack trace и токены не публикуются.

## Редактировать

На странице нажмите «Редактировать». Статический редактор прочитает актуальный .md из публичного GitHub API и запомнит blob SHA.
При подготовке запроса SHA проверяется повторно. Action ещё раз сравнит expectedSha с main.
При конфликте работа останавливается: «Документ изменился после открытия редактора. Обновите страницу и повторите изменения».
Существующий frontmatter сохраняется; title и sidebar_label обновляются.
Для .mdx ссылка ведёт в GitHub: произвольный MDX не обрабатывается веб-формой.

## Ветки и защита записи

Все файлы создаются в docs/add-* или docs/edit-*.
В GitHub adapter есть дополнительный запрет записи в другую ветку.
Workflow проверяет projectId по sources.yml и совпадение owner/repository с GITHUB_REPOSITORY.
Issue выполняется в целевом repository; встроенный токен не имеет доступа на запись к другим repositories.
Повторно запущенный Issue не создаёт второй PR, если PR с его служебным маркером уже существует.
При сбое до создания PR может остаться незавершённая docs-ветка.

## Где хранятся документы

- terminal-demo/docs — Terminal.
- gateway-demo/docs — Gateway.
- docs-portal/docs/common — общая документация.

sources.yml — единственный список проектов.
generated-docs и manifest-файлы создаются на время сборки и не коммитятся.
Сборщик использует shallow clone main, либо LOCAL_<ID>_PATH.
Общие документы берутся из текущего checkout.
Все источники обязательны: неполный портал не публикуется.
Sidebar строится автоматически, относительная структура и изображения сохраняются.

build-manifest.json фиксирует SHA каждого источника, dirty, хеши файлов и дерева.
source-manifest.json сопоставляет страницы с project/repository/path/commit.
На страницах показываются происхождение и версия.
При локальной незакоммиченной документации dirty=true; CI требует чистые docs и точный SHA.

## Автоматическая синхронизация без PAT

Центральный workflow:
- запускается на push main самого портала, repository_dispatch и вручную;
- раз в 15 минут сравнивает опубликованные SHA с main источников;
- если SHA не изменились, сборка и deploy пропускаются;
- если изменился хотя бы один источник, собирает и публикует портал.

Расписание GitHub может запускаться с задержкой. Для немедленного обновления нажмите Run workflow в Build documentation.
Сравнивается repository HEAD, поэтому в режиме расписания изменение только кода может вызвать пересборку; проектный push workflow по-прежнему фильтрует docs/**.

Необязательная мгновенная синхронизация: добавьте в terminal-demo/gateway-demo secret DOCS_PORTAL_TOKEN с Contents: write только для docs-portal и variable DOCS_PORTAL_REPOSITORY=rossosss/docs-portal. Тогда docs push отправит repository_dispatch. Без этого секрета notify job успешно сообщает о плановой синхронизации.
Личный сохранённый токен Git Credential Manager в Actions не копировался.

## Локальный запуск

Node.js 22+, npm, Git. Три каталога должны находиться рядом.

```bash
cd docs-portal
npm ci
# Copy .env.example to .env (PowerShell: Copy-Item .env.example .env)
npm run docs:collect
npm run start
```

Адрес: http://localhost:3000/docs-portal/ .
Повторяйте docs:collect после изменения исходников.
Форма создания работает без запуска server. Для чтения существующего документа нужен доступ к публичному GitHub.
Локальные изменения docs не попадут в GitHub при публикации Issue автоматически: редактирование читает main.

```dotenv
LOCAL_TERMINAL_PATH=../terminal-demo
LOCAL_GATEWAY_PATH=../gateway-demo
LOCAL_COMMON_PATH=.
GITHUB_OWNER=rossosss
```

GITHUB_TOKEN и DOCS_API_URL для текущего режима не нужны.
В каталоге server сохранены общие validation/GitHub/document services и первоначальный необязательный Fastify adapter.
Action устанавливает зависимости этого пакета и запускает одноразовый issue-request.ts; Fastify не запускается и порт не открывается.
Описание старого HTTP API находится в server/LEGACY_API.md.

## Настройки GitHub

Для каждого из трёх repositories:
- включены Issues и GitHub Actions;
- Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests включено;
- по умолчанию GITHUB_TOKEN read-only; только document-request job запрашивает contents/write, pull-requests/write, issues/write;
- workflow сам не одобряет PR, несмотря на объединённое название настройки GitHub.

Для docs-portal:
- Settings → Pages → Source: GitHub Actions;
- build-docs.yml и reusable deploy-pages.yml;
- сайт https://rossosss.github.io/docs-portal/.

Для текущих public repositories **GitHub Secrets не обязательны**.
DOCS_PORTAL_TOKEN необязателен для мгновенного dispatch.
DOCS_READ_TOKEN нужен только для чтения private источников в сборщике; при private источниках статический read editor потребует другого способа чтения — текущий режим рассчитан на public demo.

Для новых repositories добавьте sources.yml entry и document-request.yml со ссылкой на общую action в docs-portal. Выдайте Actions право создавать PR.
Сначала отправьте обновлённый manifest в центральный repository.
Для переноса на другого owner обновите sources.yml, GITHUB_OWNER и uses: ссылки на shared action в трёх workflows.

## Ограничения ввода и доверия

- Slug: a-z, 0-9, одиночные дефисы, до 80 символов.
- Title: 1–160 символов без управляющих символов.
- Markdown body: до 100000 байт UTF-8.
- Сериализованный Issue request: до 60000 символов.
- Section — существующий раздел с .md; path traversal, абсолютные/кодированные пути и repository injection запрещены.
- Backend/Action формирует frontmatter через YAML serializer и не вставляет H1. Введённый H1 сохраняется, при отсутствии Docusaurus отображает title.
- Preview не выполняет HTML. MDX источники должны проходить review как код.
- У неавторизованного GitHub API есть rate limit; редактор сообщает о его достижении.
- Между последней проверкой main и созданием ветки возможна гонка; все изменения всё равно остаются в PR для review/merge.
- PR, созданные GITHUB_TOKEN, могут требовать ручного разрешения запуска проверок в GitHub. Никакой PAT для обхода этого механизма не используется.

## Проверки

```bash
npm run lint
npm run typecheck
npm test
npm run docs:collect
npm run build
npm run verify:site
cd server
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Тестируются сборщик, paths/slug, branches, SHA conflicts, Issue parser, author/repository checks и статическая подготовка запросов.
Конкретные результаты deployment — в GITHUB_DEPLOYMENT.md.
Первый локальный отчёт IMPLEMENTATION_REPORT.md сохранён как история первоначального PoC.
Оставшиеся upstream image-size advisories описаны в DEPENDENCY_AUDIT.md.

Официальная документация: [Issue query parameters](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue), [GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token).
