# PDF Merge — combine multiple PDFs into one document

Use this skill when the user wants to join two or more PDF files into a single PDF.

## Instructions

1. Ask for (or confirm) the input files in merge order and the output path.
2. Prefer lossless tools in this order: `qpdf`, `pdftk`, `pypdf` (Python), `pdfunite` (poppler).
3. Never re-render pages — merge must preserve vector content, fonts, and metadata.
4. Verify the result: page count of output equals the sum of input page counts.

## Commands

```bash
# qpdf (recommended)
qpdf --empty --pages a.pdf b.pdf c.pdf -- out.pdf

# pdftk alternative
pdftk a.pdf b.pdf c.pdf cat output out.pdf

# Python fallback (pip install pypdf)
python -c "
from pypdf import PdfMerger
m = PdfMerger()
for f in ['a.pdf','b.pdf','c.pdf']: m.append(f)
m.write('out.pdf'); m.close()"
```

## Rules

- Keep the input order exactly as given; confirm before writing.
- If an input is password-protected, ask for the password — never guess or strip silently.
- Report input page counts and output page count after merging.
