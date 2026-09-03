# PDF Compress — shrink PDF size without quality loss

Use this skill when a PDF is too large to send, upload, or archive.

## Instructions

1. Measure first (`ls -la`, page count). Ask the target size or pick a sane default (screen: 150 DPI, print: 300 DPI).
2. First pass is always lossless: `qpdf --object-streams=generate`, drop duplicates.
3. Only downsample images if lossless is not enough — never touch vector content.

## Commands

```bash
# pass 1 — lossless cleanup (always safe)
qpdf --object-streams=generate in.pdf out.pdf

# pass 2 — Ghostscript screen quality (~150 DPI images)
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.5 -dPDFSETTINGS=/screen \
   -dNOPAUSE -dQUIET -dBATCH -sOutputFile=out-screen.pdf in.pdf

# pass 2b — print quality (~300 DPI images)
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.5 -dPDFSETTINGS=/prepress \
   -dNOPAUSE -dQUIET -dBATCH -sOutputFile=out-print.pdf in.pdf
```

## Rules

- Report before/after sizes and the ratio for every pass.
- Keep the original; never overwrite it.
- If output is still too big, say exactly which objects dominate (images vs fonts vs embedded files) instead of compressing blindly.
