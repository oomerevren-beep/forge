# PDF Split — extract pages and split PDFs by range

Use this skill when the user wants specific pages (or page ranges) out of a PDF.

## Instructions

1. Confirm the input file, the page ranges (1-based, e.g. `1-3,5,8-10`), and the output naming.
2. Prefer: `qpdf`, then `pdftk`, then `pypdf`.
3. One output file per range unless the user asks for single pages.

## Commands

```bash
# qpdf: pages 1-3 and 8-10 into one file
qpdf in.pdf --pages in.pdf 1-3,8-10 -- out.pdf

# qpdf: burst into single pages (out-001.pdf, ...)
qpdf in.pdf --split-pages out-%d.pdf

# pdftk alternative
pdftk in.pdf cat 1-3 8-10 output out.pdf

# Python fallback (pip install pypdf)
python -c "
from pypdf import PdfReader, PdfWriter
r = PdfReader('in.pdf'); w = PdfWriter()
for i in [0,1,2,7,8,9]: w.add_page(r.pages[i])
w.write('out.pdf')"
```

## Rules

- Page numbers are 1-based for the user; convert to 0-based only inside code.
- Validate ranges against the real page count first (`qpdf --show-npages in.pdf`).
- Never overwrite the input file.
