# PDF Forms — fill and extract AcroForm form data

Use this skill when the user needs to fill PDF forms programmatically or read submitted form data.

## Instructions

1. Inspect first: list field names and types with `qpdf --json` or `pypdf`.
2. Fill with `pypdf` (set each field, then optionally flatten). XFA (live-cycle) forms are NOT supported — say so immediately.
3. Extract with `pdftk dump_data_fields` or `pypdf`; emit JSON.

## Commands

```bash
# list fields (qpdf)
qpdf --json in.pdf | python -c "import json,sys; [print(f['name'], f.get('type')) for f in json.load(sys.stdin).get('fields', [])]"

# fill + flatten (pip install pypdf)
python -c "
from pypdf import PdfReader, PdfWriter
r = PdfReader('in.pdf'); w = PdfWriter()
w.append(r)
w.update_page_form_field_values(w.pages[0], {'full_name': 'Ada Lovelace', 'city': 'London'})
w.write('filled.pdf')"

# extract field values to JSON (pip install pypdf)
python -c "
import json
from pypdf import PdfReader
f = PdfReader('filled.pdf').get_fields() or {}
print(json.dumps({k: (v.value if hasattr(v,'value') else v) for k, v in f.items()}, indent=2, default=str))"
```

## Rules

- Never flatten unless the user asks — keep a fillable copy by default.
- If the form is XFA, stop and explain; don't waste time on tools that can't handle it.
- Validate required fields after filling and report which are still empty.
