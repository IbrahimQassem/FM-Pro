# Direct advertising contract — v1

Status: implemented locally; production rollout is a separate gate.
Decision and business rationale: [ADR 0005](../decisions/0005-radio-reliability-and-direct-advertising.md).

## Ownership and compatibility

Functions own advertiser/campaign validation, eligibility and counters. Mobile
uses a domain repository injected by Riverpod; public/admin web reuse existing
Firebase Functions SDKs. No new SDK or ad network is introduced.

Legacy `{root}/banners/banners` remains unchanged and unmeasured. Existing apps
continue reading it. Managed campaigns require the first app update containing
this placement; subsequent campaign changes require no new app release. A new
placement or creative capability requires a compatible client first.

Implemented placement: `home.sponsor`, outside player controls, one selected
creative per platform, `app` or `web`. Creative kinds: `image` and `sponsorship`.
Do not add arbitrary HTML, JavaScript, embedded video, URL schemes or audio ads.
Highest numeric priority wins; equal priorities sort by campaign ID. This is
explicit placement precedence, not equal rotation or guaranteed delivery.

## Private data

Known roots are HudHudDev and HudHudOfficial. Firestore default-deny protects all
paths below, including direct admin client access; no public Rules exception.

| Path | Fields and purpose |
|---|---|
| `{root}/advertisers/advertisers/{id}` | schemaVersion=1, name (120), isActive, revision, createdAt/updatedAt; company identity, no contact PII |
| `{root}/adCampaigns/campaigns/{id}` | schemaVersion=1, advertiserId, name (120), status draft/active/paused, startAt/endAt epoch milliseconds, platforms, placements, priority 0–1000, creative, agreementReference (120), agreementNotes (1000), revision/times |
| `{root}/adDeliveries/deliveries/{randomId}` | campaign/advertiser IDs, campaignRevision, platform/placement, expiresAt, impression/click booleans, deleteAfter Timestamp |
| `{root}/adCampaigns/campaigns/{id}/daily/{UTCdate_platform_placement}` | date, platform, placement, optional impressions/clicks; missing counts mean zero |
| `{root}/advertising` | revision; private transaction serialization point for administrative changes |

Creative: kind, title (100), body (240, optional), imageUrl (required for image),
targetUrl (optional). HTTPS public-domain URLs only, no credentials, custom ports,
IP-literal hosts or local/reserved domain suffixes. Text is rendered as text.
Prefer a first-party CDN and a compact image (recommended <=300KB, no personalized
tracking URLs); the server validates the URL, not remote image dimensions/bytes.
External destination redirect behavior remains the advertiser's responsibility.

## Callable APIs

Every request carries `{version:1, root}`. Unknown versions/roots are rejected.
Additive response fields may be ignored; unknown creative kinds fail closed.

`advertisingAdmin` uses the existing `assertSuperAdminCaller`: super_admin or
legacy unscoped admin. Station admins/moderators/listeners cannot read private
agreements or manage global campaigns.

- `action:list, kind:advertisers|adCampaigns, after?:id` returns `version, items,
  next`. Pages are bounded at 50, ordered by document ID.
- `action:saveAdvertiser, id?, revision?, value:{name,isActive}` returns version/id.
- `action:saveCampaign, id?, revision?, value:{campaign fields}` returns version/id.
  A missing id creates one. An existing record requires the current revision;
  conflicts return `aborted`, never overwrite silently. An active campaign
  requires an active advertiser. Up to 100 active/scheduled campaigns per root;
  expired active records must be paused to free capacity. No destructive delete;
  pause campaigns/deactivate advertisers to preserve reporting history.
- `action:report, campaignId, from:YYYY-MM-DD, to:YYYY-MM-DD` returns version,
  rows and measurement description. Inclusive UTC date range, <=93 days,
  maximum 200 rows (2 platforms × 1 placement × 93 days). Future placements
  must revise this bound/pagination before being enabled.

`serveAds` accepts platform and placement and returns `{version:1,ad:null}` or
an ad containing creative fields, sponsor, campaignId, deliveryId, placement,
expiresAt and validForMs (<=60000). Server time is authoritative: start inclusive,
end exclusive. Recheck the advertiser and campaign in the delivery transaction.
Clients use the relative TTL to avoid device-clock skew. No agreement data is
exposed. Missing/unavailable service simply hides the slot.

`recordAdEvent` accepts deliveryId and event `impression|click`. It returns
accepted/duplicate status. Server-created receipt binds root/platform/placement,
campaign and revision. Unknown/expired/paused/edited deliveries are rejected.
Each event type counts once per delivery, even with concurrent/retried requests.
Clicks require a configured target. A quick click may occur before the one-second
impression threshold; therefore clicks need not be a subset of impressions.

## Visibility, lifecycle and failure

- Request at most once per minute while the placement route is in the foreground;
  no offline ads cache or queued event replay. Stop UI timers/subscriptions on disposal.
- Impression: creative image loaded (or text ready), at least half the placement
  visible for one continuous second while foreground. Web uses IntersectionObserver;
  mobile samples geometry every 250ms. This is an operational estimate, not an
  independent viewability certification. Covered routes and background time do
  not count. Re-delivery after TTL is a new opportunity, not a unique person.
- Expired images disappear. A paused campaign already on screen can remain for
  its short TTL; server rejects subsequent events immediately. No permanent listener.
- Errors in loading, tracking or image rendering cannot fail station discovery
  or playback. Link opening is a user action with a localized mobile failure state.

## Reporting, privacy and operations

Admin reports and CSV contain UTC daily counts by platform and placement, not
individuals. Clicks are the supported interaction metric. No UID, IP, cookie,
advertising ID or persistent device identifier is explicitly collected/stored
in advertising documents. Hosting/Functions/CDN infrastructure still receives
ordinary network requests; do not describe this as zero data processing.

Delivery IDs expire within a minute; records become eligible for cleanup after
24 hours. Every 15 minutes cleanup removes up to 400 expired receipts per root.
Monitor backlog; this is not a guarantee of deletion exactly at 24h. Configure
Firestore TTL/add cleanup capacity before traffic outgrows this bound. Retain
aggregate reports for business reconciliation; do not associate them with users.

Guest endpoints have maxInstances/timeouts and bounded queries, but no deployed
App Check integration or independent fraud detection. Bots can request new
receipts. Before production: configure monitoring/quotas, validate traffic costs,
review attestation rollout and hosted creative policy. Do not use raw counts for
guaranteed CPM/CPC billing. Start with fixed-term/placement sponsorship agreements;
prices and audience promises require actual measured data and negotiation.

Deploy backend before clients, test a synthetic Development campaign, then approve
production configuration. No live campaign, cloud deployment or store upload is
performed by local tests. Disable campaigns or roll back clients to hide managed
placements; preserve private reports and legacy banners.
