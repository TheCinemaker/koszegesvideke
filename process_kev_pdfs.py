#!/usr/bin/env python3

import json
import re
import sys
import io
from pathlib import Path

import fitz  # PyMuPDF

# Fix Windows console UTF-8 output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
elif sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


INPUT_DIR = Path("koszeg_es_videke_archive/pdf")
OUTPUT_DIR = Path("koszeg_es_videke_archive/processed")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def clean_text(text):
    """Normalize extracted PDF text."""

    text = text.replace("\xa0", " ")

    # Remove excessive whitespace
    text = re.sub(r"[ \t]+", " ", text)

    # Normalize empty lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def extract_pdf(pdf_path):

    print(f"\nPROCESSING: {pdf_path.name}")

    doc = fitz.open(pdf_path)

    pages = []

    total_chars = 0

    for page_number, page in enumerate(doc, start=1):

        text = page.get_text("text")

        text = clean_text(text)

        char_count = len(text)

        total_chars += char_count

        pages.append({
            "page": page_number,
            "text": text,
            "characters": char_count
        })

        print(
            f"  Page {page_number:02d}: "
            f"{char_count:6d} chars"
        )

    doc.close()

    return pages, total_chars


def process_file(pdf_path):

    try:

        pages, total_chars = extract_pdf(pdf_path)

        # ----------------------------------------------------
        # Basic metadata from filename
        # ----------------------------------------------------

        filename = pdf_path.name

        match = re.match(
            r"kev_(\d{4})(\d{2})(\d{2})_(\d+)\.pdf",
            filename,
            re.IGNORECASE
        )

        if match:

            year = int(match.group(1))
            month = int(match.group(2))
            day = int(match.group(3))
            issue_number = int(match.group(4))

            publication_date = (
                f"{year:04d}-{month:02d}-{day:02d}"
            )

        else:

            year = None
            month = None
            day = None
            issue_number = None
            publication_date = None

        # ----------------------------------------------------
        # Quality estimate
        # ----------------------------------------------------

        avg_chars = (
            total_chars / len(pages)
            if pages
            else 0
        )

        if avg_chars > 1500:
            extraction_status = "good"

        elif avg_chars > 500:
            extraction_status = "partial"

        else:
            extraction_status = "ocr_needed"

        result = {

            "source_file": filename,

            "year": year,
            "month": month,
            "day": day,
            "publication_date": publication_date,

            "issue_number": issue_number,

            "page_count": len(pages),

            "total_characters": total_chars,

            "average_characters_per_page": round(
                avg_chars,
                2
            ),

            "extraction_status": extraction_status,

            "pages": pages
        }

        output_file = (
            OUTPUT_DIR /
            f"{pdf_path.stem}.json"
        )

        with open(
            output_file,
            "w",
            encoding="utf-8"
        ) as f:

            json.dump(
                result,
                f,
                ensure_ascii=False,
                indent=2
            )

        print(
            f"  → {output_file.name}"
        )

        print(
            f"  STATUS: {extraction_status}"
        )

        return result

    except Exception as e:

        print(
            f"ERROR processing "
            f"{pdf_path.name}: {e}"
        )

        return {
            "source_file": pdf_path.name,
            "error": str(e)
        }


def main():

    print("=" * 70)
    print("KŐSZEG ÉS VIDÉKE - PDF TEXT EXTRACTION")
    print("=" * 70)

    pdf_files = sorted(
        INPUT_DIR.rglob("*.pdf")
    )

    print(
        f"\nPDF files found: "
        f"{len(pdf_files)}"
    )

    results = []

    for pdf in pdf_files:

        result = process_file(pdf)

        results.append(result)

    # --------------------------------------------------------
    # Master index
    # --------------------------------------------------------

    index_file = (
        OUTPUT_DIR /
        "processed_index.json"
    )

    with open(
        index_file,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            results,
            f,
            ensure_ascii=False,
            indent=2
        )

    # --------------------------------------------------------
    # Statistics
    # --------------------------------------------------------

    good = 0
    partial = 0
    ocr = 0
    errors = 0

    for result in results:

        status = result.get(
            "extraction_status"
        )

        if status == "good":
            good += 1

        elif status == "partial":
            partial += 1

        elif status == "ocr_needed":
            ocr += 1

        elif "error" in result:
            errors += 1

    print()
    print("=" * 70)
    print("PROCESSING COMPLETE")
    print("=" * 70)

    print(
        f"Total PDFs:       {len(results)}"
    )

    print(
        f"Good extraction:  {good}"
    )

    print(
        f"Partial:          {partial}"
    )

    print(
        f"OCR required:     {ocr}"
    )

    print(
        f"Errors:           {errors}"
    )

    print()
    print(
        f"Output: "
        f"{OUTPUT_DIR.resolve()}"
    )

    print("=" * 70)


if __name__ == "__main__":
    main()
