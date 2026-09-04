# Полное дерево исходных файлов

Не показаны .git, node_modules, .env, build, dist, .docusaurus и временные manifest/cache. В generated-docs отслеживается только .gitkeep.

```text
workspace/
├── docs-portal/
│   ├── .github/
│   │   └── workflows/
│   │       ├── build-docs.yml
│   │       └── deploy-pages.yml
│   ├── docs/
│   │   └── common/
│   │       ├── architecture.md
│   │       ├── index.md
│   │       └── payment-flow.md
│   ├── generated-docs/
│   │   └── .gitkeep
│   ├── scripts/
│   │   ├── collect-docs.mjs
│   │   ├── collector.test.mjs
│   │   ├── generate-build-manifest.mjs
│   │   ├── sources.d.mts
│   │   ├── sources.mjs
│   │   ├── sources.test.mjs
│   │   ├── validate-sources.mjs
│   │   └── verify-site.mjs
│   ├── server/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── documents.ts
│   │   │   │   └── projects.ts
│   │   │   ├── services/
│   │   │   │   ├── document.service.ts
│   │   │   │   ├── github.service.ts
│   │   │   │   └── path.service.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── validation/
│   │   │   │   └── document.schema.ts
│   │   │   ├── app.ts
│   │   │   ├── auth.ts
│   │   │   ├── config.ts
│   │   │   └── index.ts
│   │   ├── test/
│   │   │   └── documents.test.ts
│   │   ├── eslint.config.mjs
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── DocumentForm/
│   │   │   │   └── index.tsx
│   │   │   ├── MarkdownEditor/
│   │   │   │   └── index.tsx
│   │   │   ├── MarkdownPreview/
│   │   │   │   └── index.tsx
│   │   │   └── ProjectSelector/
│   │   │       └── index.tsx
│   │   ├── css/
│   │   │   └── custom.css
│   │   ├── pages/
│   │   │   ├── create-document.tsx
│   │   │   ├── edit-document.tsx
│   │   │   └── index.tsx
│   │   ├── services/
│   │   │   └── docsApi.ts
│   │   ├── theme/
│   │   │   └── DocItem/
│   │   │       └── Content/
│   │   │           └── index.tsx
│   │   └── types.d.ts
│   ├── static/
│   ├── .env.example
│   ├── .gitattributes
│   ├── .gitignore
│   ├── ARCHITECTURE.md
│   ├── DEPENDENCY_AUDIT.md
│   ├── DEVELOPMENT.md
│   ├── docusaurus.config.ts
│   ├── eslint.config.mjs
│   ├── FILE_TREE.md
│   ├── IMPLEMENTATION_REPORT.md
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   ├── sidebars.ts
│   ├── sources.yml
│   └── tsconfig.json
├── gateway-demo/
│   ├── .github/
│   │   └── workflows/
│   │       └── notify-docs.yml
│   ├── docs/
│   │   ├── images/
│   │   │   └── .gitkeep
│   │   ├── integrations/
│   │   │   └── overview.md
│   │   ├── architecture.md
│   │   ├── index.md
│   │   └── rcps.md
│   ├── src/
│   │   └── README.md
│   ├── .gitattributes
│   ├── .gitignore
│   └── README.md
├── terminal-demo/
│   ├── .github/
│   │   └── workflows/
│   │       └── notify-docs.yml
│   ├── docs/
│   │   ├── identification/
│   │   │   └── overview.md
│   │   ├── images/
│   │   │   └── .gitkeep
│   │   ├── architecture.md
│   │   ├── index.md
│   │   └── payments.md
│   ├── src/
│   │   └── README.md
│   ├── .gitattributes
│   ├── .gitignore
│   └── README.md
├── FILE_TREE.md
├── IMPLEMENTATION_REPORT.md
└── README.md
```
