#!/usr/bin/env python3
"""
Seeds Firebase Firestore with rich, realistic, Arabic-localized dummy and production seed data for HudHudFM / FM-Pro.
Adheres strictly to docs/contracts/firebase-data-contract.md and canonical + legacy compatibility schemas.

Collections seeded:
- Stations: /{root}/stations/stations/{id} & /{root}/RadioInfo/RadioInfo/{id}
- Programs: /{root}/programs/programs/{id} & /{root}/RadioProgram/RadioProgram/{id} & /{root}/RadioProgram/{stationId}/RadioProgram/{id}
- Episodes: /{root}/episodes/episodes/{id} & /{root}/Episode/Episode/{id} & /{root}/Episode/{stationId}/Episode/{id}
- Comments: /{root}/episodes/episodes/{id}/comments/{id} & /{root}/Episode/Episode/{id}/comments/{id}
- Likes:    /{root}/episodes/episodes/{id}/likes/{uid} & /{root}/Episode/Episode/{id}/likes/{uid}
- Users:    /{root}/users/users/{id} (with favorites and subscriptions)
- Banners:  /{root}/banners/banners/{id} & /{root}/Advertisement/Advertisement/{id}
"""

import datetime
import json
import os
import sys
import time
import urllib.request
import urllib.parse

def get_firebase_access_token():
    # 1. Check environment variable
    token = os.environ.get('FIREBASE_TOKEN')
    if token:
        return token

    # 2. Check ~/.config/configstore/firebase-tools.json
    config_path = os.path.expanduser('~/.config/configstore/firebase-tools.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                tokens = data.get('tokens', {})
                access_token = tokens.get('access_token')
                if access_token:
                    return access_token
        except Exception as e:
            print(f"[WARN] Error reading firebase-tools.json: {e}")

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
        # Check if ISO 8601 timestamp string
        if len(val) >= 20 and val.endswith('Z') and 'T' in val:
            return {'timestampValue': val}
        return {'stringValue': val}
    elif isinstance(val, list):
        return {'arrayValue': {'values': [dict_to_firestore_value(x) for x in val]}}
    elif isinstance(val, dict):
        return {'mapValue': {'fields': {k: dict_to_firestore_value(v) for k, v in val.items()}}}
    return {'stringValue': str(val)}

def write_firestore_doc(token, project_id, path, data, dry_run=False):
    if dry_run:
        print(f"  [DRY-RUN] Write: {path}")
        return True

    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/{path}"
    fields = {k: dict_to_firestore_value(v) for k, v in data.items()}
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
        with urllib.request.urlopen(req, timeout=12) as resp:
            return resp.status in (200, 201)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8', errors='ignore')
        print(f"  ❌ HTTP Error {e.code} writing {path}: {err_msg}")
        return False
    except Exception as e:
        print(f"  ❌ Network/Timeout error writing {path}: {e}")
        return False

def load_seed_yemeni_radios():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, '..'))
    asset_path = os.path.join(project_root, 'app', 'src', 'main', 'assets', 'seed_yemeni_radios.json')
    if os.path.exists(asset_path):
        try:
            with open(asset_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[WARN] Error reading seed_yemeni_radios.json: {e}")
    return []

def main():
    dry_run = "--dry-run" in sys.argv
    project_id = "sanadev-fm"
    root = "HudHudFM"

    if "--project" in sys.argv:
        idx = sys.argv.index("--project")
        if idx + 1 < len(sys.argv):
            project_id = sys.argv[idx + 1]

    if "--flavor-root" in sys.argv:
        idx = sys.argv.index("--flavor-root")
        if idx + 1 < len(sys.argv):
            root = sys.argv[idx + 1]

    token = None
    if not dry_run:
        token = get_firebase_access_token()
        if not token:
            print("[ERROR] No Firebase authentication token found.")
            print("Please run `npx firebase-tools login` or export `FIREBASE_TOKEN`.")
            sys.exit(1)

    now_iso = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    now_millis = int(time.time() * 1000)

    print("=" * 70)
    print(f"🚀 Seeding Full Realistic Arabic Data for FM-Pro / HudHudFM")
    print(f"• Project ID   : {project_id}")
    print(f"• Root Path    : /{root}")
    print(f"• Timestamp    : {now_iso}")
    print(f"• Dry Run Mode : {dry_run}")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. RADIO STATIONS (Dual Schema: Canonical + Legacy)
    # -------------------------------------------------------------
    print("\n📻 [1/6] Seeding Radio Stations...")
    seed_stations = load_seed_yemeni_radios()
    if not seed_stations:
        print("[INFO] Fallback to embedded default stations.")
        seed_stations = [
            {
                "id": "s9_9",
                "stationId": "s9_9",
                "name": "إذاعة صنعاء",
                "nameEn": "Sanaa Radio",
                "tagline": "صوت الجمهورية اليمنية من صنعاء",
                "description": "الإذاعة الرسمية لليمن، تقدم باقة منوعة من البرامج الإخبارية والثقافية والمجتمعية والتراثية.",
                "streamUrl": "https://stream.zeno.fm/f3wvbbqmdg8uv",
                "logoUrl": "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300",
                "frequency": "100.5 MHz",
                "city": "صنعاء",
                "country": "اليمن",
                "tags": ["رسمي", "أخبار", "ثقافي"],
                "priority": 100,
                "isLive": True,
                "isActive": True,
                "isVerified": True,
                "isFeatured": True
            },
            {
                "id": "s16_16",
                "stationId": "s16_16",
                "name": "يمن شباب FM",
                "nameEn": "Yemen Shabab FM",
                "tagline": "صوت الشباب اليمني وتطلعات المستقبل",
                "description": "إذاعة شبابية متنوعة تناقش قضايا المجتمع، التنمية، الفنون، وحوارات حية من الشارع اليمني.",
                "streamUrl": "https://c30.radioboss.fm:18267/stream",
                "logoUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300",
                "frequency": "95.5 MHz",
                "city": "صنعاء",
                "country": "اليمن",
                "tags": ["شبابي", "حوار", "تفاعل"],
                "priority": 95,
                "isLive": True,
                "isActive": True,
                "isVerified": True,
                "isFeatured": True
            }
        ]

    for s in seed_stations:
        st_id = s.get("id") or s.get("stationId")
        name = s.get("name", "إذاعة يمنية")
        freq = s.get("frequency", "FM")
        city = s.get("city", "صنعاء")
        stream = s.get("streamUrl", "")
        logo = s.get("logoUrl", "")
        desc = s.get("description", "")
        tagline = s.get("tagline", "")

        # Canonical format
        canonical_station = {
            "id": st_id,
            "stationId": st_id,
            "name": name,
            "nameEn": s.get("nameEn", name),
            "tagline": tagline,
            "description": desc,
            "streamUrl": stream,
            "backupStreamUrl": s.get("backupStreamUrl", ""),
            "logoUrl": logo,
            "thumbnailUrl": s.get("thumbnailUrl", logo),
            "frequency": freq,
            "city": city,
            "country": s.get("country", "اليمن"),
            "tags": s.get("tags", ["عام", "مجتمعي"]),
            "priority": s.get("priority", 50),
            "isLive": s.get("isLive", True),
            "isActive": s.get("isActive", True),
            "isVerified": s.get("isVerified", True),
            "isFeatured": s.get("isFeatured", False),
            "stats": {"programsCount": 6, "subscribersCount": 850, "totalPlays": 12400},
            "createdAt": now_iso,
            "updatedAt": now_iso
        }

        # Legacy RadioInfo format
        legacy_radio_info = {
            "radioId": st_id,
            "name": name,
            "channelFreq": freq,
            "city": city,
            "streamUrl": stream,
            "logo": logo,
            "desc": desc,
            "likesCount": 120,
            "favCount": 85,
            "disabled": not s.get("isActive", True),
            "timestamp": str(now_millis),
            "createBy": "admin_hudhud_01"
        }

        # Write to canonical path
        write_firestore_doc(token, project_id, f"{root}/stations/stations/{st_id}", canonical_station, dry_run)
        # Write to legacy path
        write_firestore_doc(token, project_id, f"{root}/RadioInfo/RadioInfo/{st_id}", legacy_radio_info, dry_run)
        print(f"  ✓ Station seeded: [{city} - {freq}] {name}")

    # -------------------------------------------------------------
    # 2. USERS & ROLES
    # -------------------------------------------------------------
    print("\n👥 [2/6] Seeding Users, Roles & Subscriptions...")
    users = [
        {
            "id": "admin_hudhud_01",
            "uid": "admin_hudhud_01",
            "displayName": "إبراهيم القاسم (المدير العام)",
            "username": "admin_ibrahim",
            "email": "admin@hudhudfm.com",
            "phoneNumber": "+967775617017",
            "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
            "role": "admin",
            "city": "صنعاء",
            "country": "اليمن",
            "isActive": True,
            "isVerified": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "editor_sanaa_02",
            "uid": "editor_sanaa_02",
            "displayName": "منى القاضي (معدة ومقدمة برامج)",
            "username": "muna_qadi",
            "email": "muna@hudhudfm.com",
            "avatarUrl": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300",
            "role": "editor",
            "city": "صنعاء",
            "country": "اليمن",
            "isActive": True,
            "isVerified": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "listener_aden_03",
            "uid": "listener_aden_03",
            "displayName": "وضاح الشرجبي",
            "username": "waddah_aden",
            "email": "waddah@gmail.com",
            "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
            "role": "listener",
            "city": "عدن",
            "country": "اليمن",
            "isActive": True,
            "isVerified": False,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "listener_taiz_04",
            "uid": "listener_taiz_04",
            "displayName": "هدى الحمادي",
            "username": "huda_taiz",
            "email": "huda@gmail.com",
            "avatarUrl": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
            "role": "listener",
            "city": "تعز",
            "country": "اليمن",
            "isActive": True,
            "isVerified": False,
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
    ]

    for u in users:
        write_firestore_doc(token, project_id, f"{root}/users/users/{u['id']}", u, dry_run)
        print(f"  ✓ User seeded: [{u['role']}] {u['displayName']}")

        # Favorites
        write_firestore_doc(token, project_id, f"{root}/users/users/{u['id']}/favorites/s9_9", {
            "stationId": "s9_9",
            "name": "إذاعة صنعاء",
            "addedAt": now_iso
        }, dry_run)
        # Subscriptions
        write_firestore_doc(token, project_id, f"{root}/users/users/{u['id']}/subscriptions/prog_sabah_alyemen", {
            "programId": "prog_sabah_alyemen",
            "title": "صباح الخير يا يمن",
            "subscribedAt": now_iso
        }, dry_run)

    # -------------------------------------------------------------
    # 3. PROGRAMS (Dual Schema: Canonical + Legacy)
    # -------------------------------------------------------------
    print("\n🎙️ [3/6] Seeding Radio Programs...")
    programs = [
        {
            "id": "prog_sabah_alyemen",
            "programId": "prog_sabah_alyemen",
            "radioId": "s9_9",
            "stationId": "s9_9",
            "stationName": "إذاعة صنعاء",
            "title": "صباح الخير يا يمن",
            "programName": "صباح الخير يا يمن",
            "description": "برنامج صباحي يومي يتناول أخبار الصباح، قضايا المجتمع اليمني، فقرات ثقافية ولقاءات حية مع المواطنين.",
            "coverUrl": "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600",
            "programProfile": "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600",
            "categories": ["ثقافي", "مجتمعي", "صباحي", "أخبار"],
            "presenters": ["أحمد الشامي", "منى القاضي"],
            "epAnnouncer": "أحمد الشامي",
            "airTime": "08:00 ص",
            "daysOfWeek": ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"],
            "isActive": True,
            "isFeatured": True,
            "disabled": False,
            "stats": {"episodesCount": 12, "subscribersCount": 1420, "totalPlays": 15800},
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "timestamp": str(now_millis),
            "createBy": "admin_hudhud_01"
        },
        {
            "id": "prog_nabd_alsharea",
            "programId": "prog_nabd_alsharea",
            "radioId": "s16_16",
            "stationId": "s16_16",
            "stationName": "يمن شباب FM",
            "title": "نبض الشارع",
            "programName": "نبض الشارع",
            "description": "برنامج تفاعلي أسبوعي يناقش هموم وتطلعات المواطنين من الميدان والأسواق مباشرة.",
            "coverUrl": "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600",
            "programProfile": "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600",
            "categories": ["حوار", "مجتمعي", "شبابي"],
            "presenters": ["محمد المقرمي"],
            "epAnnouncer": "محمد المقرمي",
            "airTime": "05:00 م",
            "daysOfWeek": ["الأحد", "الثلاثاء", "الخميس"],
            "isActive": True,
            "isFeatured": True,
            "disabled": False,
            "stats": {"episodesCount": 8, "subscribersCount": 980, "totalPlays": 9320},
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "timestamp": str(now_millis),
            "createBy": "admin_hudhud_01"
        },
        {
            "id": "prog_awtar_yamaniya",
            "programId": "prog_awtar_yamaniya",
            "radioId": "s6_6",
            "stationId": "s6_6",
            "stationName": "يمن ميوزك FM",
            "title": "أوتار يمانية",
            "programName": "أوتار يمانية",
            "description": "رحلة فنية وموسيقية في أعماق التراث الغنائي اليمني الصنعاني واللحجي والحضرمي والتهامي.",
            "coverUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600",
            "programProfile": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600",
            "categories": ["فني", "موسيقي", "تراث"],
            "presenters": ["مروان عبده"],
            "epAnnouncer": "مروان عبده",
            "airTime": "09:00 م",
            "daysOfWeek": ["الخميس", "الجمعة"],
            "isActive": True,
            "isFeatured": True,
            "disabled": False,
            "stats": {"episodesCount": 15, "subscribersCount": 3200, "totalPlays": 48200},
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "timestamp": str(now_millis),
            "createBy": "admin_hudhud_01"
        },
        {
            "id": "prog_saot_almalaeb",
            "programId": "prog_saot_almalaeb",
            "radioId": "a3_33",
            "stationId": "a3_33",
            "stationName": "عدنية FM",
            "title": "صوت الملاعب",
            "programName": "صوت الملاعب",
            "description": "تغطية شاملة للدوري اليمني، أخبار المنتخبات الوطنية والرياضة العربية والعالمية مع استوديو تحليلي.",
            "coverUrl": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600",
            "programProfile": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600",
            "categories": ["رياضي", "تحليلي"],
            "presenters": ["رأفت رشاد"],
            "epAnnouncer": "رأفت رشاد",
            "airTime": "07:00 م",
            "daysOfWeek": ["السبت", "الإثنين", "الأربعاء"],
            "isActive": True,
            "isFeatured": False,
            "disabled": False,
            "stats": {"episodesCount": 6, "subscribersCount": 650, "totalPlays": 5400},
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "timestamp": str(now_millis),
            "createBy": "admin_hudhud_01"
        }
    ]

    for p in programs:
        p_id = p["id"]
        st_id = p["stationId"]
        # Canonical path
        write_firestore_doc(token, project_id, f"{root}/programs/programs/{p_id}", p, dry_run)
        # Legacy paths
        write_firestore_doc(token, project_id, f"{root}/RadioProgram/RadioProgram/{p_id}", p, dry_run)
        write_firestore_doc(token, project_id, f"{root}/RadioProgram/{st_id}/RadioProgram/{p_id}", p, dry_run)
        print(f"  ✓ Program seeded: [{p['stationName']}] {p['title']}")

    # -------------------------------------------------------------
    # 4. EPISODES & FEED ITEMS (Dual Schema: Canonical + Legacy)
    # -------------------------------------------------------------
    print("\n🎧 [4/6] Seeding Episodes & Feed Cards...")
    episodes = [
        {
            "id": "ep_sabah_01",
            "episodeId": "ep_sabah_01",
            "epId": "ep_sabah_01",
            "programId": "prog_sabah_alyemen",
            "programName": "صباح الخير يا يمن",
            "programTitle": "صباح الخير يا يمن",
            "stationId": "s9_9",
            "radioId": "s9_9",
            "stationName": "إذاعة صنعاء",
            "title": "حلقة خاصة: التعليم ومستقبل الشباب في اليمن",
            "epName": "حلقة خاصة: التعليم ومستقبل الشباب في اليمن",
            "description": "حوارية شاملة مع دكاترة الجامعات والطلاب حول الابتكار وسوق العمل وفرص التمكين.",
            "epDesc": "حوارية شاملة مع دكاترة الجامعات والطلاب حول الابتكار وسوق العمل وفرص التمكين.",
            "coverUrl": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600",
            "epProfile": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600",
            "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            "epStreamUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            "audioDurationSec": 2400,
            "presenter": "أحمد الشامي",
            "epAnnouncer": "أحمد الشامي",
            "guest": "د. عبد الله الماوري",
            "broadcastDate": "2026-08-25T08:00:00Z",
            "isPublished": True,
            "isFeatured": True,
            "disabled": False,
            "likesCount": 142,
            "favCount": 45,
            "showTimeList": [
                {"timeStart": now_millis, "timeEnd": now_millis + 3600000}
            ],
            "programScheduleTime": {
                "dateStart": now_millis - 86400000,
                "dateEnd": now_millis + 86400000
            },
            "metrics": {"likesCount": 142, "commentsCount": 18, "playsCount": 3840, "downloadsCount": 420},
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "timestamp": str(now_millis),
            "createBy": "admin_hudhud_01"
        },
        {
            "id": "ep_sabah_02",
            "episodeId": "ep_sabah_02",
            "epId": "ep_sabah_02",
            "programId": "prog_sabah_alyemen",
            "programName": "صباح الخير يا يمن",
            "programTitle": "صباح الخير يا يمن",
            "stationId": "s9_9",
            "radioId": "s9_9",
            "stationName": "إذاعة صنعاء",
            "title": "البيئة والمبادرات المجتمعية لتشجير المدن",
            "epName": "البيئة والمبادرات المجتمعية لتشجير المدن",
            "description": "لقاء مع نشطاء بيئيين حول مبادرات التشجير وتوفير مصادر المياه والطاقة البديلة المستدامة.",
            "epDesc": "لقاء مع نشطاء بيئيين حول مبادرات التشجير وتوفير مصادر المياه والطاقة البديلة المستدامة.",
            "coverUrl": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600",
            "epProfile": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600",
            "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
            "epStreamUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
            "audioDurationSec": 1850,
            "presenter": "منى القاضي",
            "epAnnouncer": "منى القاضي",
            "guest": "م. أروى عبد الخالق",
            "broadcastDate": "2026-08-26T08:00:00Z",
            "isPublished": True,
            "isFeatured": False,
            "disabled": False,
            "likesCount": 98,
            "favCount": 30,
            "showTimeList": [
                {"timeStart": now_millis + 3600000, "timeEnd": now_millis + 7200000}
            ],
            "programScheduleTime": {
                "dateStart": now_millis,
                "dateEnd": now_millis + 86400000 * 2
            },
            "metrics": {"likesCount": 98, "commentsCount": 12, "playsCount": 2190, "downloadsCount": 180},
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "timestamp": str(now_millis),
            "createBy": "admin_hudhud_01"
        },
        {
            "id": "ep_nabd_01",
            "episodeId": "ep_nabd_01",
            "epId": "ep_nabd_01",
            "programId": "prog_nabd_alsharea",
            "programName": "نبض الشارع",
            "programTitle": "نبض الشارع",
            "stationId": "s16_16",
            "radioId": "s16_16",
            "stationName": "يمن شباب FM",
            "title": "الخدمات العامة والتنمية في المحافظات",
            "epName": "الخدمات العامة والتنمية في المحافظات",
            "description": "استطلاع ميداني شامل لآراء المواطنين واحتياجات التنمية والمشاريع الخدمية والبنية التحتية.",
            "epDesc": "استطلاع ميداني شامل لآراء المواطنين واحتياجات التنمية والمشاريع الخدمية والبنية التحتية.",
            "coverUrl": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600",
            "epProfile": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600",
            "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
            "epStreamUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
            "audioDurationSec": 2100,
            "presenter": "محمد المقرمي",
            "epAnnouncer": "محمد المقرمي",
            "broadcastDate": "2026-08-24T17:00:00Z",
            "isPublished": True,
            "isFeatured": True,
            "disabled": False,
            "likesCount": 230,
            "favCount": 92,
            "showTimeList": [
                {"timeStart": now_millis, "timeEnd": now_millis + 3600000}
            ],
            "programScheduleTime": {
                "dateStart": now_millis - 86400000,
                "dateEnd": now_millis + 86400000
            },
            "metrics": {"likesCount": 230, "commentsCount": 34, "playsCount": 6120, "downloadsCount": 890},
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "timestamp": str(now_millis),
            "createBy": "admin_hudhud_01"
        },
        {
            "id": "ep_awtar_01",
            "episodeId": "ep_awtar_01",
            "epId": "ep_awtar_01",
            "programId": "prog_awtar_yamaniya",
            "programName": "أوتار يمانية",
            "programTitle": "أوتار يمانية",
            "stationId": "s6_6",
            "radioId": "s6_6",
            "stationName": "يمن ميوزك FM",
            "title": "روائع الدان الحضرمي وأغاني التراث",
            "epName": "روائع الدان الحضرمي وأغاني التراث",
            "description": "جلسة طرب نادرة تستعرض تاريخ الدان الحضرمي وشعراء الغناء الأصيل في شبام وسيئون.",
            "epDesc": "جلسة طرب نادرة تستعرض تاريخ الدان الحضرمي وشعراء الغناء الأصيل في شبام وسيئون.",
            "coverUrl": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600",
            "epProfile": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600",
            "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
            "epStreamUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
            "audioDurationSec": 3200,
            "presenter": "مروان عبده",
            "epAnnouncer": "مروان عبده",
            "guest": "الفنان سعيد باصالح",
            "broadcastDate": "2026-08-27T21:00:00Z",
            "isPublished": True,
            "isFeatured": True,
            "disabled": False,
            "likesCount": 510,
            "favCount": 210,
            "showTimeList": [
                {"timeStart": now_millis, "timeEnd": now_millis + 3600000}
            ],
            "programScheduleTime": {
                "dateStart": now_millis - 86400000,
                "dateEnd": now_millis + 86400000
            },
            "metrics": {"likesCount": 510, "commentsCount": 47, "playsCount": 12800, "downloadsCount": 2400},
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "timestamp": str(now_millis),
            "createBy": "admin_hudhud_01"
        }
    ]

    for ep in episodes:
        ep_id = ep["id"]
        st_id = ep["stationId"]
        # Canonical path
        write_firestore_doc(token, project_id, f"{root}/episodes/episodes/{ep_id}", ep, dry_run)
        # Legacy paths
        write_firestore_doc(token, project_id, f"{root}/Episode/Episode/{ep_id}", ep, dry_run)
        write_firestore_doc(token, project_id, f"{root}/Episode/{st_id}/Episode/{ep_id}", ep, dry_run)
        print(f"  ✓ Episode seeded: [{ep['programName']}] {ep['title']}")

        # Subcollection Likes
        like_doc = {"uid": "listener_aden_03", "likedAt": now_iso}
        write_firestore_doc(token, project_id, f"{root}/episodes/episodes/{ep_id}/likes/listener_aden_03", like_doc, dry_run)
        write_firestore_doc(token, project_id, f"{root}/Episode/Episode/{ep_id}/likes/listener_aden_03", like_doc, dry_run)

        # Subcollection Comments
        comment1 = {
            "id": f"com_{ep_id}_1",
            "episodeId": ep_id,
            "epId": ep_id,
            "radioId": st_id,
            "author": {
                "uid": "listener_aden_03",
                "displayName": "وضاح الشرجبي",
                "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"
            },
            "user_name": "وضاح الشرجبي",
            "user_photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
            "user_id": "listener_aden_03",
            "content": "حلقة ممتازة ومثمرة جداً، شكراً لكم على هذا الطرح الراقي والمفيد!",
            "comment": "حلقة ممتازة ومثمرة جداً، شكراً لكم على هذا الطرح الراقي والمفيد!",
            "likesCount": 12,
            "isEdited": False,
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "timestamp": str(now_millis)
        }
        write_firestore_doc(token, project_id, f"{root}/episodes/episodes/{ep_id}/comments/{comment1['id']}", comment1, dry_run)
        write_firestore_doc(token, project_id, f"{root}/Episode/Episode/{ep_id}/comments/{comment1['id']}", comment1, dry_run)

    # -------------------------------------------------------------
    # 5. BANNERS & PROMOTIONS (Dual Schema: Canonical + Legacy)
    # -------------------------------------------------------------
    print("\n🖼️ [5/6] Seeding Banners & Advertisements...")
    banners = [
        {
            "id": "banner_ramadan_promo",
            "bannerId": "banner_ramadan_promo",
            "advId": "banner_ramadan_promo",
            "title": "استمع لبرامج هدهد FM أينما كنت",
            "advTitle": "استمع لبرامج هدهد FM أينما كنت",
            "subtitle": "تطبيق هدهد إف إم — أصوات محلية، وتأثير عالمي",
            "advDesc": "تطبيق هدهد إف إم — أصوات محلية، وتأثير عالمي",
            "imageUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1080",
            "advImage": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1080",
            "targetUrl": "https://sanaadev.com/fm",
            "advLink": "https://sanaadev.com/fm",
            "targetType": "web",
            "placement": "home_hero",
            "priority": 100,
            "isActive": True,
            "disabled": False,
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "timestamp": str(now_millis)
        },
        {
            "id": "banner_sabah_yemen",
            "bannerId": "banner_sabah_yemen",
            "advId": "banner_sabah_yemen",
            "title": "برنامج صباح الخير يا يمن",
            "advTitle": "برنامج صباح الخير يا يمن",
            "subtitle": "مباشرة يومياً الساعة 8:00 صباحاً على إذاعة صنعاء",
            "advDesc": "مباشرة يومياً الساعة 8:00 صباحاً على إذاعة صنعاء",
            "imageUrl": "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1080",
            "advImage": "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1080",
            "targetUrl": "prog_sabah_alyemen",
            "advLink": "prog_sabah_alyemen",
            "targetType": "program",
            "placement": "home_banner",
            "priority": 90,
            "isActive": True,
            "disabled": False,
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "timestamp": str(now_millis)
        }
    ]

    for b in banners:
        b_id = b["id"]
        # Canonical path
        write_firestore_doc(token, project_id, f"{root}/banners/banners/{b_id}", b, dry_run)
        # Legacy path
        write_firestore_doc(token, project_id, f"{root}/Advertisement/Advertisement/{b_id}", b, dry_run)
        print(f"  ✓ Banner seeded: {b['title']}")

    print("\n" + "=" * 70)
    print(f"🎉 Complete Seeding Successful! All collections populated on /{root}")
    print("=" * 70)

if __name__ == '__main__':
    main()
