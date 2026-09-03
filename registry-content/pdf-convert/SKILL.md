# PDF Convert — PDF to Word, HTML, Markdown and back

Use this skill for format conversions in either direction.

## Instructions

1. PDF → Markdown/text: `pdftotext -layout` for simple docs; `pymupdf4llm` (Python) when headings and tables must survive.
2. PDF → HTML: `pdf2htmlEX` if available, else `pymupdf` HTML export.
3. Any → PDF: `libreoffice --headless --convert-to pdf` for Office docs; `pandoc` for Markdown.
4. Scanned source → run the `pdf/ocr` skill first.

## Commands

```bash
# PDF -> Markdown with structure (pip install pymupdf4llm)
python -c "import pymupdf4llm; open('out.md','w').write(pymupdf4llm.to_markdown('in.pdf'))"

# PDF -> plain text with layout
pdftotext -layout in.pdf out.txt

# Office -> PDF (libreoffice)
libreoffice --headless --convert-to pdf --outdir . in.docx

# Markdown -> PDF (pandoc + a PDF engine)
pandoc in.md -o out.pdf --pdf-engine=xelatex -V geometry:margin=1in
```

## Rules

- Warn upfront that pixel-perfect round-trips don't exist — say what will be lost (fonts, complex tables, exact layout).
- For Word output, prefer `.docx` via `libreoffice` only when the user explicitly needs editability.
- Verify the output opens and report page count.
