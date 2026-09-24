#!/usr/bin/env python3

import csv
import json
import re
import time
import sys
import io
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# Fix Windows console UTF-8 output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
elif sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


# ============================================================
# CONFIG
# ============================================================

BASE_URL = "https://koszeg.hu"
ARCHIVE_URL = "https://koszeg.hu/hu/aktualis/kev"

OUTPUT_DIR = Path("koszeg_es_videke_archive")

PDF_DIR = OUTPUT_DIR / "pdf"
INDEX_DIR = OUTPUT_DIR / "index"

REQUEST_DELAY = 0.5

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 "
        "(KHTML, like Gecko) "
        "Chrome/153.0 Safari/537.36"
    )
}


# ============================================================
# SESSION
# ============================================================

session = requests.Session()
session.headers.update(HEADERS)


# ============================================================
# HELPERS
# ============================================================

def clean_url(url):
    """
    Normalize URL.
    """
    url = url.strip()

    if url.startswith("//"):
        url = "https:" + url

    elif url.startswith("/"):
        url = urljoin(BASE_URL, url)

    elif not url.startswith("http"):
        url = urljoin(BASE_URL + "/", url)

    return url


def is_kev_pdf(url):
    """
    Only accept Kőszeg és Vidéke PDFs.
    """

    parsed = urlparse(url)

    if parsed.netloc not in {
        "koszeg.hu",
        "www.koszeg.hu"
    }:
        return False

    path = parsed.path.lower()

    return (
        path.endswith(".pdf")
        and "/pictures/koszeg/kev/" in path
        and "kev_" in path
    )


def parse_filename(url):
    """
    Example:

    kev_20220314_114.pdf

    -> date: 2022-03-14
    -> issue_number: 114
    """

    filename = Path(urlparse(url).path).name

    match = re.search(
        r"kev_(\d{4})(\d{2})(\d{2})_(\d+)\.pdf",
        filename,
        re.IGNORECASE
    )

    if not match:
        return {
            "filename": filename,
            "date": None,
            "year": None,
            "month": None,
            "day": None,
            "issue_number": None
        }

    year = int(match.group(1))
    month = int(match.group(2))
    day = int(match.group(3))
    issue_number = int(match.group(4))

    return {
        "filename": filename,
        "date": f"{year:04d}-{month:02d}-{day:02d}",
        "year": year,
        "month": month,
        "day": day,
        "issue_number": issue_number
    }


# ============================================================
# FIND ARCHIVE PAGES
# ============================================================

def get_archive_page(page):
    """
    Current archive appears to use pagination such as:

    /hu/aktualis/kev
    /hu/aktualis/kev?o=1
    /hu/aktualis/kev?o=2
    ...
    """

    if page == 0:
        url = ARCHIVE_URL
    else:
        url = f"{ARCHIVE_URL}?o={page}"

    print(f"[ARCHIVE] {url}")

    response = session.get(url, timeout=30)
    response.raise_for_status()

    return response.text


# ============================================================
# EXTRACT PDF LINKS
# ============================================================

def extract_pdf_links(html):
    soup = BeautifulSoup(html, "html.parser")

    results = []

    for link in soup.find_all("a", href=True):

        href = clean_url(link["href"])

        if is_kev_pdf(href):
            results.append(href)

    return results


# ============================================================
# DISCOVER ALL PDFs
# ============================================================

def discover_pdfs(max_pages=100):

    found = set()

    empty_pages = 0

    for page in range(max_pages):

        try:
            html = get_archive_page(page)

        except Exception as e:
            print(f"[ERROR] Archive page {page}: {e}")
            break

        links = extract_pdf_links(html)

        print(f"        PDFs found on page: {len(links)}")

        before = len(found)

        for link in links:
            found.add(link)

        new_count = len(found) - before

        print(f"        New PDFs: {new_count}")
        print(f"        Total PDFs: {len(found)}")

        if new_count == 0:
            empty_pages += 1
        else:
            empty_pages = 0

        # Stop after several pages without new PDFs
        if empty_pages >= 3:
            print("[INFO] No new PDFs found on several pages. Stopping.")
            break

        time.sleep(REQUEST_DELAY)

    return sorted(found)


# ============================================================
# DOWNLOAD
# ============================================================

def download_pdf(url):

    info = parse_filename(url)

    filename = info["filename"]

    if info["year"]:
        year_dir = PDF_DIR / str(info["year"])
    else:
        year_dir = PDF_DIR / "unknown"

    year_dir.mkdir(parents=True, exist_ok=True)

    destination = year_dir / filename

    # Already downloaded
    if destination.exists() and destination.stat().st_size > 0:

        print(f"[SKIP] {filename}")

        return {
            **info,
            "url": url,
            "local_path": str(destination),
            "status": "already_exists",
            "size_bytes": destination.stat().st_size
        }

    print(f"[DOWNLOAD] {filename}")

    try:

        with session.get(
            url,
            stream=True,
            timeout=60
        ) as response:

            response.raise_for_status()

            with open(destination, "wb") as f:

                for chunk in response.iter_content(
                    chunk_size=1024 * 1024
                ):

                    if chunk:
                        f.write(chunk)

        size = destination.stat().st_size

        if size == 0:
            raise RuntimeError("Downloaded file is empty")

        print(
            f"        OK - "
            f"{size / 1024 / 1024:.2f} MB"
        )

        return {
            **info,
            "url": url,
            "local_path": str(destination),
            "status": "downloaded",
            "size_bytes": size
        }

    except Exception as e:

        print(f"[ERROR] {filename}: {e}")

        if destination.exists():
            destination.unlink()

        return {
            **info,
            "url": url,
            "local_path": str(destination),
            "status": "error",
            "error": str(e),
            "size_bytes": 0
        }


# ============================================================
# SAVE INDEX
# ============================================================

def save_indexes(records):

    INDEX_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    # JSON
    json_file = INDEX_DIR / "issues.json"

    with open(
        json_file,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            records,
            f,
            ensure_ascii=False,
            indent=2
        )

    # CSV
    csv_file = INDEX_DIR / "issues.csv"

    fields = [
        "filename",
        "date",
        "year",
        "month",
        "day",
        "issue_number",
        "url",
        "local_path",
        "status",
        "size_bytes",
        "error"
    ]

    with open(
        csv_file,
        "w",
        encoding="utf-8-sig",
        newline=""
    ) as f:

        writer = csv.DictWriter(
            f,
            fieldnames=fields,
            extrasaction="ignore"
        )

        writer.writeheader()

        writer.writerows(records)

    print()
    print(f"[INDEX] {json_file}")
    print(f"[INDEX] {csv_file}")


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 70)
    print("KŐSZEG ÉS VIDÉKE - PDF DOWNLOADER")
    print("=" * 70)
    print()

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    PDF_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    INDEX_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    # --------------------------------------------------------
    # DISCOVER
    # --------------------------------------------------------

    urls = discover_pdfs()

    print()
    print("=" * 70)
    print(f"TOTAL UNIQUE PDFs FOUND: {len(urls)}")
    print("=" * 70)
    print()

    # Save discovered URLs before downloading
    discovered_file = INDEX_DIR / "discovered_urls.txt"

    with open(
        discovered_file,
        "w",
        encoding="utf-8"
    ) as f:

        for url in urls:
            f.write(url + "\n")

    # --------------------------------------------------------
    # DOWNLOAD
    # --------------------------------------------------------

    records = []

    for index, url in enumerate(urls, start=1):

        print(
            f"[{index}/{len(urls)}] "
            f"{url}"
        )

        result = download_pdf(url)

        records.append(result)

        time.sleep(REQUEST_DELAY)

    # --------------------------------------------------------
    # INDEX
    # --------------------------------------------------------

    save_indexes(records)

    # --------------------------------------------------------
    # SUMMARY
    # --------------------------------------------------------

    downloaded = sum(
        1
        for r in records
        if r["status"] == "downloaded"
    )

    existing = sum(
        1
        for r in records
        if r["status"] == "already_exists"
    )

    errors = sum(
        1
        for r in records
        if r["status"] == "error"
    )

    total_size = sum(
        r.get("size_bytes", 0)
        for r in records
    )

    print()
    print("=" * 70)
    print("DONE")
    print("=" * 70)
    print(f"PDFs found:       {len(urls)}")
    print(f"Downloaded:       {downloaded}")
    print(f"Already existed:  {existing}")
    print(f"Errors:           {errors}")
    print(
        f"Total size:       "
        f"{total_size / 1024 / 1024:.1f} MB"
    )
    print()
    print(f"Output directory: {OUTPUT_DIR.resolve()}")
    print("=" * 70)


if __name__ == "__main__":
    main()
