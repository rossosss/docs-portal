# Архитектура

## Чтение и публикация

```mermaid
flowchart TD
    T[terminal-demo/docs] --> A[Docs Aggregator]
    G[gateway-demo/docs] --> A
    C[docs-portal/docs/common] --> A
    S[sources.yml] --> A
    A --> V[generated-docs + source manifest + build manifest]
    V --> D[Docusaurus]
    D --> P[GitHub Pages]
    T -. docs push main .-> N[repository_dispatch]
    G -. docs push main .-> N
    N --> CI[Build workflow]
    CI --> A
```

generated-docs — временная производная, не канонический источник.
Общие документы читаются из текущего checkout, внешние — из локального каталога либо shallow clone main.

## Создание документа

```mermaid
flowchart TD
    B[Browser / Docs Portal] --> API[Fastify Docs API]
    S[sources.yml whitelist] --> API
    API --> V[Zod + path + section + existence checks]
    V --> GH[GitHub REST / Octokit]
    GH --> BR[New docs/add branch from main SHA]
    BR --> CM[Markdown commit]
    CM --> PR[Pull Request to main]
    PR --> R[Review and checks]
    R --> M[Merge]
    M --> N[Project notify workflow]
    N --> DP[Docs pipeline]
    DP --> U[Updated portal]
```

## Редактирование и конфликт

```mermaid
sequenceDiagram
    actor User
    participant UI as Browser
    participant API as Docs API
    participant GH as GitHub
    User->>UI: Открыть редактор
    UI->>API: GET projectId + path
    API->>GH: Read main commit and file
    GH-->>UI: Markdown + blob SHA via API
    User->>UI: Изменить текст
    UI->>API: PUT body + expectedSha
    API->>GH: Read current main and blob SHA
    alt SHA отличается
      API-->>UI: 409 DOCUMENT_CHANGED
    else SHA совпадает
      API->>GH: Create docs/edit branch
      API->>GH: Commit updated file in branch
      API->>GH: Open PR to main
      API-->>UI: Pull Request URL
    end
```

PAT доступен только API или отдельным CI шагам чтения/dispatch. Браузер не получает GitHub credentials.

