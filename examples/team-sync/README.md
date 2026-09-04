# Team Sync Example

Everyone on a project gets the same agent packages: `forge.toml` + `forge.lock`.

## Try

```bash
cd examples/team-sync
cat forge.toml
forge install --dry-run   # shows what would be installed, writes nothing
forge install             # installs + writes forge.lock
forge install --frozen    # CI: exact locked versions
```
