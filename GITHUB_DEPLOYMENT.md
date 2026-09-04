# GitHub deployment report

Дата: 2026-09-04. Owner: rossosss.

## Публичные адреса

- Portal: https://rossosss.github.io/docs-portal/
- Portal source: https://github.com/rossosss/docs-portal
- Terminal: https://github.com/rossosss/terminal-demo
- Gateway: https://github.com/rossosss/gateway-demo

## Выполнено

Три public repositories созданы через GitHub API и локальные main отправлены в соответствующие origin.
GitHub Pages включён для docs-portal с build_type=workflow.
В трёх repositories разрешено создание Pull Request встроенным GITHUB_TOKEN.
Default workflow permission оставлен read. Повышенные contents/write, issues/write и pull-requests/write заданы только для document-request job.
В terminal-demo и gateway-demo задана Actions variable DOCS_PORTAL_REPOSITORY=rossosss/docs-portal.

Личный OAuth token из Git Credential Manager использовался локально для создания repositories, настроек, Issues и merge проверочных PR.
Он не скопирован в repository, frontend bundle, Actions variables или Actions secrets.
Для текущих public repositories secrets не нужны.

## Реальный end-to-end тест

Создание:
- Issue: https://github.com/rossosss/terminal-demo/issues/1
- GitHub Actions run: https://github.com/rossosss/terminal-demo/actions/runs/33898927533 — success
- PR: https://github.com/rossosss/terminal-demo/pull/2
- Branch: docs/add-portal-workflow-1788541695182-536114bb
- Base: main
- Файл: docs/portal-workflow.md
- PR создан github-actions[bot], проверен и merged владельцем.

Редактирование:
- Issue: https://github.com/rossosss/terminal-demo/issues/3
- GitHub Actions run: https://github.com/rossosss/terminal-demo/actions/runs/33899101148 — success
- PR: https://github.com/rossosss/terminal-demo/pull/4
- Branch: docs/edit-portal-workflow-1788541812655-47030f9a
- Base: main
- Изменён только docs/portal-workflow.md.
- Существующий frontmatter сохранён, добавлен раздел «Редактирование».
- PR проверен и merged владельцем.

Перед каждым merge проверялись file list/patch, head SHA и base. Workflow не записывал в main.
Main изменялся только отдельной операцией squash merge после проверки.
Комментарии к Issues содержат URL PR, путь и ветку.

## Синхронизация и Pages

Notify docs portal после перехода на fallback завершился success без PAT.
Build documentation run 33898877260 завершился success.
До включения Pages первая сборка успешно собрала artifact, но deploy получил ожидаемый 404. Pages был включён через API; повторная сборка прошла.
Portal и JSON manifests проверены HTTP 200.

Финальная сборка должна фиксировать:
- terminal: e5f46da49ec35e70c9db7e09f3161623d2ef08af или более новый main;
- gateway: 446decc6afd3f360e85569c8071efbf35cfa478f или более новый main;
- common: commit этого deployment report.

## Проверки итоговой реализации

- Portal lint: pass.
- Portal typecheck: pass.
- Portal production build: pass.
- Portal verify:site: pass.
- Aggregator tests: 3/3 pass.
- Shared services / Fastify / Action / static-form tests: 25/25 pass.
- Server TypeScript build: pass.
- Workflow YAML parse: pass.
- GitHub Action create document: success.
- GitHub Action edit document: success.
- GitHub Pages: HTTP 200.
- Legacy local API остановлен и в опубликованном frontend не используется.

## Ограничения

GitHub scheduled workflows могут запускаться с задержкой. Ручной workflow_dispatch остаётся самым быстрым способом пересобрать портал без PAT.
GitHub не гарантирует, что PR, созданный GITHUB_TOKEN, автоматически запустит все pull_request checks: GitHub может потребовать Approve workflows.
Форма рассчитана на владельца public demo repositories. Частный контент нельзя читать из статического браузера без отдельной архитектуры аутентификации.
Issue является промежуточной записью с Markdown body; для этого PoC это осознанная замена отдельному HTTP backend.

