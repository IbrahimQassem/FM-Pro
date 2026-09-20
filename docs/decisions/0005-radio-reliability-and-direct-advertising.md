# Radio reliability and direct advertising — 2026-09-20

## Discovery and evidence

### Synchronization update

At the user's request, preserved work in stash
`codex-radio-ads-before-sync-2026-09-20`, fetched origin and fast-forwarded 17
commits from 0b64b48 to cdd1d55 (3.0.2+32). Reapplied work and resolved three
conflicts (Functions lint scripts, main notification icon, admin navigation/types)
without discarding upstream notification management or player changes.

Upstream cdcf089 reports a Play Console IllegalArgumentException in
AudioService.updateNotification and changes the small icon to ic_notification;
its commit message names Android 12+ on some Oppo/Huawei/Samsung devices. That is
repository-reported evidence, not a crash trace inspected in this session. Keep
that upstream fix and add a narrow resource keep rule; discard our duplicate icon.
Raw stack/device/build reproduction is still needed to attribute the user's
reported crash conclusively. Do not infer that full-color icons always crash.

Upstream also added cleartext radio transport, terrestrial-only stations, a
sleep timer and reconnection. Preserve those changes. Two new regression tests
failed on that implementation: retries exceeded three because play reset the
budget, and pausing during reconnect remained loading. Correct the retry budget,
stable-play reset and cancellation while retaining the single shared player.
Guard delayed app-initiated Android starts and reconnect timers against background
lifecycle, retaining explicit retry on return. This follows the documented
foreground-service start restriction; it is not proof of the historical crash.
Use upstream assertSuperAdminCaller for commercial administration so a scoped
station admin cannot access global contracts.

The original discovery below describes the pre-pull baseline, not the updated
release. Android's current SDK baseline is min 24, target/compile 36. Before the
pull the manifest did not permit HTTP; the incoming change now explicitly does.

The working tree was clean at discovery. Flutter uses one Riverpod-owned
`JustAudioPlayerDataSource`, just_audio 0.10.6, audio_session 0.2.4,
just_audio_background beta.17 and audio_service 0.18.19. MainActivity inherits
AudioServiceActivity. INTERNET, WAKE_LOCK, FOREGROUND_SERVICE and
FOREGROUND_SERVICE_MEDIA_PLAYBACK and the mediaPlayback service are declared.
There is no evidence justifying replacement of this stack.

**Confirmed defect:** the data source listens to playbackEventStream.onError,
although just_audio 0.10 delivers PlayerException values on errorStream.
Network/decoder errors after initial loading therefore do not reliably reach
the UI. Correct the subscription and test the actual data boundary.

**Release resource risk:** notification icon selection uses the implicit
mipmap/ic_launcher name; the application uses launcher_icon and enables resource
shrinking. Use an explicit monochrome notification drawable and narrowly keep
that dynamically resolved resource. A debug build cannot prove release shrinking.

**Reported Android process crash: not yet diagnosed.** No Android device was
connected (`adb devices`), no crash logs were supplied, and no Crashlytics connector
is available. Do not claim either issue above is the reported native crash.
Android 12+ restricts foreground service starts from background; this is a
candidate requiring a matching exception, not evidence to add battery exemptions
or keep an indefinitely paused service alive. Android 14 media permissions are
already present. HTTP radio streams are accepted by the content contract but
Android's cleartext policy can reject them; do not globally weaken transport
security to hide an ordinary playback error.

Sources: [just_audio migration](https://pub.dev/packages/just_audio),
[audio_service Android setup](https://pub.dev/packages/audio_service),
[Android background-start restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start).

## Advertising discovery and decision

Mobile has a cache-first Firestore banner carousel, active/start/end/priority
filtering, no click navigation and no impression measurement. Admin edits these
banners. Public web has no campaign delivery. No advertiser, agreement, campaign
or trustworthy audience/revenue dataset exists in the repository.

Evolve Firebase Functions, existing admin React and Flutter Riverpod. Keep legacy
banners unchanged. Managed campaigns are a distinct business entity, not extra
private fields on publicly readable banners. Use one selected placement on each
home page (`home.sponsor`), with image or text sponsorship. No interstitials,
autoplay advertisements, playback controls overlays or audio insertion.

### Contracts and consumers (v1)

| Contract | Why / consumers | Data / relationships |
|---|---|---|
| Advertiser | Admin manages the commercial organization | id, name, active; private, referenced by campaigns |
| Campaign | Admin schedules and pauses direct partnerships | advertiserId, name, status draft/active/paused, start/end UTC millis, platforms app/web, placements, priority, creative, agreement reference/notes; private |
| serveAds | Mobile/web need only eligible public creative data | version/root/platform/placement in; one creative, expiry and opaque delivery ID out; never agreement data |
| recordAdEvent | Mobile/web report observable interaction without accounts | delivery ID and impression/click; server binds campaign/platform/placement, deduplicates event types transactionally |
| advertisingAdmin | Admin-only CRUD/list/report without exposing commercial data | version/root/action; bounded lists, revision checking, daily campaign counts and CSV in admin |

Paths: `{root}/advertisers/advertisers/{id}`,
`{root}/adCampaigns/campaigns/{id}`,
`{root}/adDeliveries/deliveries/{opaqueId}`,
`{root}/adCampaigns/campaigns/{id}/daily/{date_platform_placement}`.
Known roots only. All advertising documents deny direct client reads and writes;
callables own validation and admin claims. Existing banner schema/API is unchanged.
Version 1 is explicit; reject unknown major versions. New creative kinds and
placements require client capability, while changing campaigns does not require
an app release once this client support is installed.

Eligibility uses server time, advertiser active state, campaign status/window,
platform and an allowlisted implemented placement. No arbitrary executable action:
optional HTTPS external link only, credentials/local hosts rejected. One creative
per campaign in v1; additional creatives can later reference the same campaign.
Image and text sponsorship meet current needs without inventing a video engine.

### Measurement, performance and privacy

No UID, IP, advertising ID, cookies or persistent device ID in advertising data.
Short-lived (at most one minute) delivery receipts deduplicate an impression and a click per delivery.
Clients measure a visible, loaded creative for one continuous second; events remain
client-reported, not independently audited or billable. Clicks are interactions;
no fabricated separate engagement metric. Daily UTC reporting separates platforms
and placements. Receipt cleanup is scheduled and bounded. Serving is bounded and
clients refresh at most once a minute while foreground; ads fail closed/quietly
and are never a dependency of station loading or audio.

Guest endpoints need production quota monitoring and abuse review. Without
attestation, a bot can request new deliveries; deduplication is not fraud detection.
Do not sell guaranteed CPM/CPC against these unaudited counters. Add App Check
only with a coordinated app/web/provider rollout, not by breaking existing clients.

### Business fit

Start with fixed-duration homepage sponsorship and fixed placement packages,
priced by agreement after an audience baseline is collected. Reference the
external commercial agreement privately; do not build billing or store contracts
in public creatives. Section sponsorship can be added after measured demand and
an explicit section placement implementation. CPM/CPC or hybrid agreements need
auditable measurement, fraud controls and agreed reconciliation first. No prices,
reach promises or audience counts can be inferred from repository code.

## Execution and acceptance

1. Fix and regression-test confirmed playback defects; retain the single player.
2. Implement validated campaign/admin/delivery/event functions and emulator tests.
3. Integrate admin management/report export, public web and localized mobile slot.
4. Verify authorization, dates, pause, targeting, duplicate events, unavailable
   network, lifecycle cancellation, lint/tests/builds and RTL rendering.
5. Record actual results in the handoff. Deployments, signed release validation,
   reported-crash reproduction and real-device audio matrix require separate
   evidence; local success does not close these items.

Physical matrix: affected device/build, API 29/31/33/34/35+ as available; start,
pause/resume, stop, rapid station changes, navigation, lock/background-return,
network loss/recovery, notification denial, headset/call interruptions and 30min
background playback. Capture sanitized exception class/stack and API/build,
never stream URLs or personal data. Revert only this change set for rollback;
legacy banners remain available if campaign endpoints are unavailable.
