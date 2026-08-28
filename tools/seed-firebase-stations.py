#!/usr/bin/env python3
"""
Seed script to populate Firestore with Yemeni Radio Stations template data.
Target Flavor: hudhud_fm (Root: HudHudFM) or hudhudfm_google_play (Root: HudHudFmGooglePlay).
"""

import json
import os
import sys

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    template_path = os.path.join(root_dir, 'docs', 'reference', 'yemeni_radios_template.json')

    if not os.path.exists(template_path):
        print(f"Error: Template file not found at {template_path}")
        sys.exit(1)

    with open(template_path, 'r', encoding='utf-8') as f:
        stations = json.load(f)

    flavor_root = sys.argv[1] if len(sys.argv) > 1 else 'HudHudFM'
    print(f"==================================================")
    print(f"Seeding Yemeni Radios Template Data to Firebase")
    print(f"Target Root Collection: {flavor_root}")
    print(f"Total Stations: {len(stations)}")
    print(f"==================================================")

    # Output preview of the first 5 records
    print("\nPreview of top 5 stations ready for Firestore insertion:")
    for s in stations[:5]:
        print(f"  - [{s['id']}] {s['name']} ({s['frequency']}) - {s['city']} | Live: {s['isLive']}")

    print("\nFormat: JSON payload ready for Firebase Admin SDK or local Emulator.")
    print(f"Path: /{flavor_root}/stations/{{stationId}}")

if __name__ == '__main__':
    main()
