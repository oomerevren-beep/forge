# examples/github-action/README.md

## Official Forge GitHub Action

Add automatic security auditing and compliance checks to your project with every PR.

### Usage

Create `.github/workflows/forge-audit.yml`:

```yaml
name: Forge Audit
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  forge-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm i -g tryforge
      - run: forge audit
```

### Badge

Add to your project README:

```markdown
[![Managed by Forge](https://img.shields.io/badge/Agent%20Context-Forge-6366f1?style=flat-square&logo=anthropic)](https://github.com/oomerevren-beep/forge)
```

Rendered:

[![Managed by Forge](https://img.shields.io/badge/Agent%20Context-Forge-6366f1?style=flat-square&logo=anthropic)](https://github.com/oomerevren-beep/forge)
