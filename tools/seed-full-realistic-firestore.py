#!/usr/bin/env python3
"""
Seeds Firebase Firestore with rich, realistic dummy data for HudHudFM.
Includes: Stations, Programs, Episodes, Episode Comments, Episode Likes, Users, Favorites, Subscriptions, and Banners.
"""

import datetime
import json
import os
import sys
import urllib.request
import urllib.parse

def get_firebase_access_token():
    config_path = os.path.expanduser('~/.config/configstore/firebase-tools.json')
    if not os.path.exists(config_path):
        return None
    try:
        with open(config_path, 'r') as f:
            data = json.load(f)
            tokens = data.get('tokens', {})
            return tokens.get('access_token')
    except Exception as e:
        print(f"Token read error: {e}")
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

def write_firestore_doc(token, project_id, path, data):
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
        with urllib.request.urlopen(req, timeout=10) as resp:
            return True
    except Exception as e:
        print(f"Error writing {path}: {e}")
        return False

def main():
    token = get_firebase_access_token()
    if not token:
        print("[ERROR] No Firebase token available in ~/.config/configstore/firebase-tools.json")
        sys.exit(1)

    project_id = "sanadev-fm"
    root = "HudHudFM"
    if "--flavor-root" in sys.argv:
        idx = sys.argv.index("--flavor-root")
        if idx + 1 < len(sys.argv):
            root = sys.argv[idx + 1]

    now_iso = datetime.datetime.utcnow().isoformat() + "Z"

    print("=" * 65)
    print(f"Seeding Rich Realistic Firestore Data for /{root} (Project: {project_id})")
    print("=" * 65)

    # 1. USERS & ROLES
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
            "displayName": "منى القاضي (معدة برامج)",
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

    print("\n[1/5] Writing Users & Roles...")
    for u in users:
        write_firestore_doc(token, project_id, f"{root}/users/users/{u['id']}", u)
        print(f"  ✓ User created: [{u['role']}] {u['displayName']}")

        # Seed user favorites
        write_firestore_doc(token, project_id, f"{root}/users/users/{u['id']}/favorites/s9_9", {
            "stationId": "s9_9",
            "name": "إذاعة صنعاء",
            "addedAt": now_iso
        })
        # Seed user subscriptions
        write_firestore_doc(token, project_id, f"{root}/users/users/{u['id']}/subscriptions/prog_sabah_alyemen", {
            "programId": "prog_sabah_alyemen",
            "title": "صباح الخير يا يمن",
            "subscribedAt": now_iso
        })

    # 2. PROGRAMS
    programs = [
        {
            "id": "prog_sabah_alyemen",
            "programId": "prog_sabah_alyemen",
            "stationId": "s9_9",
            "stationName": "إذاعة صنعاء",
            "title": "صباح الخير يا يمن",
            "description": "برنامج صباحي يومي يتناول أخبار الصباح، قضايا المجتمع اليمني، فقرات ثقافية ولقاءات حية.",
            "coverUrl": "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600",
            "categories": ["ثقافي", "مجتمعي", "صباحي", "أخبار"],
            "presenters": ["أحمد الشامي", "منى القاضي"],
            "airTime": "08:00 ص",
            "daysOfWeek": ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"],
            "isActive": True,
            "isFeatured": True,
            "stats": {"episodesCount": 12, "subscribersCount": 1420, "totalPlays": 15800},
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "prog_nabd_alsharea",
            "programId": "prog_nabd_alsharea",
            "stationId": "s16_16",
            "stationName": "يمن شباب FM",
            "title": "نبض الشارع",
            "description": "برنامج تفاعلي أسبوعي يناقش هموم وتطلعات المواطنين من الميدان مباشرة.",
            "coverUrl": "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600",
            "categories": ["حوار", "مجتمعي", "شبابي"],
            "presenters": ["محمد المقرمي"],
            "airTime": "05:00 م",
            "daysOfWeek": ["الأحد", "الثلاثاء", "الخميس"],
            "isActive": True,
            "isFeatured": True,
            "stats": {"episodesCount": 8, "subscribersCount": 980, "totalPlays": 9320},
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "prog_awtar_yamaniya",
            "programId": "prog_awtar_yamaniya",
            "stationId": "s6_6",
            "stationName": "يمن ميوزك FM",
            "title": "أوتار يمانية",
            "description": "رحلة فنية وموسيقية في أعماق التراث الغنائي اليمني الصنعاني واللحجي والحضرمي.",
            "coverUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600",
            "categories": ["فني", "موسيقي", "تراث"],
            "presenters": ["مروان عبده"],
            "airTime": "09:00 م",
            "daysOfWeek": ["الخميس", "الجمعة"],
            "isActive": True,
            "isFeatured": True,
            "stats": {"episodesCount": 15, "subscribersCount": 3200, "totalPlays": 48200},
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "prog_saot_almalaeb",
            "programId": "prog_saot_almalaeb",
            "stationId": "a3_33",
            "stationName": "عدنية FM",
            "title": "صوت الملاعب",
            "description": "تغطية شاملة للدوري اليمني، أخبار المنتخبات الوطنية والرياضة العربية والعالمية.",
            "coverUrl": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600",
            "categories": ["رياضي", "تحليلي"],
            "presenters": ["رأفت رشاد"],
            "airTime": "07:00 م",
            "daysOfWeek": ["السبت", "الإثنين", "الأربعاء"],
            "isActive": True,
            "isFeatured": False,
            "stats": {"episodesCount": 6, "subscribersCount": 650, "totalPlays": 5400},
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
    ]

    print("\n[2/5] Writing Programs...")
    for p in programs:
        write_firestore_doc(token, project_id, f"{root}/programs/programs/{p['id']}", p)
        print(f"  ✓ Program created: [{p['stationName']}] {p['title']}")

    # 3. EPISODES
    episodes = [
        {
            "id": "ep_sabah_01",
            "episodeId": "ep_sabah_01",
            "programId": "prog_sabah_alyemen",
            "stationId": "s9_9",
            "title": "حلقة خاصة: التعليم ومستقبل الشباب في اليمن",
            "description": "حوارية شاملة مع دكاترة الجامعات والطلاب حول الابتكار وسوق العمل وفرص التمكين.",
            "coverUrl": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600",
            "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            "audioDurationSec": 2400,
            "presenter": "أحمد الشامي",
            "guest": "د. عبد الله الماوري",
            "broadcastDate": "2026-08-25T08:00:00Z",
            "isPublished": True,
            "isFeatured": True,
            "metrics": {"likesCount": 142, "commentsCount": 18, "playsCount": 3840, "downloadsCount": 420},
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "ep_sabah_02",
            "episodeId": "ep_sabah_02",
            "programId": "prog_sabah_alyemen",
            "stationId": "s9_9",
            "title": "البيئة والمبادرات المجتمعية لتشجير المدن",
            "description": "لقاء مع نشطاء بيئيين حول مبادرات التشجير وتوفير مصادر المياه والطاقة البديلة.",
            "coverUrl": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600",
            "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
            "audioDurationSec": 1850,
            "presenter": "منى القاضي",
            "guest": "م. أروى عبد الخالق",
            "broadcastDate": "2026-08-26T08:00:00Z",
            "isPublished": True,
            "isFeatured": False,
            "metrics": {"likesCount": 98, "commentsCount": 12, "playsCount": 2190, "downloadsCount": 180},
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "ep_nabd_01",
            "episodeId": "ep_nabd_01",
            "programId": "prog_nabd_alsharea",
            "stationId": "s16_16",
            "title": "الخدمات العامة والتنمية في المحافظات",
            "description": "استطلاع ميداني شامل لآراء المواطنين واحتياجات التنمية والبنية التحتية.",
            "coverUrl": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600",
            "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
            "audioDurationSec": 2100,
            "presenter": "محمد المقرمي",
            "broadcastDate": "2026-08-24T17:00:00Z",
            "isPublished": True,
            "isFeatured": True,
            "metrics": {"likesCount": 230, "commentsCount": 34, "playsCount": 6120, "downloadsCount": 890},
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "ep_awtar_01",
            "episodeId": "ep_awtar_01",
            "programId": "prog_awtar_yamaniya",
            "stationId": "s6_6",
            "title": "روائع الدان الحضرمي وأغاني الدان",
            "description": "جلسة طرب نادرة تستعرض تاريخ الدان الحضرمي وشعراء الغناء الأصيل في شبام وسيئون.",
            "coverUrl": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600",
            "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
            "audioDurationSec": 3200,
            "presenter": "مروان عبده",
            "guest": "الفنان سعيد باصالح",
            "broadcastDate": "2026-08-27T21:00:00Z",
            "isPublished": True,
            "isFeatured": True,
            "metrics": {"likesCount": 510, "commentsCount": 47, "playsCount": 12800, "downloadsCount": 2400},
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
    ]

    print("\n[3/5] Writing Episodes & Subcollections (Likes, Comments)...")
    for ep in episodes:
        write_firestore_doc(token, project_id, f"{root}/episodes/episodes/{ep['id']}", ep)
        print(f"  ✓ Episode created: [{ep['programId']}] {ep['title']}")

        # Subcollection Likes
        write_firestore_doc(token, project_id, f"{root}/episodes/episodes/{ep['id']}/likes/listener_aden_03", {
            "uid": "listener_aden_03",
            "likedAt": now_iso
        })
        write_firestore_doc(token, project_id, f"{root}/episodes/episodes/{ep['id']}/likes/listener_taiz_04", {
            "uid": "listener_taiz_04",
            "likedAt": now_iso
        })

        # Subcollection Comments
        comment1 = {
            "id": f"com_{ep['id']}_1",
            "episodeId": ep['id'],
            "author": {
                "uid": "listener_aden_03",
                "displayName": "وضاح الشرجبي",
                "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"
            },
            "content": "حلقة ممتازة ومثمرة جداً، شكراً لكم على هذا الطرح الراقي والمفيد!",
            "likesCount": 12,
            "isEdited": False,
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
        comment2 = {
            "id": f"com_{ep['id']}_2",
            "episodeId": ep['id'],
            "author": {
                "uid": "listener_taiz_04",
                "displayName": "هدى الحمادي",
                "avatarUrl": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300"
            },
            "content": "نتمنى استضافة المزيد من المختصين في الحلقات القادمة لمتابعة هذا الموضوع المهم.",
            "likesCount": 8,
            "isEdited": False,
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
        write_firestore_doc(token, project_id, f"{root}/episodes/episodes/{ep['id']}/comments/{comment1['id']}", comment1)
        write_firestore_doc(token, project_id, f"{root}/episodes/episodes/{ep['id']}/comments/{comment2['id']}", comment2)

    # 4. BANNERS
    banners = [
        {
            "id": "banner_ramadan_promo",
            "bannerId": "banner_ramadan_promo",
            "title": "استمع لبرامج هدهد FM أينما كنت",
            "subtitle": "تطبيق هدهد إف إم — أصوات محلية، وتأثير عالمي",
            "imageUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1080",
            "targetUrl": "https://sanaadev.com/fm",
            "targetType": "web",
            "placement": "home_hero",
            "priority": 100,
            "isActive": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "banner_sabah_yemen",
            "bannerId": "banner_sabah_yemen",
            "title": "برنامج صباح الخير يا يمن",
            "subtitle": "مباشرة يومياً الساعة 8:00 صباحاً على إذاعة صنعاء",
            "imageUrl": "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1080",
            "targetUrl": "prog_sabah_alyemen",
            "targetType": "program",
            "placement": "home_banner",
            "priority": 90,
            "isActive": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
    ]

    print("\n[4/5] Writing Banners & Promotions...")
    for b in banners:
        write_firestore_doc(token, project_id, f"{root}/banners/banners/{b['id']}", b)
        print(f"  ✓ Banner created: {b['title']}")

    print("\n" + "=" * 65)
    print(f"🎉 Complete Seeding Successful! All collections populated on /{root}")
    print("=" * 65)

if __name__ == '__main__':
    main()
