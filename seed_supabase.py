#!/usr/bin/env python3

import json
import requests
import sys
import io

# Fix Windows console UTF-8 output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
elif sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = "https://lfyrnsjlazqbnstaasqu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmeXJuc2psYXpxYm5zdGFhc3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMzUzNTYsImV4cCI6MjEwNTgxMTM1Nn0.D4KiIcRg1nH1zQFIBIUXgBD8tHdp0zftdCo9RcTMN60"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

def seed_supabase():
    print("=" * 70)
    print("SEEDING SUPABASE DATABASE WITH AUTHENTIC KŐSZEG ÉS VIDÉKE DATA")
    print("=" * 70)

    # 1. Load real issues & articles
    with open("koszeg_es_videke_archive/processed/processed_index.json", "r", encoding="utf-8") as f:
        processed_index = json.load(f)

    print(f"Total processed issues in index: {len(processed_index)}")

    # Prepare categories
    cats = [
        {"name": "Aktuális", "slug": "aktualis"},
        {"name": "Közélet", "slug": "kozelet"},
        {"name": "Kultúra", "slug": "kultura"},
        {"name": "Sport", "slug": "sport"},
        {"name": "Helytörténet", "slug": "helytortenet"}
    ]

    r_cat = requests.post(f"{SUPABASE_URL}/rest/v1/categories", headers=headers, json=cats)
    print(f"Categories upload status: {r_cat.status_code}")

    # Fetch inserted categories to map UUIDs
    r_cat_get = requests.get(f"{SUPABASE_URL}/rest/v1/categories?select=id,slug", headers=headers)
    cat_map = {}
    if r_cat_get.status_code == 200:
        for c in r_cat_get.json():
            cat_map[c['slug']] = c['id']

    # Prepare authors
    auths = [
        {"name": "Kőszeg és Vidéke Szerkesztőség", "role": "szerkeszto", "bio": "Hivatalos szerkesztőségi közlemények és tudósítások"},
        {"name": "Kiss János", "role": "szerkeszto", "bio": "Helyettes szerkesztő / Főmunkatárs"},
        {"name": "Tóthárpád Ferenc", "role": "szerkeszto", "bio": "Felelős szerkesztő"},
        {"name": "Básthy Béla", "role": "szerzo", "bio": "Polgármester / Városvédő és kultúratörténész"},
        {"name": "Németh Iván", "role": "fotos", "bio": "Fotóriporter / Tudósító"}
    ]

    r_auth = requests.post(f"{SUPABASE_URL}/rest/v1/authors", headers=headers, json=auths)
    print(f"Authors upload status: {r_auth.status_code}")

    r_auth_get = requests.get(f"{SUPABASE_URL}/rest/v1/authors?select=id,name", headers=headers)
    auth_map = {}
    if r_auth_get.status_code == 200:
        for a in r_auth_get.json():
            auth_map[a['name']] = a['id']

    # Upload Issues in batches of 50
    issues_to_upload = []
    for item in processed_index:
        filename = item.get("source_file", "")
        year = item.get("year", 2026)
        month = item.get("month", 1)
        day = item.get("day", 1)
        issue_num = item.get("issue_number", 1)
        pub_date = item.get("publication_date") or f"{year}-{month:02d}-{day:02d}"
        stem = Path(filename).stem
        
        pdf_url = f"/references/{filename}" if stem == "kev_20260914_172" else f"/koszeg_es_videke_archive/pdf/{year}/{filename}"

        issues_to_upload.append({
            "year": year,
            "month": month,
            "issue_number": issue_num,
            "publication_date": pub_date,
            "title": f"Kőszeg és Vidéke – {year}. {month}. szám ({issue_num}. lapszám)",
            "cover_image": f"/archive_covers/{stem}.jpg",
            "pdf_url": pdf_url,
            "source_filename": filename,
            "status": "published"
        })

    print(f"Uploading {len(issues_to_upload)} issues to Supabase...")
    r_iss = requests.post(f"{SUPABASE_URL}/rest/v1/issues", headers=headers, json=issues_to_upload)
    print(f"Issues upload status: {r_iss.status_code}")

    print("=" * 70)
    print("SUPABASE SEED COMPLETE!")
    print("=" * 70)

if __name__ == "__main__":
    seed_supabase()
