# Forge Package Spec — forge.toml

## 1. Tam Ornek

```toml
[package]
name = "anthropics/plan"
version = "1.2.0"
type = "skill"
description = "Plan mode skill for Claude Code — structured planning before coding"
license = "MIT"
homepage = "https://github.com/anthropics/skills"
repository = "https://github.com/anthropics/skills"
author = "Anthropic <skills@anthropic.com>"
keywords = ["planning", "workflow", "claude-code"]
# Kaynak: monorepo ise alt yol
source = "skills/plan"

[engines]
claude-code = ">=1.0.0"
opencode = ">=0.5.0"
codex = "*"
cursor = "*"
dsh = "*"

# Bagimliliklar (forge paketleri)
[dependencies]
"obra/superpowers" = "^2.0.0"
"mcp/filesystem" = "^1.0.0"

# Hangi dosyalar pakete dahil
[files]
include = ["SKILL.md", "scripts/**", "references/**", "assets/**"]
exclude = ["test/**", "*.log"]

# MCP ise config sablonu
[mcp]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
env = { "DEBUG" = "1" }

# Plugin ise hook'lar
[plugin]
entry = "index.js"
hooks = ["pre-tool", "post-tool"]

# Skill ise metadata
[skill]
name = "plan"
invocation = "/plan"
allowed-tools = ["Read", "Write", "Bash"]

[publish]
registry = "https://registry.forge.sh"
access = "public" # public | private
```

## 2. Alanlar

### [package]

- `name` (zorunlu): `scope/name` formatinda, scope = GitHub org/user. Or: `anthropics/plan`, `mcp/filesystem`
- `version` (zorunlu): semver `MAJOR.MINOR.PATCH`
- `type` (zorunlu): `skill` | `mcp` | `plugin` | `agent` | `command` | `hook`
- `description` (zorunlu): 1 cumle aciklama (registry search icin)
- `license`, `homepage`, `repository`, `author`, `keywords` (opsiyonel ama onerilir)
- `source` (opsiyonel): Monorepo icinde alt klasor (or: `skills/plan`)

### [engines]

Hangi harness'larda calisir. `*` = hepsi, `>=x` = versiyon kisiti. Bos ise `*` sayilir.

### [dependencies]

Diger forge paketlerine bagimlilik. Semver range: `^1.2.0`, `~1.2.0`, `*`, `>=1.0.0`.

### [files]

`include` glob'lari pakete dahil edilir. `exclude` haric tutar. Default: `["**/*"]` minus `.git`, `node_modules`.

### Tip-ozel bolumler

- `[mcp]`: `command`, `args`, `env`
- `[plugin]`: `entry`, `hooks`
- `[skill]`: `name`, `invocation`, `allowed-tools`
- `[agent]`: `model`, `tools`, `prompt`

## 3. Dosya Konumu

- Paket kokunde `forge.toml` olmali
- Proje (tuketici) tarafinda da `forge.toml` olabilir:

```toml
# my-project/forge.toml
[project]
name = "my-app"
version = "0.1.0"

[dependencies]
"anthropics/plan" = "^1.2.0"
"mcp/filesystem" = "^2.0.0"
"obra/superpowers" = "^3.0.0"
```

`forge install` bu dosyayi okur ve hepsini kurar (npm'deki `package.json` gibi).

## 4. Validasyon

`forge publish` oncesi:

- `name` regex: `^[a-z0-9-]+\/[a-z0-9-]+$`
- `version` semver olmali
- `type` gecerli olmali
- `description` 10-200 karakter
- `files.include` en az 1 dosya eslesmeli
- `mcp` tipi icin `mcp.command` zorunlu

## 5. Ornekler

### Skill
```toml
[package]
name = "taste/skill"
version = "1.0.0"
type = "skill"
description = "Give your AI good taste — stop boring outputs"
```

### MCP
```toml
[package]
name = "mcp/github"
version = "1.5.0"
type = "mcp"
description = "GitHub MCP server — issues, PRs, repos"
[mcp]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env = { "GITHUB_TOKEN" = "${GITHUB_TOKEN}" }
```

### Agent
```toml
[package]
name = "agency/frontend-wizard"
version = "2.1.0"
type = "agent"
description = "Frontend wizard subagent — React, Tailwind, shadcn"
[agent]
model = "claude-sonnet-4"
tools = ["Read", "Write", "Bash", "WebFetch"]
```
