#!/usr/bin/env tsx
// scripts/seed-registry-13lite.ts — Faz 13-lite: 100 → 250 paket (+150, elle kürasyon)
// Odak: pdf (10+), agent (20+), mcp kategorileri — search "wow" için.
// Idempotent: var olan dosyaları atlar, sonra 'npm run registry:build' çalıştır.
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const PACKAGES_DIR = "registry/packages";

type Row = [name: string, type: "skill" | "mcp" | "plugin" | "agent" | "command" | "hook", description: string, keywords: string[]];

const ROWS: Row[] = [
  // --- PDF (12) — forge search pdf 10+ hedefi ---
  ["pdf/merge", "skill", "PDF merge skill — combine multiple PDFs into one document fast", ["pdf", "merge", "document"]],
  ["pdf/split", "skill", "PDF split skill — extract pages and split PDFs by range", ["pdf", "split", "pages"]],
  ["pdf/ocr", "skill", "PDF OCR skill — scanned PDFs to searchable text with OCR", ["pdf", "ocr", "scan"]],
  ["pdf/compress", "skill", "PDF compress skill — shrink PDF size without quality loss", ["pdf", "compress", "optimize"]],
  ["pdf/sign", "skill", "PDF sign skill — e-sign PDFs and manage signatures", ["pdf", "sign", "signature"]],
  ["pdf/forms", "skill", "PDF forms skill — fill and extract AcroForm form data", ["pdf", "forms", "acroform"]],
  ["pdf/extract", "skill", "PDF extract skill — pull text, tables and images from PDFs", ["pdf", "extract", "parse"]],
  ["pdf/redact", "skill", "PDF redact skill — black out sensitive content in PDFs", ["pdf", "redact", "privacy"]],
  ["pdf/watermark", "skill", "PDF watermark skill — stamp watermarks and headers on PDFs", ["pdf", "watermark", "stamp"]],
  ["pdf/convert", "skill", "PDF convert skill — PDF to Word, HTML, Markdown and back", ["pdf", "convert", "export"]],
  ["pdf/annotate", "skill", "PDF annotate skill — comments, highlights and review markup", ["pdf", "annotate", "review"]],
  ["pdf/tables", "skill", "PDF tables skill — detect and export tables from PDFs to CSV", ["pdf", "tables", "csv"]],

  // --- Agent (25) — forge search agent 20+ hedefi ---
  ["agent/pr-reviewer", "agent", "PR reviewer agent — thorough pull request reviews with suggestions", ["agent", "review", "pr"]],
  ["agent/changelog-writer", "agent", "Changelog writer agent — generate release notes from commits", ["agent", "changelog", "release"]],
  ["agent/migrator", "agent", "Migrator agent — framework and version migration assistant", ["agent", "migrate", "refactor"]],
  ["agent/debugger", "agent", "Debugger agent — reproduce and root-cause failures step by step", ["agent", "debug", "triage"]],
  ["agent/perf-tuner", "agent", "Perf tuner agent — profile hotspots and propose optimizations", ["agent", "performance", "profile"]],
  ["agent/security-auditor", "agent", "Security auditor agent — scan code for vulns and hardening tips", ["agent", "security", "audit"]],
  ["agent/api-designer", "agent", "API designer agent — design REST and GraphQL schemas cleanly", ["agent", "api", "design"]],
  ["agent/db-architect", "agent", "DB architect agent — schema design, indexes and migrations", ["agent", "database", "sql"]],
  ["agent/devops-bot", "agent", "DevOps bot agent — Docker, CI pipelines and deploy automation", ["agent", "devops", "ci"]],
  ["agent/release-bot", "agent", "Release bot agent — version, tag and publish releases safely", ["agent", "release", "publish"]],
  ["agent/triage-bot", "agent", "Triage bot agent — label and route issues automatically", ["agent", "triage", "issues"]],
  ["agent/onboard-bot", "agent", "Onboard bot agent — guide new contributors through the repo", ["agent", "onboarding", "docs"]],
  ["agent/researcher", "agent", "Researcher agent — deep web research with cited summaries", ["agent", "research", "web"]],
  ["agent/summarizer", "agent", "Summarizer agent — condense threads, docs and meetings", ["agent", "summarize", "nlp"]],
  ["agent/translator", "agent", "Translator agent — accurate multilingual translation with tone", ["agent", "translate", "i18n"]],
  ["agent/support-bot", "agent", "Support bot agent — answer FAQs and draft helpful replies", ["agent", "support", "chat"]],
  ["agent/qa-bot", "agent", "QA bot agent — test plans, edge cases and regression checks", ["agent", "qa", "testing"]],
  ["agent/e2e-writer", "agent", "E2E writer agent — generate Playwright end-to-end tests", ["agent", "e2e", "playwright"]],
  ["agent/storybook-writer", "agent", "Storybook writer agent — stories for UI components quickly", ["agent", "storybook", "ui"]],
  ["agent/accessibility-bot", "agent", "Accessibility bot agent — WCAG checks and a11y fixes", ["agent", "a11y", "accessibility"]],
  ["agent/seo-bot", "agent", "SEO bot agent — metadata, sitemaps and content scoring", ["agent", "seo", "content"]],
  ["agent/data-analyst", "agent", "Data analyst agent — CSV analysis, charts and insights", ["agent", "data", "analysis"]],
  ["agent/ml-trainer", "agent", "ML trainer agent — training loops, evals and checkpoints", ["agent", "ml", "training"]],
  ["agent/prompt-optimizer", "agent", "Prompt optimizer agent — refine prompts with eval feedback", ["agent", "prompt", "optimize"]],
  ["agent/meeting-notes", "agent", "Meeting notes agent — action items and decisions from calls", ["agent", "meeting", "notes"]],

  // --- MCP (30) ---
  ["mcp/stripe", "mcp", "Stripe MCP server — payments, invoices and subscriptions", ["mcp", "stripe", "payments"]],
  ["mcp/supabase", "mcp", "Supabase MCP server — Postgres, auth and storage ops", ["mcp", "supabase", "database"]],
  ["mcp/vercel", "mcp", "Vercel MCP server — deployments and project management", ["mcp", "vercel", "deploy"]],
  ["mcp/cloudflare", "mcp", "Cloudflare MCP server — DNS, Workers and cache purge", ["mcp", "cloudflare", "dns"]],
  ["mcp/docker", "mcp", "Docker MCP server — containers, images and compose control", ["mcp", "docker", "containers"]],
  ["mcp/terraform", "mcp", "Terraform MCP server — plan and apply infrastructure code", ["mcp", "terraform", "iac"]],
  ["mcp/helm", "mcp", "Helm MCP server — charts, releases and values management", ["mcp", "helm", "k8s"]],
  ["mcp/argocd", "mcp", "ArgoCD MCP server — GitOps apps and sync status", ["mcp", "argocd", "gitops"]],
  ["mcp/jenkins", "mcp", "Jenkins MCP server — jobs, builds and pipeline status", ["mcp", "jenkins", "ci"]],
  ["mcp/circleci", "mcp", "CircleCI MCP server — workflows and build insights", ["mcp", "circleci", "ci"]],
  ["mcp/datadog", "mcp", "Datadog MCP server — metrics, monitors and dashboards", ["mcp", "datadog", "metrics"]],
  ["mcp/newrelic", "mcp", "New Relic MCP server — APM data and alert policies", ["mcp", "newrelic", "apm"]],
  ["mcp/pagerduty", "mcp", "PagerDuty MCP server — incidents and on-call schedules", ["mcp", "pagerduty", "incidents"]],
  ["mcp/opsgenie", "mcp", "Opsgenie MCP server — alerts and escalation policies", ["mcp", "opsgenie", "alerts"]],
  ["mcp/jira", "mcp", "Jira MCP server — issues, sprints and boards", ["mcp", "jira", "issues"]],
  ["mcp/confluence", "mcp", "Confluence MCP server — pages and spaces search", ["mcp", "confluence", "docs"]],
  ["mcp/figma", "mcp", "Figma MCP server — files, components and exports", ["mcp", "figma", "design"]],
  ["mcp/canva", "mcp", "Canva MCP server — designs and brand templates", ["mcp", "canva", "design"]],
  ["mcp/shopify", "mcp", "Shopify MCP server — products, orders and inventory", ["mcp", "shopify", "ecommerce"]],
  ["mcp/salesforce", "mcp", "Salesforce MCP server — leads, accounts and SOQL", ["mcp", "salesforce", "crm"]],
  ["mcp/hubspot", "mcp", "HubSpot MCP server — contacts, deals and pipelines", ["mcp", "hubspot", "crm"]],
  ["mcp/zendesk", "mcp", "Zendesk MCP server — tickets and help center", ["mcp", "zendesk", "support"]],
  ["mcp/intercom", "mcp", "Intercom MCP server — conversations and user events", ["mcp", "intercom", "chat"]],
  ["mcp/twilio", "mcp", "Twilio MCP server — SMS, voice and phone numbers", ["mcp", "twilio", "sms"]],
  ["mcp/sendgrid", "mcp", "SendGrid MCP server — email sends and templates", ["mcp", "sendgrid", "email"]],
  ["mcp/mailchimp", "mcp", "Mailchimp MCP server — audiences and campaigns", ["mcp", "mailchimp", "email"]],
  ["mcp/elasticsearch", "mcp", "Elasticsearch MCP server — search indexes and queries", ["mcp", "elasticsearch", "search"]],
  ["mcp/kafka", "mcp", "Kafka MCP server — topics, consumer groups and lag", ["mcp", "kafka", "streaming"]],
  ["mcp/rabbitmq", "mcp", "RabbitMQ MCP server — queues, exchanges and bindings", ["mcp", "rabbitmq", "queue"]],
  ["mcp/clickhouse", "mcp", "ClickHouse MCP server — analytical SQL queries fast", ["mcp", "clickhouse", "analytics"]],

  // --- Skill (58) ---
  ["skill/markdown", "skill", "Markdown skill — lint, format and convert Markdown docs", ["markdown", "docs"]],
  ["skill/yaml", "skill", "YAML skill — validate and transform YAML configs", ["yaml", "config"]],
  ["skill/json", "skill", "JSON skill — schema validation and jq-style transforms", ["json", "data"]],
  ["skill/regex", "skill", "Regex skill — build and debug regular expressions", ["regex", "patterns"]],
  ["skill/git-advanced", "skill", "Git advanced skill — rebase, bisect and reflog rescue", ["git", "advanced"]],
  ["skill/docker-compose", "skill", "Docker Compose skill — multi-service local stacks", ["docker", "compose"]],
  ["skill/makefile", "skill", "Makefile skill — idiomatic make targets and caching", ["makefile", "build"]],
  ["skill/bash", "skill", "Bash skill — safe shell scripting patterns", ["bash", "shell"]],
  ["skill/powershell", "skill", "PowerShell skill — Windows automation scripts", ["powershell", "windows"]],
  ["skill/sql", "skill", "SQL skill — queries, joins and window functions", ["sql", "queries"]],
  ["skill/postgres-admin", "skill", "Postgres admin skill — vacuum, indexes and roles", ["postgres", "admin"]],
  ["skill/mongo", "skill", "Mongo skill — aggregations and schema design", ["mongo", "nosql"]],
  ["skill/graphql", "skill", "GraphQL skill — schemas, resolvers and caching", ["graphql", "api"]],
  ["skill/rest", "skill", "REST skill — resource design and versioning", ["rest", "api"]],
  ["skill/websocket", "skill", "WebSocket skill — realtime channels and reconnects", ["websocket", "realtime"]],
  ["skill/grpc", "skill", "gRPC skill — protos, streaming and codegen", ["grpc", "rpc"]],
  ["skill/auth", "skill", "Auth skill — sessions, passwords and MFA flows", ["auth", "security"]],
  ["skill/oauth", "skill", "OAuth skill — OAuth2 and OIDC login integrations", ["oauth", "login"]],
  ["skill/jwt", "skill", "JWT skill — sign, verify and rotate tokens safely", ["jwt", "tokens"]],
  ["skill/encryption", "skill", "Encryption skill — AES, KMS and secret handling", ["encryption", "crypto"]],
  ["skill/backup", "skill", "Backup skill — snapshots, restores and retention", ["backup", "restore"]],
  ["skill/monitoring", "skill", "Monitoring skill — alerts, SLOs and dashboards", ["monitoring", "slo"]],
  ["skill/logging", "skill", "Logging skill — structured logs and correlation IDs", ["logging", "otel"]],
  ["skill/tracing", "skill", "Tracing skill — distributed traces with OpenTelemetry", ["tracing", "otel"]],
  ["skill/profiling", "skill", "Profiling skill — CPU and memory flamegraphs", ["profiling", "perf"]],
  ["skill/benchmark", "skill", "Benchmark skill — microbenchmarks done right", ["benchmark", "perf"]],
  ["skill/loadtest", "skill", "Loadtest skill — k6 scenarios and capacity planning", ["loadtest", "k6"]],
  ["skill/chaos", "skill", "Chaos skill — fault injection and game days", ["chaos", "resilience"]],
  ["skill/feature-flags", "skill", "Feature flags skill — gradual rollouts and kill switches", ["flags", "rollout"]],
  ["skill/abtest", "skill", "AB test skill — experiments and stats significance", ["abtest", "experiments"]],
  ["skill/analytics", "skill", "Analytics skill — events, funnels and retention", ["analytics", "events"]],
  ["skill/excel", "skill", "Excel skill — formulas, pivots and automation", ["excel", "sheets"]],
  ["skill/parquet", "skill", "Parquet skill — columnar data wrangling tips", ["parquet", "data"]],
  ["skill/notebook", "skill", "Notebook skill — Jupyter workflows that reproduce", ["notebook", "jupyter"]],
  ["skill/pandas", "skill", "Pandas skill — dataframe tricks and performance", ["pandas", "python"]],
  ["skill/numpy", "skill", "NumPy skill — vectorized numeric computing", ["numpy", "python"]],
  ["skill/scikit", "skill", "Scikit skill — classical ML pipelines quickly", ["scikit", "ml"]],
  ["skill/pytorch", "skill", "PyTorch skill — training loops and debugging", ["pytorch", "dl"]],
  ["skill/tensorflow", "skill", "TensorFlow skill — Keras models and serving", ["tensorflow", "dl"]],
  ["skill/onnx", "skill", "ONNX skill — export and optimize model graphs", ["onnx", "models"]],
  ["skill/rag", "skill", "RAG skill — chunking, retrieval and eval loops", ["rag", "retrieval"]],
  ["skill/embeddings", "skill", "Embeddings skill — pick and tune embedding models", ["embeddings", "vectors"]],
  ["skill/vector-db", "skill", "Vector DB skill — Pinecone, Qdrant and pgvector", ["vectordb", "search"]],
  ["skill/prompt-eng", "skill", "Prompt engineering skill — patterns that hold up", ["prompt", "llm"]],
  ["skill/finetune", "skill", "Finetune skill — LoRA configs and data prep", ["finetune", "lora"]],
  ["skill/eval", "skill", "Eval skill — LLM evals with golden datasets", ["eval", "testing"]],
  ["skill/redteam", "skill", "Redteam skill — adversarial prompt testing", ["redteam", "safety"]],
  ["skill/bugbounty", "skill", "Bugbounty skill — scope, recon and report writing", ["bugbounty", "security"]],
  ["skill/pentest", "skill", "Pentest skill — methodology and checklists", ["pentest", "security"]],
  ["skill/compliance", "skill", "Compliance skill — SOC2 and ISO checklists", ["compliance", "soc2"]],
  ["skill/gdpr", "skill", "GDPR skill — DPIAs, DSARs and retention rules", ["gdpr", "privacy"]],
  ["skill/wcag", "skill", "WCAG skill — AA checklists with code examples", ["wcag", "a11y"]],
  ["skill/lighthouse", "skill", "Lighthouse skill — hit 90+ on all categories", ["lighthouse", "perf"]],
  ["skill/pwa", "skill", "PWA skill — service workers and installability", ["pwa", "web"]],
  ["skill/electron", "skill", "Electron skill — desktop shells and auto-update", ["electron", "desktop"]],
  ["skill/tauri", "skill", "Tauri skill — lightweight Rust desktop apps", ["tauri", "rust"]],
  ["skill/react-native", "skill", "React Native skill — Expo apps that ship", ["react-native", "mobile"]],
  ["skill/flutter", "skill", "Flutter skill — Dart widgets and releases", ["flutter", "mobile"]],

  // --- Command (10) ---
  ["cmd/lint", "command", "Slash command /lint — run linters with autofix", ["command", "lint"]],
  ["cmd/format", "command", "Slash command /format — format the codebase", ["command", "format"]],
  ["cmd/benchmark", "command", "Slash command /benchmark — run perf benchmarks", ["command", "benchmark"]],
  ["cmd/migrate", "command", "Slash command /migrate — run DB migrations safely", ["command", "migrate"]],
  ["cmd/seed", "command", "Slash command /seed — seed dev and demo data", ["command", "seed"]],
  ["cmd/backup", "command", "Slash command /backup — snapshot project state", ["command", "backup"]],
  ["cmd/restore", "command", "Slash command /restore — restore from snapshot", ["command", "restore"]],
  ["cmd/changelog", "command", "Slash command /changelog — draft changelog entries", ["command", "changelog"]],
  ["cmd/release", "command", "Slash command /release — cut a new release", ["command", "release"]],
  ["cmd/preview", "command", "Slash command /preview — preview deploy links", ["command", "preview"]],

  // --- Hook (7) ---
  ["hook/post-commit", "hook", "Post-commit hook — notify and update docs after commit", ["hook", "git"]],
  ["hook/pre-merge", "hook", "Pre-merge hook — verify branch before merging", ["hook", "git"]],
  ["hook/post-merge", "hook", "Post-merge hook — reinstall deps after merge", ["hook", "git"]],
  ["hook/pre-tool", "hook", "Pre-tool hook — guardrails before tool execution", ["hook", "tool"]],
  ["hook/post-deploy", "hook", "Post-deploy hook — smoke checks after deploy", ["hook", "deploy"]],
  ["hook/pre-publish", "hook", "Pre-publish hook — validate package before publish", ["hook", "publish"]],
  ["hook/post-publish", "hook", "Post-publish hook — announce new versions", ["hook", "publish"]],

  // --- Plugin (8) ---
  ["plugin/claude-marketplace", "plugin", "Claude marketplace plugin — distribute skills easily", ["plugin", "claude"]],
  ["plugin/cursor-marketplace", "plugin", "Cursor marketplace plugin — share rules and skills", ["plugin", "cursor"]],
  ["plugin/opencode-themes", "plugin", "OpenCode themes plugin — themes and keymaps pack", ["plugin", "opencode"]],
  ["plugin/windsurf-rules", "plugin", "Windsurf rules plugin — project rules bundle", ["plugin", "windsurf"]],
  ["plugin/dsh-prompts", "plugin", "DSH prompts plugin — DeepSeek prompt presets", ["plugin", "dsh"]],
  ["plugin/github-action", "plugin", "GitHub Action plugin — Forge in CI pipelines", ["plugin", "github"]],
  ["plugin/vscode-ext", "plugin", "VSCode extension plugin — editor integration", ["plugin", "vscode"]],
  ["plugin/jetbrains-ext", "plugin", "JetBrains extension plugin — IDE integration", ["plugin", "jetbrains"]],
];

function toSlug(name: string): string {
  return name.replace("/", "-");
}

let created = 0;
let skipped = 0;

if (!existsSync(PACKAGES_DIR)) mkdirSync(PACKAGES_DIR, { recursive: true });

for (const [name, type, description, keywords] of ROWS) {
  const slug = toSlug(name);
  const file = join(PACKAGES_DIR, `${slug}.json`);
  if (existsSync(file)) {
    skipped++;
    continue;
  }
  const short = name.split("/")[1] ?? name;
  const isMcp = type === "mcp";
  const detail: Record<string, unknown> = {
    name,
    type,
    description,
    homepage: `https://github.com/${name}`,
    repository: `https://github.com/${name}`,
    keywords,
    versions: {
      "1.0.0": {
        version: "1.0.0",
        tarball: `https://github.com/${name}/releases/download/v1.0.0/${slug}-1.0.0.tar.gz`,
        sha256: `placeholder-sha256-${slug}`,
        engines: { "*": "*" },
        dependencies: {},
        ...(isMcp ? { mcp: { command: "npx", args: ["-y", `@modelcontextprotocol/server-${short}`] } } : {}),
        publishedAt: new Date().toISOString(),
      },
    },
    latest: "1.0.0",
  };
  writeFileSync(file, JSON.stringify(detail, null, 2) + "\n");
  created++;
  console.log(`+ ${name} [${type}] → ${file}`);
}

console.log(`\n[seed-13lite] done: ${created} created, ${skipped} skipped, rows ${ROWS.length}`);
console.log(`[seed-13lite] run 'npm run registry:build' to rebuild index.json`);
