# PDF OCR — scanned PDFs to searchable text

Use this skill when the user has a scanned/image PDF and needs selectable, searchable text.

## Instructions

1. Check whether the PDF already has a text layer (`pdftotext in.pdf - | head`). If yes, skip OCR.
2. For OCR use `ocrmypdf` (embeds an invisible text layer, keeps layout); fallback: `tesseract` per page.
3. Detect language: default `eng`; ask when the document is not English (`ocrmypdf -l tur ...`).

## Commands

```bash
# check for existing text layer
pdftotext in.pdf - | head -c 500

# best path: searchable PDF, original layout kept
ocrmypdf -l eng --deskew in.pdf out.pdf

# force OCR even if a (broken) text layer exists
ocrmypdf -l eng --force-ocr in.pdf out.pdf

# fallback without ocrmypdf: render + tesseract (needs poppler)
pdftoppm -png -r 300 in.pdf page
tesseract page-1.png out -l eng pdf
```

## Rules

- Keep the original file; write OCR output to a new file.
- At 300 DPI minimum for decent accuracy; warn if the scan is below 150 DPI.
- Report OCR confidence when available and flag low-confidence pages.
- Never "fix" recognized text silently — present it as OCR output.
