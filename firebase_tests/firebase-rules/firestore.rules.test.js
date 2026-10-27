import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  collectionGroup,
  deleteDoc,
  deleteField,
  documentId,
  limit,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  Timestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

const PROJECT_ID = "demo-hudhud-fm-rules-test";
const userPath = (uid) => `HudHudDev/users/users/${uid}`;
const episodePath = (id = "episode-1") => `HudHudDev/episodes/episodes/${id}`;
const commentPath = (id = "comment-1") => `${episodePath()}/comments/${id}`;
const ugcAgreementPath = (uid) => `${userPath(uid)}/agreements/ugc`;
const blockedUserPath = (uid, blockedUid = "user-b") =>
  `${userPath(uid)}/blockedUsers/${blockedUid}`;
const commentReportPath = (uid, commentId = "comment-1") =>
  `${userPath(uid)}/commentReportEpisodes/episode-1/moderationReports/${commentId}`;
const userReportPath = (uid, reportedUid = "user-b", commentId = "comment-1") =>
  `${userPath(uid)}/userReportTargets/${reportedUid}/moderationReports/${commentId}`;
const favoritePath = (uid, id = "station-1") => `${userPath(uid)}/favorites/${id}`;
const subscriptionPath = (uid, id = "program-1") => `${userPath(uid)}/subscriptions/${id}`;

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`R10 clients cannot introduce or change profile email in ${root}`, async () => {
    const path = `${root}/users/users/privacy-existing`;
    const emailFreePath = `${root}/users/users/privacy-email-free`;
    await seed(path, { displayName: 'Chosen listener', email: 'historical@example.test', isActive: true });
    await seed(emailFreePath, { displayName: 'Email-free listener', isActive: true });
    const clients = [anonymousDb(), userDb('privacy-existing'),
      userDb('scoped', { admin: true, role: 'station_admin', allStations: true }),
      userDb('moderator', { admin: true, role: 'moderator' }),
      userDb('legacy-super', { admin: true }), userDb('explicit-super', { role: 'super_admin' })];
    for (let index = 0; index < clients.length; index++) {
      const db = clients[index];
      await assertFails(setDoc(doc(db, `${root}/users/users/privacy-new-${index}`), { displayName: 'Listener', email: 'new@example.test' }));
      await assertFails(updateDoc(doc(db, emailFreePath), { email: 'backfill@example.test' }));
      await assertFails(updateDoc(doc(db, path), { email: 'replacement@example.test' }));
    }
  });

  test(`R10 super-admin transition permits safe unrelated updates and email removal in ${root}`, async () => {
    const db = userDb('transition-super', { admin: true });
    const path = `${root}/users/users/privacy-transition`;
    await seed(path, { displayName: 'Chosen listener', email: 'historical@example.test', isActive: true });
    await assertSucceeds(updateDoc(doc(db, path), { isActive: false }));
    await assertSucceeds(updateDoc(doc(db, path), { email: deleteField() }));
    await assertSucceeds(setDoc(doc(db, `${root}/users/users/privacy-new-safe`), { displayName: 'Email-free listener', isActive: true }));
    await assertFails(updateDoc(doc(db, path), { email: '' }));
  });
}

test('editorial documents, identity reservations and catalog revisions reject every direct client mutation', async () => {
  for (const root of ['HudHudDev', 'HudHudOfficial']) {
    for (const kind of ['stations', 'programs', 'episodes', 'banners', 'locations', 'importKeys']) {
      const path = `${root}/${kind}/${kind}/editorial-existing`;
      const value = { name: 'Original', title: 'Original', stationId: 'owned', isActive: true };
      await seed(path, value);
      for (const db of [anonymousDb(), userDb('listener'), userDb('editor-super', { admin: true }),
        userDb('editor-station', { admin: true, role: 'station_admin', allStations: true })]) {
        await assertFails(setDoc(doc(db, `${root}/${kind}/${kind}/editorial-new`), value));
        await assertFails(updateDoc(doc(db, path), { title: 'Forged edit' }));
        await assertFails(deleteDoc(doc(db, path)));
      }
    }
    await seed(`${root}/locations`, { adminIdentityRevision: 1 });
    await assertFails(updateDoc(doc(userDb('editor-super', { admin: true }), `${root}/locations`), { adminIdentityRevision: 2 }));
  }
});

test('report decisions and comment moderation cannot bypass the trusted moderation transaction', async () => {
  for (const root of ['HudHudDev', 'HudHudOfficial']) {
    const report = `${root}/users/users/reporter/commentReportEpisodes/e/moderationReports/c`;
    const comment = `${root}/episodes/episodes/e/comments/c`;
    await seed(report, { targetType: 'comment', episodeId: 'e', commentId: 'c', reportedAuthorId: 'author',
      reason: 'spam', details: '', status: 'open', createdAt: new Date() });
    await seed(comment, { episodeId: 'e', authorId: 'author', status: 'published' });
    const db = userDb('editor-super', { admin: true });
    await assertFails(updateDoc(doc(db, report), { status: 'dismissed', resolution: 'noAction', reviewedAt: serverTimestamp(), reviewedBy: 'editor-super' }));
    await assertFails(updateDoc(doc(db, comment), { status: 'hidden' }));
    await assertFails(deleteDoc(doc(db, comment)));
  }
});

let testEnv;

function anonymousDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function userDb(uid, claims = {}) {
  return testEnv.authenticatedContext(uid, {
    email_verified: true,
    ...claims,
  }).firestore();
}

async function seed(path, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

function listenerProfile(overrides = {}) {
  return {
    displayName: "Listener",
    username: "",
    avatarUrl: "",
    isActive: true,
    role: "listener",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: R01 private station metadata is super-admin readable and server-write-only`, async () => {
    const path = `${root}/stationPrivate/stations/privacy-fixture`;
    await seed(path, { schemaVersion: 1, revision: 1, owner: 'Synthetic owner' });
    const denied = [anonymousDb(), userDb('unverified', { email_verified: false }),
      userDb('listener'), userDb('station-admin', { admin: true, role: 'station_admin', assignedStations: ['privacy-fixture'] }),
      userDb('foreign-admin', { admin: true, role: 'station_admin', assignedStations: ['elsewhere'] }),
      userDb('moderator', { admin: true, role: 'moderator' })];
    for (const db of denied) {
      await assertFails(getDoc(doc(db, path)));
      await assertFails(getDocs(collection(db, `${root}/stationPrivate/stations`)));
    }
    for (const db of [userDb('legacy-super', { admin: true }),
      userDb('explicit-super', { role: 'super_admin' })]) {
      await assertSucceeds(getDoc(doc(db, path)));
      await assertSucceeds(getDocs(collection(db, `${root}/stationPrivate/stations`)));
    }
    for (const db of [...denied, userDb('super-writer', { admin: true })]) {
      await assertFails(setDoc(doc(db, `${path}-new`), { owner: 'Forged' }));
      await assertFails(updateDoc(doc(db, path), { owner: 'Forged' }));
      await assertFails(deleteDoc(doc(db, path)));
    }
    const superDb = userDb('unknown-root-super', { admin: true });
    await seed('UnknownRoot/stationPrivate/stations/privacy-fixture', { revision: 1 });
    await assertFails(getDoc(doc(superDb, 'UnknownRoot/stationPrivate/stations/privacy-fixture')));
    await assertFails(getDocs(collection(superDb, 'UnknownRoot/stationPrivate/stations')));
  });
}

function validComment(uid, overrides = {}) {
  return {
    episodeId: "episode-1",
    authorId: uid,
    authorName: "Listener",
    content: "A useful comment",
    createdAt: serverTimestamp(),
    isEdited: false,
    status: "published",
    ...overrides,
  };
}

function validUgcAgreement(overrides = {}) {
  return {
    termsVersion: "2026-09-01",
    acceptedAt: serverTimestamp(),
    ...overrides,
  };
}

function validBlockedUser(overrides = {}) {
  return {
    blockedUserId: "user-b",
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

function validCommentReport(overrides = {}) {
  return {
    targetType: "comment",
    episodeId: "episode-1",
    commentId: "comment-1",
    reportedAuthorId: "user-b",
    reason: "harassment",
    details: "Repeated personal attacks",
    status: "open",
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

function validFavorite(overrides = {}) {
  return {
    targetType: "station",
    targetId: "station-1",
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

function validSubscription(overrides = {}) {
  return {
    targetType: "program",
    targetId: "program-1",
    notificationsEnabled: true,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

describe("listener account profiles", () => {
  test("only the backend creates a profile and its owner can read it", async () => {
    const db = userDb("user-a");
    await assertFails(setDoc(doc(db, userPath("user-a")), listenerProfile()));
    await seed(userPath("user-a"), listenerProfile());
    await assertSucceeds(getDoc(doc(db, userPath("user-a"))));
    await assertFails(getDoc(doc(db, userPath("user-b"))));
  });

  test("role escalation, private extra fields and client updates are denied", async () => {
    const profile = doc(userDb("user-a"), userPath("user-a"));
    await assertFails(setDoc(profile, listenerProfile({ role: "admin" })));
    await assertFails(setDoc(profile, listenerProfile({ notificationToken: "secret" })));
    await seed(userPath("user-a"), {
      ...listenerProfile(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await assertFails(updateDoc(profile, { role: "admin" }));
  });

  test("only an administrator can list profiles", async () => {
    await seed(userPath("user-a"), { displayName: "Listener" });
    await assertFails(getDocs(collection(userDb("user-a"), "HudHudDev/users/users")));
    await assertSucceeds(
      getDocs(collection(userDb("admin-a", { admin: true }), "HudHudDev/users/users")),
    );
  });

  test("verification challenges are private and unverified users cannot write", async () => {
    const unverified = userDb("user-a", { email_verified: false });
    const challenge = "HudHudDev/emailVerificationChallenges/challenges/user-a";
    const emailLimit = "HudHudDev/emailVerificationRateLimits/emails/hash-a";
    await seed(challenge, { codeHash: "private" });
    await seed(emailLimit, { sendCount: 1 });
    await seed(userPath("user-a"), {
      ...listenerProfile(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await assertFails(getDoc(doc(unverified, challenge)));
    await assertFails(getDoc(doc(unverified, emailLimit)));
    await assertFails(setDoc(doc(unverified, favoritePath("user-a")), validFavorite()));
    await assertFails(setDoc(doc(unverified, ugcAgreementPath("user-a")), validUgcAgreement()));
    await assertFails(setDoc(doc(unverified, commentPath()), validComment("user-a")));
  });
});

describe("episode comments", () => {
  beforeEach(async () => {
    await seed(episodePath(), { programId: "program-1" });
    await seed(userPath("user-a"), {
      displayName: "Listener",
      username: "",
      avatarUrl: "",
      isActive: true,
      role: "listener",
    });
  });

  test("comments require an existing episode without an active deletion fence", async () => {
    await seed(ugcAgreementPath("user-a"), validUgcAgreement());
    await seed(episodePath(), { programId: "program-1", adminDeletionToken: "test-deletion" });
    await assertFails(setDoc(doc(userDb("user-a"), commentPath()), validComment("user-a")));
    await testEnv.withSecurityRulesDisabled(async context => deleteDoc(doc(context.firestore(), episodePath())));
    await assertFails(setDoc(doc(userDb("user-a"), commentPath()), validComment("user-a")));
  });

  test("comments are public to read and authenticated listeners can add", async () => {
    await assertFails(setDoc(doc(userDb("user-a"), commentPath()), validComment("user-a")));
    await assertSucceeds(
      setDoc(doc(userDb("user-a"), ugcAgreementPath("user-a")), validUgcAgreement()),
    );
    await assertSucceeds(setDoc(doc(userDb("user-a"), commentPath()), validComment("user-a")));
    await assertSucceeds(getDoc(doc(anonymousDb(), commentPath())));
  });

  test("only the owner can accept the current canonical UGC terms", async () => {
    const ownerAgreement = doc(userDb("user-a"), ugcAgreementPath("user-a"));
    await assertSucceeds(setDoc(ownerAgreement, validUgcAgreement()));
    await assertSucceeds(getDoc(ownerAgreement));
    await assertFails(
      setDoc(doc(userDb("user-b"), ugcAgreementPath("user-a")), validUgcAgreement()),
    );
    await assertFails(setDoc(ownerAgreement, validUgcAgreement({ termsVersion: "old" })));
    await assertFails(setDoc(ownerAgreement, validUgcAgreement({ email: "private@example.com" })));
  });

  test("anonymous and forged comments are denied", async () => {
    await seed(ugcAgreementPath("user-a"), {
      termsVersion: "2026-09-01",
      acceptedAt: new Date(),
    });
    await assertFails(setDoc(doc(anonymousDb(), commentPath()), validComment("user-a")));
    await assertFails(
      setDoc(
        doc(userDb("user-a"), commentPath()),
        validComment("user-a", { authorName: "Administrator" }),
      ),
    );
    await assertFails(setDoc(doc(userDb("user-a"), commentPath()), validComment("user-b")));
  });

  test("invalid bodies and listener edits are denied", async () => {
    await seed(ugcAgreementPath("user-a"), {
      termsVersion: "2026-09-01",
      acceptedAt: new Date(),
    });
    await assertFails(
      setDoc(
        doc(userDb("user-a"), commentPath()),
        validComment("user-a", { content: "x".repeat(1001) }),
      ),
    );
    await seed(commentPath(), {
      episodeId: "episode-1",
      authorId: "user-a",
      authorName: "Listener",
      content: "Original",
      createdAt: new Date(),
      isEdited: false,
      status: "published",
    });
    await assertFails(
      updateDoc(doc(userDb("user-a"), commentPath()), {
        content: "Edited",
      }),
    );
  });

  test("public queries return only published comments", async () => {
    await seed(commentPath(), {
      ...validComment("user-a"),
      createdAt: new Date(),
      status: "published",
    });
    const comments = collection(anonymousDb(), `${episodePath()}/comments`);
    await assertFails(getDocs(comments));
    await assertSucceeds(getDocs(query(comments, where("status", "==", "published"))));
    await assertFails(
      updateDoc(doc(userDb("admin-a", { admin: true }), commentPath()), { status: "hidden" }),
    );
    await seed(commentPath(), { ...validComment("user-a"), createdAt: new Date(), status: "hidden" });
    await assertFails(getDoc(doc(anonymousDb(), commentPath())));
  });
});

describe("favorites and subscriptions", () => {
  beforeEach(async () => {
    await seed(userPath("user-a"), {
      displayName: "Listener",
      username: "",
      avatarUrl: "",
      isActive: true,
      role: "listener",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  test("a listener owns canonical favorites and cannot forge their shape", async () => {
    const owner = userDb("user-a");
    const favorite = doc(owner, favoritePath("user-a"));
    await assertSucceeds(setDoc(favorite, validFavorite()));
    await assertSucceeds(getDoc(favorite));
    await assertFails(getDoc(doc(userDb("user-b"), favoritePath("user-a"))));
    await assertFails(
      setDoc(
        doc(owner, favoritePath("user-a", "invalid")),
        validFavorite({ targetType: "banner" }),
      ),
    );
    await assertFails(
      setDoc(
        doc(owner, favoritePath("user-a", "private")),
        validFavorite({ email: "private@example.com" }),
      ),
    );
    await assertSucceeds(deleteDoc(favorite));
  });

  test("a listener can update only their canonical subscription", async () => {
    const owner = userDb("user-a");
    const subscription = doc(owner, subscriptionPath("user-a"));
    await assertSucceeds(setDoc(subscription, validSubscription()));
    await assertSucceeds(
      updateDoc(subscription, {
        notificationsEnabled: false,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(userDb("user-b"), subscriptionPath("user-a")), {
        isActive: false,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(
        doc(owner, subscriptionPath("user-a", "invalid")),
        validSubscription({ targetType: "episode" }),
      ),
    );
  });

  test("guests are denied and administrators can audit collection groups", async () => {
    await seed(favoritePath("user-a"), {
      targetType: "station",
      targetId: "station-1",
      createdAt: new Date(),
    });
    await seed(subscriptionPath("user-a"), {
      targetType: "program",
      targetId: "program-1",
      notificationsEnabled: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await assertFails(getDoc(doc(anonymousDb(), favoritePath("user-a"))));
    const admin = userDb("admin-a", { admin: true });
    await assertSucceeds(getDocs(collectionGroup(admin, "favorites")));
    await assertSucceeds(getDocs(collectionGroup(admin, "subscriptions")));
    await assertSucceeds(deleteDoc(doc(admin, favoritePath("user-a"))));
  });

  test("a disabled listener cannot create personal or moderation data", async () => {
    await seed(userPath("user-a"), {
      displayName: "Listener",
      username: "",
      avatarUrl: "",
      isActive: false,
      role: "listener",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const disabled = userDb("user-a");
    await assertFails(setDoc(doc(disabled, favoritePath("user-a")), validFavorite()));
    await assertFails(setDoc(doc(disabled, subscriptionPath("user-a")), validSubscription()));
    await assertFails(setDoc(doc(disabled, blockedUserPath("user-a")), validBlockedUser()));
    await assertFails(setDoc(doc(disabled, ugcAgreementPath("user-a")), validUgcAgreement()));
  });
});

describe("comment reports and personal blocks", () => {
  beforeEach(async () => {
    await seed(userPath("user-a"), {
      displayName: "Reporting user",
      username: "",
      avatarUrl: "",
      isActive: true,
      role: "listener",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await seed(episodePath(), { stats: { commentsCount: 1 } });
    await seed(commentPath(), {
      episodeId: "episode-1",
      authorId: "user-b",
      authorName: "Reported user",
      content: "Reported content",
      createdAt: new Date(),
      isEdited: false,
      status: "published",
    });
  });

  test("a listener can report another user's existing comment only once", async () => {
    const report = doc(userDb("user-a"), commentReportPath("user-a"));
    await assertSucceeds(setDoc(report, validCommentReport()));
    await assertSucceeds(getDoc(report));
    await assertFails(setDoc(report, validCommentReport()));
    await assertFails(getDoc(doc(userDb("user-b"), commentReportPath("user-a"))));
  });

  test("a listener can report a user once from a matching comment context", async () => {
    const report = doc(userDb("user-a"), userReportPath("user-a"));
    await assertSucceeds(setDoc(report, validCommentReport({ targetType: "user" })));
    await assertFails(
      setDoc(
        doc(userDb("user-a"), userReportPath("user-a", "user-c")),
        validCommentReport({
          targetType: "user",
          reportedAuthorId: "user-b",
        }),
      ),
    );
    await assertFails(setDoc(report, validCommentReport({ targetType: "user" })));
    await seed(commentPath("comment-2"), {
      ...validComment("user-b"),
      createdAt: new Date(),
    });
    await assertSucceeds(
      setDoc(
        doc(userDb("user-a"), userReportPath("user-a", "user-b", "comment-2")),
        validCommentReport({
          targetType: "user",
          commentId: "comment-2",
        }),
      ),
    );
  });

  test("anonymous, self, forged, and malformed reports are denied", async () => {
    await assertFails(
      setDoc(doc(anonymousDb(), commentReportPath("user-a")), validCommentReport()),
    );
    await assertFails(
      setDoc(
        doc(userDb("user-b"), commentReportPath("user-b")),
        validCommentReport({ reportedAuthorId: "user-b" }),
      ),
    );
    await assertFails(
      setDoc(
        doc(userDb("user-a"), commentReportPath("user-a")),
        validCommentReport({
          reportedAuthorId: "user-c",
        }),
      ),
    );
    await assertFails(
      setDoc(
        doc(userDb("user-a"), commentReportPath("user-a")),
        validCommentReport({ reason: "dislike" }),
      ),
    );
    await assertFails(
      setDoc(
        doc(userDb("user-a"), commentReportPath("user-a")),
        validCommentReport({ email: "private@example.com" }),
      ),
    );
  });

  test("administrators can list and resolve reports with an audited decision", async () => {
    await seed(commentReportPath("user-a"), {
      ...validCommentReport(),
      createdAt: new Date(),
    });
    const admin = userDb("admin-a", { admin: true });
    await assertSucceeds(getDocs(collectionGroup(admin, "moderationReports")));
    await assertFails(getDocs(collectionGroup(userDb("user-a"), "moderationReports")));
    await assertFails(
      updateDoc(doc(userDb("user-a"), commentReportPath("user-a")), {
        status: "dismissed",
        resolution: "noAction",
        reviewedAt: serverTimestamp(),
        reviewedBy: "user-a",
      }),
    );
    await assertFails(
      updateDoc(doc(admin, commentReportPath("user-a")), {
        status: "resolved",
        resolution: "noAction",
        reviewedAt: serverTimestamp(),
        reviewedBy: "admin-a",
      }),
    );
    const batch = writeBatch(admin);
    batch.update(doc(admin, commentPath()), {
      status: "removed",
      moderatedAt: serverTimestamp(),
      moderatedBy: "admin-a",
    });
    batch.update(doc(admin, episodePath()), {
      "stats.commentsCount": increment(-1),
    });
    batch.update(doc(admin, commentReportPath("user-a")), {
      status: "resolved",
      resolution: "commentRemoved",
      reviewedAt: serverTimestamp(),
      reviewedBy: "admin-a",
    });
    await assertFails(batch.commit());
    assert.equal((await getDoc(doc(admin, commentReportPath("user-a")))).data().status, "open");
    assert.equal((await getDoc(doc(admin, commentPath()))).data().status, "published");
    await assertSucceeds(getDoc(doc(anonymousDb(), commentPath())));
  });

  test("administrators can disable a reported account and close its report", async () => {
    await seed(userPath("user-b"), {
      displayName: "Reported user",
      username: "",
      avatarUrl: "",
      isActive: true,
      role: "listener",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await seed(userReportPath("user-a"), {
      ...validCommentReport({ targetType: "user" }),
      createdAt: new Date(),
    });
    const admin = userDb("admin-a", { admin: true });
    const batch = writeBatch(admin);
    batch.update(doc(admin, userPath("user-b")), {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(admin, userReportPath("user-a")), {
      status: "resolved",
      resolution: "userDisabled",
      reviewedAt: serverTimestamp(),
      reviewedBy: "admin-a",
    });
    await assertFails(batch.commit());
    assert.equal((await getDoc(doc(admin, userPath("user-b")))).data().isActive, true);
  });

  test("a listener can create and remove only their own canonical block", async () => {
    const block = doc(userDb("user-a"), blockedUserPath("user-a"));
    await assertSucceeds(setDoc(block, validBlockedUser()));
    await assertSucceeds(getDoc(block));
    await assertFails(getDoc(doc(userDb("user-b"), blockedUserPath("user-a"))));
    await assertFails(
      setDoc(
        doc(userDb("user-a"), blockedUserPath("user-a", "user-a")),
        validBlockedUser({ blockedUserId: "user-a" }),
      ),
    );
    await assertFails(updateDoc(block, { blockedUserId: "user-c" }));
    await assertSucceeds(deleteDoc(block));
  });
});

describe("default denial", () => {
  test("unknown paths stay closed", async () => {
    await assertFails(
      setDoc(doc(userDb("user-a"), "HudHudDev/private/secrets/item"), {
        value: true,
      }),
    );
    assert.ok(true);
  });
});

test('social providers cannot replace email verification in either root', async () => {
  for (const root of ['HudHudDev', 'HudHudOfficial']) {
    await seed(`${root}/users/users/social-user`, listenerProfile());
    for (const provider of ['facebook.com', 'google.com', 'apple.com', 'password']) {
      const db = userDb('social-user', { email_verified: false, firebase: { sign_in_provider: provider, identities: { 'google.com': ['linked-identity'] } } });
      await assertFails(setDoc(doc(db, `${root}/users/users/social-user/favorites/item`), validFavorite()));
      await assertFails(setDoc(doc(db, `${root}/users/users/social-user/agreements/ugc`), validUgcAgreement()));
    }
    await assertSucceeds(setDoc(doc(userDb('social-user'), `${root}/users/users/social-user/favorites/item`), validFavorite()));
  }
});

test('admin document-ID bounds restrict collection-group audits to selected root', async () => {
  for (const root of ['HudHudDev', 'HudHudOfficial']) {
    await seed(`${root}/episodes/episodes/episode/comments/comment`, { authorId: 'listener', status: 'published' });
    await seed(`${root}/users/users/listener/favorites/favorite`, validFavorite());
    await seed(`${root}/users/users/listener/subscriptions/subscription`, { targetId: 'station' });
    await seed(`${root}/users/users/listener/commentReportEpisodes/episode/moderationReports/report`, { reportedAuthorId: 'other' });
  }
  const db = userDb('admin', { admin: true });
  for (const root of ['HudHudDev', 'HudHudOfficial']) {
    for (const group of ['comments', 'favorites', 'subscriptions', 'moderationReports']) {
      const result = await assertSucceeds(getDocs(query(collectionGroup(db, group), where(documentId(), '>=', doc(db, root, 'episodes')), where(documentId(), '<', doc(db, root, 'users\uf8ff')), limit(200))));
      assert.equal(result.size, 1, `${root}/${group}`);
      assert.ok(result.docs.every((item) => item.ref.path.startsWith(`${root}/`)));
    }
  }
});

test('cached verified tokens cannot recreate deleted-user data or bypass either-root barriers', async () => {
  const uid = 'deleted-user';
  const db = userDb(uid);
  for (const root of ['HudHudDev', 'HudHudOfficial']) {
    await assertFails(setDoc(doc(db, `${root}/users/users/${uid}/agreements/ugc`), validUgcAgreement()));
    await seed(`${root}/users/users/${uid}`, listenerProfile());
  }
  await seed(`HudHudOfficial/accountDeletionRequests/requests/${uid}`, { status: 'completed', expiresAt: new Date(Date.now() + 86400000) });
  for (const root of ['HudHudDev', 'HudHudOfficial']) {
    await assertFails(setDoc(doc(db, `${root}/users/users/${uid}/agreements/ugc`), validUgcAgreement()));
    await assertFails(setDoc(doc(db, `${root}/users/users/${uid}/favorites/item`), validFavorite()));
    await assertFails(getDoc(doc(db, `${root}/accountDeletionRequests/requests/${uid}`)));
  }
});


test("location identity catalog is admin-readable but server-written in known roots", async () => {
  for (const root of ["HudHudDev", "HudHudOfficial"]) {
    const path = `${root}/locations`;
    await seed(path, { adminIdentityRevision: 1 });
    await assertFails(setDoc(doc(userDb("admin", { admin: true }), path), { adminIdentityRevision: 1 }));
    await assertSucceeds(getDoc(doc(userDb("admin", { admin: true }), path)));
    for (const db of [anonymousDb(), userDb("listener"), userDb("forged", { role: "admin" })]) {
      await assertFails(getDoc(doc(db, path)));
      await assertFails(setDoc(doc(db, path), { adminIdentityRevision: 2 }));
    }
  }
  await assertFails(setDoc(doc(userDb("admin", { admin: true }), "Unknown/locations"), { adminIdentityRevision: 1 }));
});

test("location fields and relation revisions require the trusted save callable", async () => {
  for (const root of ["HudHudDev", "HudHudOfficial"]) {
    const locPath = `${root}/locations/locations/loc-1`;
    await seed(locPath, {
      countryCode: "YE",
      countryNameAr: "اليمن",
      cityCode: "sanaa",
      cityNameAr: "صنعاء",
      adminRelationRevision: 1,
    });
    const stationAdmin = userDb("station-admin-user", {
      admin: true,
      role: "station_admin",
      allStations: true,
    });
    // Even revision touches are now owned by the trusted transaction.
    await assertFails(
      updateDoc(doc(stationAdmin, locPath), { adminRelationRevision: increment(1) }),
    );
    // Denied from editing other location fields
    await assertFails(
      updateDoc(doc(stationAdmin, locPath), { cityNameAr: "مدينة أخرى" }),
    );
    // Denied from deleting location
    await assertFails(deleteDoc(doc(stationAdmin, locPath)));
  }
});

test("notifications audit log is private to super admin in both roots (IR-01)", async () => {
  for (const root of ["HudHudDev", "HudHudOfficial"]) {
    const notifPath = `${root}/notifications/notifications/notif-1`;
    await seed(notifPath, {
      title: "Test",
      body: "Body",
      sentBy: "super@hudhud.fm",
      messageId: "fcm-msg-123",
      status: "sent",
    });

    const superAdmin = userDb("super-admin-user", {
      role: "super_admin",
    });
    const stationAdmin = userDb("station-admin-user", {
      admin: true,
      role: "station_admin",
      allStations: true,
    });
    const listener = userDb("listener-user");
    const guest = anonymousDb();

    // Super admin can read
    await assertSucceeds(getDoc(doc(superAdmin, notifPath)));
    // Station admin, listener, and guest are denied (IR-01)
    await assertFails(getDoc(doc(stationAdmin, notifPath)));
    await assertFails(getDoc(doc(listener, notifPath)));
    await assertFails(getDoc(doc(guest, notifPath)));
  }
});

test("station admin cannot read user profiles or moderate other station comments (IR-02)", async () => {
  for (const root of ["HudHudDev", "HudHudOfficial"]) {
    const listenerUid = "listener-profile-target";
    const profilePath = `${root}/users/users/${listenerUid}`;
    await seed(profilePath, {
      displayName: "Target Listener",
      email: "listener@example.com",
      isActive: true,
      role: "listener",
    });

    const epStationAPath = `${root}/episodes/episodes/ep-station-a`;
    const epStationBPath = `${root}/episodes/episodes/ep-station-b`;
    await seed(epStationAPath, { stationId: "station-a" });
    await seed(epStationBPath, { stationId: "station-b" });

    const commentBPath = `${epStationBPath}/comments/comment-b`;
    const commentAPath = `${epStationAPath}/comments/comment-a`;
    await seed(commentBPath, {
      authorId: listenerUid,
      content: "Comment on Station B",
      status: "published",
    });
    await seed(commentAPath, {
      authorId: listenerUid,
      content: "Comment on Station A",
      status: "published",
    });

    const stationAdminA = userDb("station-admin-a", {
      admin: true,
      role: "station_admin",
      assignedStations: ["station-a"],
    });
    const superAdmin = userDb("super-admin", {
      role: "super_admin",
    });

    // Station admin cannot read listener's private user document
    await assertFails(getDoc(doc(stationAdminA, profilePath)));
    // Super admin CAN read listener's document
    await assertSucceeds(getDoc(doc(superAdmin, profilePath)));

    // Station admin A cannot moderate comment on station B episode
    await assertFails(
      updateDoc(doc(stationAdminA, commentBPath), { status: "hidden" }),
    );
    // Own-station moderation also uses the callable, which stamps its actor.
    await assertFails(
      updateDoc(doc(stationAdminA, commentAPath), { status: "hidden" }),
    );
    // Super admins cannot bypass the coupled moderation/counter transaction.
    await assertFails(
      updateDoc(doc(superAdmin, commentBPath), { status: "hidden" }),
    );
  }
});

test("station health monitoring fields cannot be updated by client or station admin (ST-3)", async () => {
  for (const root of ["HudHudDev", "HudHudOfficial"]) {
    const stationPath = `${root}/stations/stations/station-a`;
    await seed(stationPath, {
      name: "Station A",
      countryCode: "YE",
      countryNameAr: "اليمن",
      cityCode: "sanaa",
      cityNameAr: "صنعاء",
      priority: 1,
      isLive: true,
      isActive: true,
      isVerified: true,
      isFeatured: false,
      healthStatus: "online",
      consecutiveFailures: 0,
      streamHealthSource: "primary",
    });

    const stationAdminA = userDb("station-admin-a", {
      admin: true,
      role: "station_admin",
      assignedStations: ["station-a"],
    });

    // Editorial metadata also requires the trusted, audited callable.
    await assertFails(
      updateDoc(doc(stationAdminA, stationPath), { tagline: "New Tagline" }),
    );

    // Denied from forging healthStatus or automated monitoring fields (ST-3)
    await assertFails(
      updateDoc(doc(stationAdminA, stationPath), { healthStatus: "offline" }),
    );
    await assertFails(
      updateDoc(doc(stationAdminA, stationPath), { consecutiveFailures: 3 }),
    );
    await assertFails(
      updateDoc(doc(stationAdminA, stationPath), { streamHealthSource: "backup" }),
    );
  }
});



test('broadcast history outcomes are server-owned while super admins retain history deletion', async () => {
  for (const root of ['HudHudDev', 'HudHudOfficial']) {
    const path = `${root}/notifications/notifications/trusted-history`;
    const admin = userDb('history-admin', { admin: true, role: 'super_admin' });
    await assertFails(setDoc(doc(admin, path), { title: 'Forged', status: 'sent' }));
    await seed(path, { title: 'Synthetic', status: 'unknown' });
    await assertFails(updateDoc(doc(admin, path), { status: 'sent' }));
    await assertSucceeds(getDoc(doc(admin, path)));
    await assertSucceeds(deleteDoc(doc(admin, path)));
  }
});

test('identity scope proofs and backfill checkpoints stay private to trusted maintenance', async () => {
  for (const root of ['HudHudDev', 'HudHudOfficial']) {
    for (const context of [anonymousDb(), userDb('identity-listener'), userDb('identity-super', { admin: true, role: 'super_admin' })]) {
      for (const path of [`${root}/adminImages/images/synthetic`, `${root}/adminImageUploadLimits/actors/synthetic`, `${root}/regionalMigrations/runs/synthetic`, `${root}/identityScopes/scopes/synthetic`, `${root}/identityScopeLocks/locks/synthetic`, `${root}/identityBackfills/runs/synthetic`, `${root}/identityBackfills/runs/synthetic/items/key`]) {
        await seed(path, { state: 'complete' });
        await assertFails(getDoc(doc(context, path)));
        await assertFails(setDoc(doc(context, path), { state: 'complete' }));
      }
    }
  }
});


// M04-T12-FENCE-READY: partial04-T12 only. Server writers and activation remain B15.
const maintenanceFence = (changes = {}) => ({
  version: 1, state: 'paused', generation: 1, owner: 'synthetic-maintenance-owner',
  planHash: 'a'.repeat(64), leaseUntil: Date.now() + 60000, writerProtocol: 1, ...changes,
});
const activeMaintenanceFence = () => maintenanceFence({ state: 'active',
  activeFrom: Timestamp.fromMillis(Date.now()), baselineManifestHash: 'b'.repeat(64) });
async function seedFenceCommentContext(root, uid = 'fence-listener') {
  await seed(`${root}/episodes/episodes/episode-1`, { programId: 'fence-program', stationId: 'fence-station' });
  await seed(`${root}/users/users/${uid}`, listenerProfile());
  await seed(`${root}/users/users/${uid}/agreements/ugc`, validUgcAgreement());
  return { uid, db: userDb(uid), path: `${root}/episodes/episodes/episode-1/comments` };
}
for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`M04 fence: ${root} absent and valid active fences preserve authorized published creation`, async () => {
    const f = await seedFenceCommentContext(root);
    await assertSucceeds(setDoc(doc(f.db, `${f.path}/legacy`), validComment(f.uid)));
    await seed(`${root}/commentCountContributions`, activeMaintenanceFence());
    await assertSucceeds(setDoc(doc(f.db, `${f.path}/active`), validComment(f.uid)));
    assert.equal((await getDoc(doc(anonymousDb(), `${f.path}/active`))).get('status'), 'published');
  });
  for (const [label, fence] of [
    ['paused with current lease', () => maintenanceFence()],
    ['paused with expired lease', () => maintenanceFence({ leaseUntil: 0 })],
    ['unknown version', () => ({ ...activeMaintenanceFence(), version: 99 })],
    ['unknown state', () => maintenanceFence({ state: 'unknown' })],
    ['zero generation', () => ({ ...activeMaintenanceFence(), generation: 0 })],
    ['fractional generation', () => ({ ...activeMaintenanceFence(), generation: 1.5 })],
    ['string generation', () => ({ ...activeMaintenanceFence(), generation: '1' })],
    ['missing generation', () => { const { generation, ...value } = activeMaintenanceFence(); assert.equal(generation, 1); return value; }],
    ['unknown writer protocol', () => ({ ...activeMaintenanceFence(), writerProtocol: 2 })],
    ['invalid owner', () => ({ ...activeMaintenanceFence(), owner: '' })],
    ['invalid plan hash', () => ({ ...activeMaintenanceFence(), planHash: 'unreviewed' })],
    ['invalid lease type', () => ({ ...activeMaintenanceFence(), leaseUntil: '0' })],
    ['invalid activation timestamp', () => ({ ...activeMaintenanceFence(), activeFrom: 1234 })],
    ['missing baseline manifest hash', () => { const { baselineManifestHash, ...value } = activeMaintenanceFence(); assert.equal(baselineManifestHash.length, 64); return value; }],
  ]) test(`M04 fence: ${root} ${label} denies otherwise authorized comment creation`, async () => {
    const f = await seedFenceCommentContext(root);
    await seed(`${root}/commentCountContributions`, fence());
    await assertFails(setDoc(doc(f.db, `${f.path}/must-not-create`), validComment(f.uid)));
    await testEnv.withSecurityRulesDisabled(async context => {
      assert.equal((await getDoc(doc(context.firestore(), `${f.path}/must-not-create`))).exists(), false);
    });
  });
  test(`M04 fence: ${root} active state cannot bypass authentication, ownership, agreement or deletion checks`, async () => {
    const f = await seedFenceCommentContext(root);
    await seed(`${root}/commentCountContributions`, activeMaintenanceFence());
    await assertFails(setDoc(doc(anonymousDb(), `${f.path}/anonymous`), validComment(f.uid)));
    await assertFails(setDoc(doc(userDb(f.uid, { email_verified: false }), `${f.path}/unverified`), validComment(f.uid)));
    await assertFails(setDoc(doc(f.db, `${f.path}/forged-author`), validComment('other-author')));
    await testEnv.withSecurityRulesDisabled(async context => deleteDoc(doc(context.firestore(), `${root}/users/users/${f.uid}/agreements/ugc`)));
    await assertFails(setDoc(doc(f.db, `${f.path}/no-agreement`), validComment(f.uid)));
    await seed(`${root}/users/users/${f.uid}/agreements/ugc`, validUgcAgreement());
    await seed(`${root}/episodes/episodes/episode-1`, { programId: 'fence-program', adminDeletionToken: 'synthetic-deletion' });
    await assertFails(setDoc(doc(f.db, `${f.path}/deleting-episode`), validComment(f.uid)));
    await seed(`${root}/episodes/episodes/episode-1`, { programId: 'fence-program' });
    await seed(`${root}/accountDeletionRequests/requests/${f.uid}`, { status: 'pending' });
    await assertFails(setDoc(doc(f.db, `${f.path}/deleting-user`), validComment(f.uid)));
  });
  test(`M04 fence: ${root} private root, baseline and contribution ledgers deny every client operation`, async () => {
    const fencePath = `${root}/commentCountContributions`, baseline = `${fencePath}/episodes/episode-1`, ledger = `${baseline}/contributions/comment-1`;
    await seed(fencePath, maintenanceFence()); await seed(baseline, { version: 1, state: 'building', generation: 1 });
    await seed(ledger, { version: 1, generation: 1, contribution: 1 });
    const clients = [anonymousDb(), userDb('fence-normal'), userDb('fence-unverified', { email_verified: false }),
      userDb('fence-scoped', { admin: true, role: 'station_admin', assignedStations: ['fence-station'] }),
      userDb('fence-moderator', { admin: true, role: 'moderator' }), userDb('fence-legacy-admin', { admin: true }),
      userDb('fence-super', { role: 'super_admin' }), userDb('fence-role-only-station', { role: 'station_admin' }),
      userDb('fence-forged', { admin: true, role: 'super_admin', maintenanceOwner: 'synthetic-maintenance-owner' })];
    for (const client of clients) for (const path of [fencePath, baseline, ledger]) {
      await assertFails(getDoc(doc(client, path)));
      await assertFails(getDocs(query(collection(client, path.split('/').slice(0, -1).join('/')), where(documentId(), '==', doc(client, path)))));
      await assertFails(setDoc(doc(client, `${path}-new`), { version: 1 }));
      await assertFails(updateDoc(doc(client, path), { generation: 2 }));
      await assertFails(deleteDoc(doc(client, path)));
    }
  });
  test(`M04 fence: ${root} canonical bounded admin comment audit stays public-path-only with private ledger present`, async () => {
    await seed(`${root}/episodes/episodes/episode/comments/canonical`, { authorId: 'listener', status: 'published' });
    await seed(`${root}/commentCountContributions/episodes/episode/contributions/private`, { version: 1, contribution: 1 });
    const admin = userDb('fence-audit-admin', { admin: true });
    const result = await assertSucceeds(getDocs(query(collectionGroup(admin, 'comments'),
      where(documentId(), '>=', doc(admin, root, 'episodes')), where(documentId(), '<', doc(admin, root, 'users\uf8ff')), limit(200))));
    assert.equal(result.size, 1); assert.equal(result.docs[0].id, 'canonical');
    await assertFails(getDocs(collection(admin, `${root}/commentCountContributions/episodes/episode/contributions`)));
  });
}


// W04-W6-CODE is guard-only: these existing default-deny protections must
// remain GREEN. Synthetic record bodies test the actual registered paths;
// native receipts and cutover execution are verified by the SDK fixture.
for (const root of ['HudHudDev', 'HudHudOfficial', 'UnknownRoot']) {
  test(`B16 private state: ${root} denies every client role and operation without closing canonical workflows`, async () => {
    const known = root !== 'UnknownRoot', publicRoot = known ? root : 'HudHudDev';
    const owner = 'b16-owner', manifestHash = 'c'.repeat(64), v1Key = 'd'.repeat(64), v2Key = 'e'.repeat(64);
    const job = `${root}/notificationOperations/operations/program_date_migration_${manifestHash}`;
    const countPlan = `${root}/commentCountContributions/maintenance/${manifestHash}`;
    const rssJob = `${root}/rssUrlRepairs/runs/b16-synthetic-run`;
    const stamp = Timestamp.fromMillis(1000);
    const paths = [
      [`${root}/streamHealthJobs/checkpoints/active`, { version: 1, owner, generation: 1, cursor: null }],
      [`${root}/commentCountContributions`, activeMaintenanceFence()],
      [`${root}/commentCountContributions/episodes/episode-1`, { version: 1, state: 'active', generation: manifestHash }],
      [`${root}/commentCountContributions/episodes/episode-1/contributions/b16-comment`, { version: 1, contribution: 1 }],
      [countPlan, { version: 1, owner, phase: 'active', manifestHash }],
      [`${countPlan}/units/000000000000`, { version: 1, sequence: 0, manifestHash }],
      [rssJob, { version: 2, runId: 'b16-synthetic-run', owner, nextIndex: 1 }],
      [`${rssJob}/items/000`, { version: 2, runId: 'b16-synthetic-run', index: 0, mode: 'apply' }],
      [`${rssJob}/restores/000`, { version: 2, runId: 'b16-synthetic-run', index: 0, mode: 'restore' }],
      [`${root}/notificationOperations/operations/${v1Key}`, { status: 'sent', phase: 'sending', attempts: 1 }],
      [`${root}/notificationOperations/operations/${v2Key}`, { status: 'unknown', phase: 'claimed', attempts: 0, fingerprint: manifestHash }],
      [job, { version: 1, kind: 'program-date-migration', manifestHash, projectId: PROJECT_ID, root, programId: 'b16-program',
        cutoverAt: stamp, fromLocalDate: '2026-10-27', toLocalDate: '2026-10-27', owner, generation: 1,
        leaseUntilMs: 0, nextIndex: 1, entryCount: 1, status: 'completed', backupExpiresAtMs: 2000,
        receiptVersions: [stamp], pendingReceiptIndex: null }],
      [`${job}/items/000`, { version: 1, manifestHash, index: 0, v2Key, action: 'preserved-terminal', sourceHash: manifestHash,
        beforeHash: manifestHash, afterProjectionHash: manifestHash, targetChanged: false, targetCreateTime: stamp, targetUpdateTime: stamp }],
    ];
    for (const [path, data] of paths) await seed(path, data);
    const publicStation = `${publicRoot}/stations/stations/b16-station`, canonicalEpisode = `${root}/episodes/episodes/episode-1`;
    await seed(publicStation, { name: 'Synthetic public station', isActive: true });
    await seed(canonicalEpisode, { stationId: 'b16-station', programId: 'b16-program', stats: { commentsCount: 0 } });
    await seed(`${root}/users/users/${owner}`, listenerProfile());
    const clients = [
      anonymousDb(), userDb(owner), userDb('b16-other'), userDb('b16-unverified', { email_verified: false }),
      userDb('b16-scoped', { admin: true, role: 'station_admin', assignedStations: ['b16-station'] }),
      userDb('b16-moderator', { admin: true, role: 'moderator' }), userDb('b16-legacy-admin', { admin: true }),
      userDb('b16-super', { role: 'super_admin' }), userDb('b16-role-admin', { role: 'admin' }),
      userDb('b16-role-station', { role: 'station_admin' }), userDb('b16-role-moderator', { role: 'moderator' }),
      userDb('b16-forged', { admin: true, role: 'super_admin', maintenanceOwner: owner, owner, manifestHash, root, projectId: PROJECT_ID }),
    ];
    for (const client of clients) {
      const publicResult = await assertSucceeds(getDoc(doc(client, publicStation)));
      assert.equal(publicResult.get('name'), 'Synthetic public station', 'A healthy canonical read must precede private denial checks');
      for (const [path, data] of paths) {
        await assertFails(getDoc(doc(client, path)));
        await assertFails(getDocs(query(collection(client, path.split('/').slice(0, -1).join('/')),
          where(documentId(), '==', doc(client, path)), limit(1))));
        await assertFails(setDoc(doc(client, `${path}-client-created`), data));
        await assertFails(updateDoc(doc(client, path), { version: 99 }));
        await assertFails(deleteDoc(doc(client, path)));
      }
      await assertFails(updateDoc(doc(client, canonicalEpisode), { 'stats.commentsCount': 999 }));
    }
    const agreement = `${root}/users/users/${owner}/agreements/ugc`;
    if (known) {
      const listener = userDb(owner);
      await assertSucceeds(setDoc(doc(listener, agreement), validUgcAgreement()));
      const comment = `${canonicalEpisode}/comments/b16-positive`;
      await assertSucceeds(setDoc(doc(listener, comment), validComment(owner)));
      assert.equal((await assertSucceeds(getDoc(doc(anonymousDb(), comment)))).get('status'), 'published');
      await assertFails(setDoc(doc(userDb(owner, { email_verified: false }), agreement), validUgcAgreement()));
      await assertFails(setDoc(doc(userDb('b16-other'), agreement), validUgcAgreement()));
    } else {
      await seed(`${root}/stations/stations/b16-station`, { name: 'Synthetic unknown-root station' });
      await assertFails(getDoc(doc(userDb('b16-unknown-super', { admin: true }), `${root}/stations/stations/b16-station`)));
      await assertFails(setDoc(doc(userDb(owner), agreement), validUgcAgreement()));
      await assertFails(setDoc(doc(userDb(owner), `${canonicalEpisode}/comments/b16-unknown`), validComment(owner)));
    }
  });
}
