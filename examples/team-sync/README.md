# Team Sync Example

Bir projede herkesin aynı agent paketlerini alması: `forge.toml` + `forge.lock`.

## Dene

```bash
cd examples/team-sync
cat forge.toml
forge install --dry-run   # ne kurulacağını gösterir, yazmaz
forge install             # kurar + forge.lock yazar
forge install --frozen    # CI: lock'taki exact sürümler
```
