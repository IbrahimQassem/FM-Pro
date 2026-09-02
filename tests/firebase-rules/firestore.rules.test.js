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
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
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

let testEnv;

function anonymousDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function userDb(uid, claims = {}) {
  return testEnv.authenticatedContext(uid, claims).firestore();
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
  test("a listener can create and read only their canonical profile", async () => {
    const db = userDb("user-a");
    await assertSucceeds(setDoc(doc(db, userPath("user-a")), listenerProfile()));
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
});

describe("episode comments", () => {
  beforeEach(async () => {
    await seed(userPath("user-a"), {
      displayName: "Listener",
      username: "",
      avatarUrl: "",
      isActive: true,
      role: "listener",
    });
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
    await assertSucceeds(
      updateDoc(doc(userDb("admin-a", { admin: true }), commentPath()), { status: "hidden" }),
    );
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
    await assertSucceeds(batch.commit());
    assert.equal((await getDoc(doc(admin, commentReportPath("user-a")))).data().status, "resolved");
    assert.equal((await getDoc(doc(admin, commentPath()))).data().status, "removed");
    await assertFails(getDoc(doc(anonymousDb(), commentPath())));
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
    await assertSucceeds(batch.commit());
    assert.equal((await getDoc(doc(admin, userPath("user-b")))).data().isActive, false);
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
