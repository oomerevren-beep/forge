#!/usr/bin/env tsx
// scripts/seed-registry.ts — Faz 2: 3 → 100 paket seed
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const PACKAGES_DIR = "registry/packages";

type Pkg = {
  name: string;
  type: "skill" | "mcp" | "plugin" | "agent" | "command" | "hook";
  description: string;
  homepage?: string;
  repository?: string;
  keywords: string[];
  source?: string;
  version: string;
  tarball: string;
  engines?: Record<string, string>;
  mcp?: { command: string; args: string[]; env?: Record<string, string> };
  dependencies?: Record<string, string>;
};

const CATALOG: Pkg[] = [
  // anthropics/* 11 new (1 exists: anthropics/plan)
  { name: "anthropics/brainstorm", type: "skill", description: "Brainstorm skill — structured ideation before coding", keywords: ["brainstorm", "planning"], source: "skills/brainstorming", version: "1.1.0", tarball: "https://github.com/anthropics/skills/releases/download/brainstorm-1.1.0/brainstorm-1.1.0.tar.gz", engines: { "claude-code": ">=1.0.0" } },
  { name: "anthropics/tdd", type: "skill", description: "TDD skill — test-driven development workflow", keywords: ["tdd", "testing"], source: "skills/tdd", version: "1.0.0", tarball: "https://github.com/anthropics/skills/releases/download/tdd-1.0.0/tdd-1.0.0.tar.gz", engines: { "claude-code": ">=1.0.0" } },
  { name: "anthropics/code-review", type: "skill", description: "Code review skill — checklist and automated review", keywords: ["review", "quality"], source: "skills/code-review", version: "1.0.0", tarball: "https://github.com/anthropics/skills/releases/download/code-review-1.0.0/code-review-1.0.0.tar.gz", engines: { "claude-code": ">=1.0.0" } },
  { name: "anthropics/debug", type: "skill", description: "Systematic debugging skill — root cause analysis", keywords: ["debug", "troubleshooting"], source: "skills/debugging", version: "1.0.0", tarball: "https://github.com/anthropics/skills/releases/download/debug-1.0.0/debug-1.0.0.tar.gz", engines: { "claude-code": ">=1.0.0" } },
  { name: "anthropics/git", type: "skill", description: "Git workflow skill — commits, branches, PRs", keywords: ["git", "workflow"], source: "skills/git", version: "1.0.0", tarball: "https://github.com/anthropics/skills/releases/download/git-1.0.0/git-1.0.0.tar.gz", engines: { "claude-code": ">=1.0.0" } },
  { name: "anthropics/frontend", type: "skill", description: "Frontend design skill — React, Tailwind, components", keywords: ["frontend", "design"], source: "skills/frontend-design", version: "1.0.0", tarball: "https://github.com/anthropics/skills/releases/download/frontend-1.0.0/frontend-1.0.0.tar.gz", engines: { "claude-code": ">=1.0.0" } },
  { name: "anthropics/api", type: "skill", description: "API design skill — REST, GraphQL, best practices", keywords: ["api", "design"], source: "skills/api-design", version: "1.0.0", tarball: "https://github.com/anthropics/skills/releases/download/api-1.0.0/api-1.0.0.tar.gz", engines: { "claude-code": ">=1.0.0" } },
  { name: "anthropics/mcp-builder", type: "skill", description: "MCP builder skill — create MCP servers fast", keywords: ["mcp", "builder"], source: "skills/mcp-builder", version: "1.0.0", tarball: "https://github.com/anthropics/skills/releases/download/mcp-builder-1.0.0/mcp-builder-1.0.0.tar.gz", engines: { "claude-code": ">=1.0.0" } },
  { name: "anthropics/skill-creator", type: "skill", description: "Skill creator — scaffold new SKILL.md from scratch", keywords: ["skill", "creator"], source: "skills/skill-creator", version: "1.0.0", tarball: "https://github.com/anthropics/skills/releases/download/skill-creator-1.0.0/skill-creator-1.0.0.tar.gz", engines: { "claude-code": ">=1.0.0" } },
  { name: "anthropics/vercel-deploy", type: "skill", description: "Vercel deploy skill — ship to production", keywords: ["vercel", "deploy"], source: "skills/vercel", version: "1.0.0", tarball: "https://github.com/anthropics/skills/releases/download/vercel-deploy-1.0.0/vercel-deploy-1.0.0.tar.gz", engines: { "claude-code": ">=1.0.0" } },
  { name: "anthropics/notion", type: "skill", description: "Notion skill — docs and database automation", keywords: ["notion", "docs"], source: "skills/notion", version: "1.0.0", tarball: "https://github.com/anthropics/skills/releases/download/notion-1.0.0/notion-1.0.0.tar.gz", engines: { "claude-code": ">=1.0.0" } },

  // mcp/* 21 new (1 exists: mcp/filesystem)
  { name: "mcp/github", type: "mcp", description: "GitHub MCP server — issues, PRs, repos", keywords: ["mcp", "github"], source: "src/github", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/github-1.0.0/github-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-github"] } },
  { name: "mcp/memory", type: "mcp", description: "Memory MCP server — knowledge graph memory", keywords: ["mcp", "memory"], source: "src/memory", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/memory-1.0.0/memory-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-memory"] } },
  { name: "mcp/fetch", type: "mcp", description: "Fetch MCP server — web fetching and scraping", keywords: ["mcp", "fetch"], source: "src/fetch", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/fetch-1.0.0/fetch-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-fetch"] } },
  { name: "mcp/brave-search", type: "mcp", description: "Brave Search MCP server — web search", keywords: ["mcp", "search"], source: "src/brave-search", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/brave-search-1.0.0/brave-search-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-brave-search"] } },
  { name: "mcp/postgres", type: "mcp", description: "Postgres MCP server — SQL database access", keywords: ["mcp", "postgres", "sql"], source: "src/postgres", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/postgres-1.0.0/postgres-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-postgres"] } },
  { name: "mcp/sqlite", type: "mcp", description: "SQLite MCP server — local database", keywords: ["mcp", "sqlite"], source: "src/sqlite", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/sqlite-1.0.0/sqlite-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-sqlite", "/tmp/db.sqlite"] } },
  { name: "mcp/slack", type: "mcp", description: "Slack MCP server — messages and channels", keywords: ["mcp", "slack"], source: "src/slack", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/slack-1.0.0/slack-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-slack"] } },
  { name: "mcp/puppeteer", type: "mcp", description: "Puppeteer MCP server — browser automation", keywords: ["mcp", "puppeteer", "browser"], source: "src/puppeteer", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/puppeteer-1.0.0/puppeteer-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-puppeteer"] } },
  { name: "mcp/google-maps", type: "mcp", description: "Google Maps MCP server — geocoding and places", keywords: ["mcp", "maps"], source: "src/google-maps", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/google-maps-1.0.0/google-maps-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-google-maps"] } },
  { name: "mcp/sequential-thinking", type: "mcp", description: "Sequential thinking MCP — structured reasoning", keywords: ["mcp", "reasoning"], source: "src/sequential-thinking", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/sequential-thinking-1.0.0/sequential-thinking-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-sequential-thinking"] } },
  { name: "mcp/time", type: "mcp", description: "Time MCP server — timezone and time utilities", keywords: ["mcp", "time"], source: "src/time", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/time-1.0.0/time-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-time"] } },
  { name: "mcp/git", type: "mcp", description: "Git MCP server — repository operations", keywords: ["mcp", "git"], source: "src/git", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/git-1.0.0/git-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-git"] } },
  { name: "mcp/notion", type: "mcp", description: "Notion MCP server — pages and databases", keywords: ["mcp", "notion"], source: "src/notion", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/notion-1.0.0/notion-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-notion"] } },
  { name: "mcp/airtable", type: "mcp", description: "Airtable MCP server — bases and records", keywords: ["mcp", "airtable"], source: "src/airtable", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/airtable-1.0.0/airtable-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-airtable"] } },
  { name: "mcp/linear", type: "mcp", description: "Linear MCP server — issues and projects", keywords: ["mcp", "linear"], source: "src/linear", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/linear-1.0.0/linear-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-linear"] } },
  { name: "mcp/sentry", type: "mcp", description: "Sentry MCP server — error tracking", keywords: ["mcp", "sentry"], source: "src/sentry", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/sentry-1.0.0/sentry-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-sentry"] } },
  { name: "mcp/gdrive", type: "mcp", description: "Google Drive MCP server — files and folders", keywords: ["mcp", "gdrive"], source: "src/gdrive", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/gdrive-1.0.0/gdrive-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-gdrive"] } },
  { name: "mcp/redis", type: "mcp", description: "Redis MCP server — cache and pubsub", keywords: ["mcp", "redis"], source: "src/redis", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/redis-1.0.0/redis-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-redis"] } },
  { name: "mcp/aws-kb", type: "mcp", description: "AWS KB MCP server — knowledge base", keywords: ["mcp", "aws"], source: "src/aws-kb", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/aws-kb-1.0.0/aws-kb-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-aws-kb"] } },
  { name: "mcp/kubernetes", type: "mcp", description: "Kubernetes MCP server — cluster management", keywords: ["mcp", "kubernetes", "k8s"], source: "src/kubernetes", version: "1.0.0", tarball: "https://github.com/modelcontextprotocol/servers/releases/download/kubernetes-1.0.0/kubernetes-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-kubernetes"] } },

  // obra/agency/vercel 6 new (1 exists: obra/superpowers)
  { name: "agency/frontend-wizard", type: "agent", description: "Frontend wizard — React, Tailwind, shadcn", keywords: ["agent", "frontend"], version: "1.0.0", tarball: "https://github.com/agency/frontend-wizard/releases/download/v1.0.0/frontend-wizard-1.0.0.tar.gz" },
  { name: "agency/backend-wizard", type: "agent", description: "Backend wizard — Node, Postgres, APIs", keywords: ["agent", "backend"], version: "1.0.0", tarball: "https://github.com/agency/backend-wizard/releases/download/v1.0.0/backend-wizard-1.0.0.tar.gz" },
  { name: "agency/devops-wizard", type: "agent", description: "DevOps wizard — Docker, CI, deploy", keywords: ["agent", "devops"], version: "1.0.0", tarball: "https://github.com/agency/devops-wizard/releases/download/v1.0.0/devops-wizard-1.0.0.tar.gz" },
  { name: "agency/data-wizard", type: "agent", description: "Data wizard — ML, analysis, pipelines", keywords: ["agent", "data"], version: "1.0.0", tarball: "https://github.com/agency/data-wizard/releases/download/v1.0.0/data-wizard-1.0.0.tar.gz" },
  { name: "vercel/nextjs-skill", type: "skill", description: "Next.js skill — App Router, best practices", keywords: ["nextjs", "vercel"], version: "1.0.0", tarball: "https://github.com/vercel/nextjs-skill/releases/download/v1.0.0/nextjs-skill-1.0.0.tar.gz" },
  { name: "vercel/ai-sdk-skill", type: "skill", description: "Vercel AI SDK skill — streaming, tools", keywords: ["vercel", "ai"], version: "1.0.0", tarball: "https://github.com/vercel/ai-sdk-skill/releases/download/v1.0.0/ai-sdk-skill-1.0.0.tar.gz" },

  // Community 28
  { name: "taste/skill", type: "skill", description: "Taste skill — give your AI good taste", keywords: ["taste", "design"], version: "1.0.0", tarball: "https://github.com/taste/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "last30days/skill", type: "skill", description: "Last 30 days skill — recent context", keywords: ["context", "memory"], version: "1.0.0", tarball: "https://github.com/last30days/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "humans/skill", type: "skill", description: "Humans skill — human-centered design", keywords: ["humans", "ux"], version: "1.0.0", tarball: "https://github.com/humans/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "dotprompt/react-best", type: "skill", description: "React best practices — prompts and patterns", keywords: ["react", "prompt"], version: "1.0.0", tarball: "https://github.com/dotprompt/react-best/releases/download/v1.0.0/react-best-1.0.0.tar.gz" },
  { name: "dotprompt/python-best", type: "skill", description: "Python best practices — prompts and patterns", keywords: ["python", "prompt"], version: "1.0.0", tarball: "https://github.com/dotprompt/python-best/releases/download/v1.0.0/python-best-1.0.0.tar.gz" },
  { name: "playwright/skill", type: "skill", description: "Playwright skill — browser testing", keywords: ["playwright", "testing"], version: "1.0.0", tarball: "https://github.com/playwright/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "shadcn/skill", type: "skill", description: "shadcn skill — UI components and theming", keywords: ["shadcn", "ui"], version: "1.0.0", tarball: "https://github.com/shadcn/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "tailwind/skill", type: "skill", description: "Tailwind skill — utility CSS mastery", keywords: ["tailwind", "css"], version: "1.0.0", tarball: "https://github.com/tailwind/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "supabase/skill", type: "skill", description: "Supabase skill — Postgres, auth, storage", keywords: ["supabase", "database"], version: "1.0.0", tarball: "https://github.com/supabase/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "stripe/skill", type: "skill", description: "Stripe skill — payments and billing", keywords: ["stripe", "payments"], version: "1.0.0", tarball: "https://github.com/stripe/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "openai/skill", type: "skill", description: "OpenAI skill — GPT integration patterns", keywords: ["openai", "gpt"], version: "1.0.0", tarball: "https://github.com/openai/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "anthropic/skill", type: "skill", description: "Anthropic skill — Claude integration patterns", keywords: ["anthropic", "claude"], version: "1.0.0", tarball: "https://github.com/anthropic/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "langchain/skill", type: "skill", description: "LangChain skill — chains and agents", keywords: ["langchain", "chains"], version: "1.0.0", tarball: "https://github.com/langchain/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "vercel/ship", type: "skill", description: "Ship skill — ship fast with Vercel", keywords: ["vercel", "ship"], version: "1.0.0", tarball: "https://github.com/vercel/ship/releases/download/v1.0.0/ship-1.0.0.tar.gz" },
  { name: "linear/skill", type: "skill", description: "Linear skill — issue tracking workflow", keywords: ["linear", "issues"], version: "1.0.0", tarball: "https://github.com/linear/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "notion/skill", type: "skill", description: "Notion skill — workspace automation", keywords: ["notion", "docs"], version: "1.0.0", tarball: "https://github.com/notion/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "figma/skill", type: "skill", description: "Figma skill — design to code", keywords: ["figma", "design"], version: "1.0.0", tarball: "https://github.com/figma/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "github/skill", type: "skill", description: "GitHub skill — CLI and API workflows", keywords: ["github", "git"], version: "1.0.0", tarball: "https://github.com/github/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "docker/skill", type: "skill", description: "Docker skill — containers and compose", keywords: ["docker", "containers"], version: "1.0.0", tarball: "https://github.com/docker/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "k8s/skill", type: "skill", description: "Kubernetes skill — k8s manifests and ops", keywords: ["k8s", "kubernetes"], version: "1.0.0", tarball: "https://github.com/k8s/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "testing/skill", type: "skill", description: "Testing skill — unit, e2e, coverage", keywords: ["testing", "quality"], version: "1.0.0", tarball: "https://github.com/testing/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "refactoring/skill", type: "skill", description: "Refactoring skill — clean code patterns", keywords: ["refactoring", "clean"], version: "1.0.0", tarball: "https://github.com/refactoring/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "docs/skill", type: "skill", description: "Docs skill — documentation generation", keywords: ["docs", "documentation"], version: "1.0.0", tarball: "https://github.com/docs/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "seo/skill", type: "skill", description: "SEO skill — optimization and auditing", keywords: ["seo", "optimization"], version: "1.0.0", tarball: "https://github.com/seo/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "a11y/skill", type: "skill", description: "A11y skill — accessibility best practices", keywords: ["a11y", "accessibility"], version: "1.0.0", tarball: "https://github.com/a11y/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "i18n/skill", type: "skill", description: "i18n skill — internationalization workflow", keywords: ["i18n", "translation"], version: "1.0.0", tarball: "https://github.com/i18n/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "security/skill", type: "skill", description: "Security skill — audit and hardening", keywords: ["security", "audit"], version: "1.0.0", tarball: "https://github.com/security/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },
  { name: "performance/skill", type: "skill", description: "Performance skill — profiling and optimization", keywords: ["performance", "perf"], version: "1.0.0", tarball: "https://github.com/performance/skill/releases/download/v1.0.0/skill-1.0.0.tar.gz" },

  // Command / Hook / Plugin / Agent 30
  { name: "cmd/plan", type: "command", description: "Slash command /plan — structured planning", keywords: ["command", "plan"], version: "1.0.0", tarball: "https://github.com/cmd/plan/releases/download/v1.0.0/plan-1.0.0.tar.gz" },
  { name: "cmd/review", type: "command", description: "Slash command /review — code review", keywords: ["command", "review"], version: "1.0.0", tarball: "https://github.com/cmd/review/releases/download/v1.0.0/review-1.0.0.tar.gz" },
  { name: "cmd/test", type: "command", description: "Slash command /test — run tests", keywords: ["command", "test"], version: "1.0.0", tarball: "https://github.com/cmd/test/releases/download/v1.0.0/test-1.0.0.tar.gz" },
  { name: "cmd/deploy", type: "command", description: "Slash command /deploy — deploy app", keywords: ["command", "deploy"], version: "1.0.0", tarball: "https://github.com/cmd/deploy/releases/download/v1.0.0/deploy-1.0.0.tar.gz" },
  { name: "cmd/brainstorm", type: "command", description: "Slash command /brainstorm — ideation", keywords: ["command", "brainstorm"], version: "1.0.0", tarball: "https://github.com/cmd/brainstorm/releases/download/v1.0.0/brainstorm-1.0.0.tar.gz" },
  { name: "hook/pre-commit", type: "hook", description: "Pre-commit hook — lint and test", keywords: ["hook", "git"], version: "1.0.0", tarball: "https://github.com/hook/pre-commit/releases/download/v1.0.0/pre-commit-1.0.0.tar.gz" },
  { name: "hook/post-tool", type: "hook", description: "Post-tool hook — after tool execution", keywords: ["hook", "tool"], version: "1.0.0", tarball: "https://github.com/hook/post-tool/releases/download/v1.0.0/post-tool-1.0.0.tar.gz" },
  { name: "hook/pre-push", type: "hook", description: "Pre-push hook — verify before push", keywords: ["hook", "git"], version: "1.0.0", tarball: "https://github.com/hook/pre-push/releases/download/v1.0.0/pre-push-1.0.0.tar.gz" },
  { name: "plugin/dsh-desktop", type: "plugin", description: "DSH desktop plugin — UI extension", keywords: ["plugin", "dsh"], version: "1.0.0", tarball: "https://github.com/plugin/dsh-desktop/releases/download/v1.0.0/dsh-desktop-1.0.0.tar.gz" },
  { name: "plugin/opencode-lsp", type: "plugin", description: "OpenCode LSP plugin — language server", keywords: ["plugin", "opencode"], version: "1.0.0", tarball: "https://github.com/plugin/opencode-lsp/releases/download/v1.0.0/opencode-lsp-1.0.0.tar.gz" },
  { name: "plugin/cursor-rules", type: "plugin", description: "Cursor rules plugin — project rules", keywords: ["plugin", "cursor"], version: "1.0.0", tarball: "https://github.com/plugin/cursor-rules/releases/download/v1.0.0/cursor-rules-1.0.0.tar.gz" },
  { name: "agent/code-reviewer", type: "agent", description: "Code reviewer agent — automated reviews", keywords: ["agent", "review"], version: "1.0.0", tarball: "https://github.com/agent/code-reviewer/releases/download/v1.0.0/code-reviewer-1.0.0.tar.gz" },
  { name: "agent/test-writer", type: "agent", description: "Test writer agent — generate tests", keywords: ["agent", "testing"], version: "1.0.0", tarball: "https://github.com/agent/test-writer/releases/download/v1.0.0/test-writer-1.0.0.tar.gz" },
  { name: "agent/docs-writer", type: "agent", description: "Docs writer agent — generate docs", keywords: ["agent", "docs"], version: "1.0.0", tarball: "https://github.com/agent/docs-writer/releases/download/v1.0.0/docs-writer-1.0.0.tar.gz" },
  { name: "agent/refactor-bot", type: "agent", description: "Refactor bot — automated refactoring", keywords: ["agent", "refactor"], version: "1.0.0", tarball: "https://github.com/agent/refactor-bot/releases/download/v1.0.0/refactor-bot-1.0.0.tar.gz" },
  { name: "mcp/custom-weather", type: "mcp", description: "Weather MCP server — forecast data", keywords: ["mcp", "weather"], version: "1.0.0", tarball: "https://github.com/mcp/custom-weather/releases/download/v1.0.0/custom-weather-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "mcp-weather"] } },
  { name: "mcp/custom-crypto", type: "mcp", description: "Crypto MCP server — price data", keywords: ["mcp", "crypto"], version: "1.0.0", tarball: "https://github.com/mcp/custom-crypto/releases/download/v1.0.0/custom-crypto-1.0.0.tar.gz", mcp: { command: "npx", args: ["-y", "mcp-crypto"] } },
  { name: "skill/pdf", type: "skill", description: "PDF skill — parse, generate, manipulate PDFs", keywords: ["pdf", "document"], version: "1.0.0", tarball: "https://github.com/skill/pdf/releases/download/v1.0.0/pdf-1.0.0.tar.gz" },
  { name: "skill/csv", type: "skill", description: "CSV skill — parse and transform CSV data", keywords: ["csv", "data"], version: "1.0.0", tarball: "https://github.com/skill/csv/releases/download/v1.0.0/csv-1.0.0.tar.gz" },
  { name: "skill/image", type: "skill", description: "Image skill — generate and edit images", keywords: ["image", "vision"], version: "1.0.0", tarball: "https://github.com/skill/image/releases/download/v1.0.0/image-1.0.0.tar.gz" },
  { name: "skill/video", type: "skill", description: "Video skill — generate and edit videos", keywords: ["video", "media"], version: "1.0.0", tarball: "https://github.com/skill/video/releases/download/v1.0.0/video-1.0.0.tar.gz" },
  { name: "skill/audio", type: "skill", description: "Audio skill — transcribe and synthesize", keywords: ["audio", "speech"], version: "1.0.0", tarball: "https://github.com/skill/audio/releases/download/v1.0.0/audio-1.0.0.tar.gz" },
  { name: "skill/3d", type: "skill", description: "3D skill — models and rendering", keywords: ["3d", "rendering"], version: "1.0.0", tarball: "https://github.com/skill/3d/releases/download/v1.0.0/3d-1.0.0.tar.gz" },
  { name: "skill/email", type: "skill", description: "Email skill — compose and send emails", keywords: ["email", "communication"], version: "1.0.0", tarball: "https://github.com/skill/email/releases/download/v1.0.0/email-1.0.0.tar.gz" },
  { name: "skill/calendar", type: "skill", description: "Calendar skill — scheduling and events", keywords: ["calendar", "scheduling"], version: "1.0.0", tarball: "https://github.com/skill/calendar/releases/download/v1.0.0/calendar-1.0.0.tar.gz" },
  { name: "skill/search", type: "skill", description: "Search skill — web and local search", keywords: ["search", "retrieval"], version: "1.0.0", tarball: "https://github.com/skill/search/releases/download/v1.0.0/search-1.0.0.tar.gz" },
  { name: "skill/research", type: "skill", description: "Research skill — deep research workflow", keywords: ["research", "analysis"], version: "1.0.0", tarball: "https://github.com/skill/research/releases/download/v1.0.0/research-1.0.0.tar.gz" },
  { name: "skill/writing", type: "skill", description: "Writing skill — content generation", keywords: ["writing", "content"], version: "1.0.0", tarball: "https://github.com/skill/writing/releases/download/v1.0.0/writing-1.0.0.tar.gz" },
  { name: "skill/translate", type: "skill", description: "Translate skill — multilingual translation", keywords: ["translate", "i18n"], version: "1.0.0", tarball: "https://github.com/skill/translate/releases/download/v1.0.0/translate-1.0.0.tar.gz" },
  { name: "skill/summarize", type: "skill", description: "Summarize skill — text summarization", keywords: ["summarize", "nlp"], version: "1.0.0", tarball: "https://github.com/skill/summarize/releases/download/v1.0.0/summarize-1.0.0.tar.gz" },
];

function toSlug(name: string): string {
  return name.replace("/", "-");
}

let created = 0;
let skipped = 0;

if (!existsSync(PACKAGES_DIR)) mkdirSync(PACKAGES_DIR, { recursive: true });

for (const pkg of CATALOG) {
  const slug = toSlug(pkg.name);
  const file = join(PACKAGES_DIR, `${slug}.json`);
  if (existsSync(file)) {
    skipped++;
    continue;
  }
  const sha = `placeholder-sha256-${slug}`;
  const detail: Record<string, unknown> = {
    name: pkg.name,
    type: pkg.type,
    description: pkg.description,
    homepage: pkg.homepage ?? `https://github.com/${pkg.name}`,
    repository: pkg.repository ?? `https://github.com/${pkg.name}`,
    keywords: pkg.keywords,
    ...(pkg.source ? { source: pkg.source } : {}),
    versions: {
      [pkg.version]: {
        version: pkg.version,
        tarball: pkg.tarball,
        sha256: sha,
        engines: pkg.engines ?? { "*": "*" },
        dependencies: pkg.dependencies ?? {},
        ...(pkg.mcp ? { mcp: pkg.mcp } : {}),
        publishedAt: new Date().toISOString(),
      },
    },
    latest: pkg.version,
  };
  writeFileSync(file, JSON.stringify(detail, null, 2) + "\n");
  created++;
  console.log(`+ ${pkg.name} [${pkg.type}] → ${file}`);
}

console.log(`\n[seed] done: ${created} created, ${skipped} skipped, total catalog ${CATALOG.length}`);
console.log(`[seed] run 'npm run registry:build' to rebuild index.json`);
