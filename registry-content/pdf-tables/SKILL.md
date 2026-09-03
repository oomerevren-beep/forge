# PDF Tables — detect and export tables from PDFs to CSV

Use this skill when the user needs tabular data out of a PDF as CSV.

## Instructions

1. Ruled tables (visible cell borders): `pdfplumber` with default settings.
2. Borderless tables: `pdfplumber` with `text_x_tolerance`/`text_y_tolerance` tuned, or `camelot` lattice/stream.
3. Always show the user a preview (first 3 rows + row count) before writing files.

## Commands

```bash
# ruled tables (pip install pdfplumber)
python -c "
import pdfplumber
with pdfplumber.open('in.pdf') as pdf:
    for i, page in enumerate(pdf.pages):
        for t, table in enumerate(page.extract_tables() or []):
            rows = [[(c or '').replace(chr(10),' ') for c in row] for row in table]
            import csv
            with open(f'table-p{i}-{t}.csv','w',newline='') as f:
                csv.writer(f).writerows(rows)
            print(f'table-p{i}-{t}.csv: {len(rows)} rows x {len(rows[0])} cols')"

# borderless tables: loosen tolerances
python -c "
import pdfplumber
with pdfplumber.open('in.pdf') as pdf:
    settings = {'text_x_tolerance': 6, 'text_y_tolerance': 6}
    for i, page in enumerate(pdf.pages):
        tables = page.extract_tables(table_settings=settings) or []
        print(f'page {i}: {len(tables)} table(s)')"
```

## Rules

- One CSV per table: `table-p<page>-<n>.csv`, UTF-8, comma-separated.
- Merged header cells repeat across rows — normalize them and say you did.
- If a page has no detectable tables, say so per page instead of writing empty files.
