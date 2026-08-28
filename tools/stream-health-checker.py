#!/usr/bin/env python3
"""
Stream Health Checker:
Tests audio streaming URLs (HLS, Icecast, Shoutcast, MP3, AAC) for live radio stations,
reports latency, HTTP status, and auto-detects stream health.
"""

import json
import os
import sys
import time
import urllib.request

def check_stream_url(url, timeout=5):
    if not url or not url.startswith("http"):
        return {"status": "NO_URL", "isLive": False, "latencyMs": 0, "code": 0}
    
    start_time = time.time()
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (FM-Pro Stream Health Checker 1.0)',
                'Icy-MetaData': '1'
            }
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            latency = int((time.time() - start_time) * 1000)
            code = response.getcode()
            content_type = response.headers.get('Content-Type', '')
            is_audio = 'audio' in content_type or 'mpeg' in content_type or 'aac' in content_type or 'ogg' in content_type or 'octet-stream' in content_type or code == 200
            
            return {
                "status": "LIVE" if (200 <= code < 400 and is_audio) else "DEGRADED",
                "isLive": (200 <= code < 400),
                "latencyMs": latency,
                "code": code,
                "contentType": content_type
            }
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        return {
            "status": "OFFLINE",
            "isLive": False,
            "latencyMs": latency,
            "code": 0,
            "error": str(e)
        }

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    template_file = os.path.join(root_dir, 'docs', 'reference', 'yemeni_radios_template.json')

    if not os.path.exists(template_file):
        print(f"Error: Template file not found at {template_file}")
        sys.exit(1)

    with open(template_file, 'r', encoding='utf-8') as f:
        stations = json.load(f)

    print("=" * 60)
    print(f"FM-Pro: Live Stream Health Monitor")
    print(f"Checking {len(stations)} Stations...")
    print("=" * 60)

    live_count = 0
    checked_count = 0

    for s in stations:
        url = s.get('streamUrl')
        if url:
            checked_count += 1
            res = check_stream_url(url, timeout=4)
            s['isLive'] = res['isLive']
            s['streamLatencyMs'] = res['latencyMs']
            status_symbol = "🟢" if res['isLive'] else "🔴"
            print(f"{status_symbol} [{res['status']}] {s['name']} | {res['latencyMs']}ms | URL: {url[:35]}...")
            if res['isLive']:
                live_count += 1

    print("\n" + "=" * 60)
    print(f"Stream Health Check Summary: {live_count}/{checked_count} Streams Active ({len(stations)} total stations)")
    print("=" * 60)

if __name__ == '__main__':
    main()
