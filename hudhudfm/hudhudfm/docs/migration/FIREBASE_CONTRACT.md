# Firebase Contract

This file records the Firestore contract observed in `FM-Pro`. It must be kept
in sync with repository code before production data is used.

## Base Documents

The Android flavors use these base documents under the root Firestore database:

- Development: `HudHudFM`
- Google Play: `HudHudFmGooglePlay`
- Internews: `InterNews`

The Flutter app must make the base document a flavor/environment value. Do not
hard-code production in tests.

Flutter reads the active base document from:

```text
--dart-define=HUDHUD_FIREBASE_BASE_DOCUMENT=<base>
```

Unknown values fall back to `HudHudFmGooglePlay` instead of creating accidental
new backend paths. The visible source label can be overridden with
`HUDHUD_DATA_SOURCE_LABEL`.

## Observed Collections

The legacy helper builds paths as:

```text
{baseDocument}/{collectionPath}/{documentId}
```

Then some screens append another document and collection with the same name.
The migrated repositories must keep this shape until the backend is explicitly
changed.

| Domain | Legacy path shape |
| --- | --- |
| Radios | `{base}/RadioInfo/RadioInfo/{radioId}` |
| Programs | `{base}/RadioProgram/{radioId}/RadioProgram/RadioProgram/{programId}` |
| Episodes | `{base}/Episode/{radioId}/Episode/Episode/{episodeId}` |
| Users | `{base}/Users/Users/{userId}` |
| Advertisements | `{base}/Advertisement/Advertisement/{adId}` |

User profile edits may only write these fields:

- `userId`
- `name`
- `email`
- `mobile`
- `photoUrl`
- `nickNme`
- `bio`
- `tag`
- `country`
- `city`

Profile writes must not include `password`, device tokens, `userType`,
`allowedPermissions`, `disabled`, or `stopNote`.

## Storage Objects

Legacy admin uploads store media under:

```text
{base}_Folder/{parentDocId}/{imageName}
```

Flutter keeps this shape through `FirebasePaths.mediaObjectPath()`.

| Media | Parent id | Saved URL field |
| --- | --- | --- |
| Radio logo | `radioId` | `RadioInfo.logo` |
| Program profile | `programId` | `RadioProgram.prProfile` |
| Episode profile | `episodeId` | `Episode.epProfile` |

Uploads must set content-type metadata when the selected image provides a MIME
type. If the MIME type is missing, Flutter falls back to the file extension.

## Mapping Rules

- `RadioInfo.radioId` is the business id used by nested program and episode
  paths.
- `RadioProgram.programId` must remain stable across edits.
- `Episode.epId` must remain stable across edits.
- Missing optional strings map to empty strings in UI-safe models.
- Disabled radios, programs, and episodes must be filtered outside the widget
  layer.
- Remote Config uses the legacy key `hudhudFmAppConfig`, whose value is a JSON
  object matching `AppRemoteConfig`.

## Authorization Rules

The legacy app stores roles such as `isAdmin` locally. Flutter must not use that
as the authorization source. Admin write operations require one of:

- Firebase custom claims checked by Firestore/Storage rules.
- A backend function that validates the caller before mutating data.

Local state can only hide UI affordances. It cannot authorize writes.

The Flutter UI currently reads the legacy user document field `userType` from
`{base}/Users/Users/{userId}` and maps:

- `USER` -> ordinary user.
- `ADMIN` -> can see admin tools.
- `SuperADMIN` -> can see admin tools and content-management affordances.

This is a display gate only. Firestore/Storage rules or backend functions must
still enforce every write.

Admin content writes in Flutter are routed through a guarded service. Repository
implementations must write to fixed document ids:

- Radio save: `doc(radio.radioId)`.
- Program save: `doc(program.programId)`.
- Episode save: `doc(episode.episodeId)`.

Do not use auto-generated ids during edit flows.

Reference rules live in:

- `firebase/firestore.rules`
- `firebase/storage.rules`
- `firebase/test/rules.test.js`

Treat these rules as a starting contract. They must be exercised in the
Firebase emulator before deployment, especially the role escalation and media
upload cases.

## Flutter Runtime Behavior

The app attempts `Firebase.initializeApp()` during startup. If native Firebase
configuration is missing, initialization fails closed and the app uses in-memory
demo repositories. This keeps local development and tests stable while making
the Firebase boundary explicit.
