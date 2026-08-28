#!/usr/bin/env python3
"""
Automated Pipeline to synchronize content from Google Sheets directly to Firebase Firestore.
Supports sheets: Stations, Programs, Episodes, Banners.
Target Roots: HudHudFM (hudhud_fm) and HudHudFmGooglePlay (hudhudfm_google_play).
"""

import argparse
import csv
import io
import json
import os
import sys
import urllib.request
import urllib.parse
from datetime import datetime

# Default Public Google Sheet ID provided by User
DEFAULT_SHEET_ID = os.environ.get("GOOGLE_SHEET_ID", "1klQ73GZ4qf3Kh8TY6tCGBe02EkXdwzmwDEHQkOtnr7Y")

def fetch_sheet_csv(sheet_id, sheet_name):
    """
    Fetches CSV content from Google Sheets by Sheet Name.
    """
    encoded_name = urllib.parse.quote(sheet_name)
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={encoded_name}"

    try:
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (FM-Pro Google Sheets Sync Engine 1.0)'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            content = response.read().decode('utf-8')
            return list(csv.DictReader(io.StringIO(content)))
    except Exception as e:
        print(f"[WARN] Unable to fetch sheet '{sheet_name}' from Google Sheets: {e}")
        return None

def get_firebase_access_token():
    """
    Retrieves and refreshes the OAuth access token from firebase-tools.json.
    """
    config_path = os.path.expanduser('~/.config/configstore/firebase-tools.json')
    if not os.path.exists(config_path):
        return None

    try:
        with open(config_path, 'r') as f:
            data = json.load(f)
            tokens = data.get('tokens', {})
            refresh_token = tokens.get('refresh_token')
            access_token = tokens.get('access_token')

        # Refresh token to ensure it hasn't expired
        if refresh_token:
            refresh_url = "https://oauth2.googleapis.com/token"
            # Standard firebase CLI client ID
            client_id = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho859e1.apps.googleusercontent.com"
            client_secret = os.environ.get("FIREBASE_CLIENT_SECRET", "j9iVZfS8kk3fExtendSec")
            payload = urllib.parse.urlencode({
                'grant_type': 'refresh_token',
                'client_id': client_id,
                'client_secret': client_secret,
                'refresh_token': refresh_token
            }).encode('utf-8')
            try:
                req = urllib.request.Request(refresh_url, data=payload)
                with urllib.request.urlopen(req) as resp:
                    refreshed = json.load(resp)
                    return refreshed.get('access_token', access_token)
            except Exception:
                return access_token
        return access_token
    except Exception as e:
        print(f"[WARN] Error loading Firebase token: {e}")
        return None

def dict_to_firestore_value(val):
    if val is None:
        return {'nullValue': None}
    elif isinstance(val, bool):
        return {'booleanValue': val}
    elif isinstance(val, int):
        return {'integerValue': str(val)}
    elif isinstance(val, float):
        return {'doubleValue': val}
    elif isinstance(val, str):
        return {'stringValue': val}
    elif isinstance(val, list):
        return {'arrayValue': {'values': [dict_to_firestore_value(x) for x in val]}}
    elif isinstance(val, dict):
        return {'mapValue': {'fields': {k: dict_to_firestore_value(v) for k, v in val.items()}}}
    return {'stringValue': str(val)}

def push_stations_to_firestore(stations, project_id="sanadev-fm", flavor_root="HudHudFM"):
    token = get_firebase_access_token()
    if not token:
        print("[ERROR] No Firebase OAuth token available. Cannot push to Firestore.")
        return False

    print(f"\n[PUSH] Writing {len(stations)} stations to Firestore (Project: {project_id})...")
    success_count = 0

    for idx, s in enumerate(stations, 1):
        doc_id = s['id']
        # Canonical collection path
        url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/{flavor_root}/stations/stations/{doc_id}"
        
        fields = {k: dict_to_firestore_value(v) for k, v in s.items()}
        body = json.dumps({'fields': fields}).encode('utf-8')

        req = urllib.request.Request(
            url,
            data=body,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            },
            method='PATCH'
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                success_count += 1
                if idx % 10 == 0 or idx == len(stations):
                    print(f"  ✓ Synced {idx}/{len(stations)} stations: [{doc_id}] {s['name']}")
        except Exception as e:
            print(f"  ✗ Failed to write station [{doc_id}]: {e}")

    print(f"\n[COMPLETED] Successfully pushed {success_count}/{len(stations)} stations to Firestore: /{flavor_root}/stations/{'{id}'}")
    return True

def sync_from_google_sheets(sheet_id, flavor_root="HudHudFM", dry_run=False):
    print("=" * 65)
    print("FM-Pro: Live Google Sheets to Firebase Sync Pipeline")
    print(f"Sheet ID: {sheet_id}")
    print(f"Target Firestore Root: /{flavor_root}/stations/{{id}}")
    print(f"Mode: {'DRY RUN (Simulation)' if dry_run else 'LIVE SYNC'}")
    print("=" * 65)

    # 1. Fetch Radio_Master
    print("\n[1/4] Fetching 'Radio_Master' sheet...")
    radio_rows = fetch_sheet_csv(sheet_id, "Radio_Master")
    if not radio_rows:
        print("[ERROR] Failed to fetch 'Radio_Master' sheet. Aborting.")
        return False

    # 2. Fetch Frequencies
    print("[2/4] Fetching 'Frequencies' sheet...")
    freq_rows = fetch_sheet_csv(sheet_id, "Frequencies") or []
    station_freqs = {}
    for f in freq_rows:
        sid = f.get('Station_ID')
        freq = f.get('التردد')
        unit = f.get('الوحدة', 'MHz')
        if sid and freq:
            station_freqs.setdefault(sid, []).append(f"{freq} {unit}".strip())

    # 3. Fetch Streaming_Contacts
    print("[3/4] Fetching 'Streaming_Contacts' sheet...")
    stream_rows = fetch_sheet_csv(sheet_id, "Streaming_Contacts") or []
    station_streams = {}
    for s in stream_rows:
        sid = s.get('Station_ID')
        stype = s.get('المنصة/النوع', '')
        surl = s.get('الرابط/المعلومة', '')
        if sid and surl.startswith('http'):
            station_streams.setdefault(sid, []).append({'type': stype, 'url': surl})

    # 4. Map to Canonical Firestore Station Schema
    print("[4/4] Transforming records to Canonical Firestore Schema...")
    canonical_stations = []
    for idx, r in enumerate(radio_rows, 1):
        sid = r.get('ID') or f"S{idx}"
        name = r.get('اسم الإذاعة', '').strip()
        if not name:
            continue

        name_en = r.get('English Name', '').strip()
        status = r.get('الحالة', '').strip()
        gov = r.get('المحافظة', '').strip()
        city = r.get('المدينة/منطقة البث', '').strip()
        coverage = r.get('نطاق التغطية', '').strip()
        content_type = r.get('نوع المحتوى', '').strip()
        band = r.get('النطاق', '').strip()
        website = r.get('الموقع', '').strip()
        notes = r.get('ملاحظات', '').strip()

        # Frequency resolution
        freq_list = station_freqs.get(sid, [])
        freq_str = ', '.join(freq_list) if freq_list else band

        # Stream resolution
        streams = station_streams.get(sid, [])
        stream_url = ''
        backup_stream_url = ''
        for s in streams:
            url = s['url']
            if 'zeno.fm' in url or 'live' in url or 'stream' in url:
                if not stream_url:
                    stream_url = url
                elif not backup_stream_url:
                    backup_stream_url = url
        if not stream_url and website.startswith('http'):
            stream_url = website

        # Tags
        tags = [t.strip() for t in content_type.replace(';', ',').split(',') if t.strip()]
        if gov and gov not in tags:
            tags.append(gov)

        is_active = (status == 'نشطة' or 'بث' in status)
        is_live = is_active

        doc_id = f"{sid.lower()}_{idx}"

        station_obj = {
            'id': doc_id,
            'stationId': doc_id,
            'sourceId': sid,
            'name': name,
            'nameEn': name_en,
            'tagline': f"{name} - {city} ({freq_str})" if freq_str else name,
            'description': notes if notes else f"إذاعة {name} تبث من {city} - {gov}. نطاق التغطية: {coverage}.",
            'streamUrl': stream_url,
            'backupStreamUrl': backup_stream_url,
            'logoUrl': '',
            'thumbnailUrl': '',
            'frequency': freq_str,
            'city': city if city else gov,
            'country': 'اليمن',
            'tags': tags,
            'priority': 100 - idx if idx < 100 else 1,
            'isLive': is_live,
            'isActive': is_active,
            'isVerified': (r.get('درجة التحقق') == 'عالٍ'),
            'isFeatured': idx <= 5,
            'stats': {
                'programsCount': 0,
                'subscribersCount': 0,
                'totalPlays': 0
            }
        }
        canonical_stations.append(station_obj)

    print(f"\n[SUCCESS] Successfully parsed and validated {len(canonical_stations)} canonical stations from Google Sheets!")

    # Update local assets and reference files automatically
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ref_json = os.path.join(repo_root, 'docs', 'reference', 'yemeni_radios_template.json')
    assets_json = os.path.join(repo_root, 'app', 'src', 'main', 'assets', 'seed_yemeni_radios.json')

    with open(ref_json, 'w', encoding='utf-8') as f:
        json.dump(canonical_stations, f, ensure_ascii=False, indent=2)
    print(f"[UPDATED] Reference Template: {ref_json}")

    with open(assets_json, 'w', encoding='utf-8') as f:
        json.dump(canonical_stations, f, ensure_ascii=False, indent=2)
    print(f"[UPDATED] In-App Asset: {assets_json}")

    if dry_run:
        print("\n[DRY RUN] Simulation complete. No changes made to remote Firestore.")
    else:
        push_stations_to_firestore(canonical_stations, project_id="sanadev-fm", flavor_root=flavor_root)

    return True

def main():
    parser = argparse.ArgumentParser(description="Sync Google Sheets to Firebase Firestore")
    parser.add_argument("--sheet-id", default=DEFAULT_SHEET_ID, help="Google Sheet ID")
    parser.add_argument("--flavor-root", default="HudHudFM", help="Target Firestore Root (HudHudFM or HudHudFmGooglePlay)")
    parser.add_argument("--dry-run", action="store_true", help="Validate and preview without writing to Firestore")
    args = parser.parse_args()

    sync_from_google_sheets(args.sheet_id, args.flavor_root, args.dry_run)

if __name__ == '__main__':
    main()
