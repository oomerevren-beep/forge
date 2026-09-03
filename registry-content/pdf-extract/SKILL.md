# PDF Extract — pull text, tables and images from PDFs

Use this skill when the user wants text, tables, or images out of a PDF.

## Instructions

1. Text first: `pdftotext -layout` preserves reading order best. Scanned pages → delegate to the `pdf/ocr` skill.
2. Tables: `pdfplumber` (Python) for ruled tables; fall back to `tabula`/`camelot` for borderless ones.
3. Images: `pdfimages -all` extracts at native resolution.

## Commands

```bash
# text with layout
pdftotext -layout in.pdf out.txt

# tables to CSV (pip install pdfplumber)
python -c "
import pdfplumber
with pdfplumber.open('in.pdf') as pdf:
    for i, page in enumerate(pdf.pages):
        for t, table in enumerate(page.extract_tables() or []):
            with open(f'page{i}-table{t}.csv','w') as f:
                for row in table:
                    f.write(','.join((c or '').replace(',',';') for c in row) + '\n')"

# images at native resolution (poppler)
pdfimages -all in.pdf img
```

## Rules

- Tell the user which pages yielded no text (likely scanned) instead of returning empty output.
- CSV output: one file per table, named `page<N>-table<M>.csv`.
- Never upscale extracted images; report their native resolution.
