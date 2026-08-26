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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

const PROJECT_ID = "demo-fm-pro-rules-test";
const ROOT = "HudHudFmGooglePlay";

const stationPath = (radioId = "radio-1", root = ROOT) =>
  `${root}/RadioInfo/RadioInfo/${radioId}`;
const programPath = (radioId = "radio-1", programId = "program-1") =>
  `${ROOT}/RadioProgram/${radioId}/RadioProgram/RadioProgram/${programId}`;
const episodePath = (radioId = "radio-1", episodeId = "episode-1") =>
  `${ROOT}/Episode/${radioId}/Episode/Episode/${episodeId}`;
const commentPath = (
  commentId = "comment-1",
  radioId = "radio-1",
  episodeId = "episode-1",
) => `${episodePath(radioId, episodeId)}/Comment/${commentId}`;
const userPath = (uid, root = ROOT) => `${root}/Users/Users/${uid}`;

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

function validUser(uid, overrides = {}) {
  return {
    userId: uid,
    name: "Listener",
    email: null,
    mobile: null,
    photoUrl: null,
    nickNme: null,
    bio: null,
    tag: null,
    deviceId: null,
    stopNote: null,
    country: null,
    city: null,
    deviceToken: null,
    notificationToken: null,
    otherData: null,
    verified: false,
    online: false,
    disabled: false,
    lastSignInTimestamp: 1787688000000,
    gender: "UNKNOWN",
    userType: "USER",
    authMethod: "GOOGLE",
    createdAt: "2026-08-26 20:00:00",
    allowedPermissions: [],
    ...overrides,
  };
}

function validComment(uid, commentId = "comment-1", overrides = {}) {
  return {
    commentId,
    episodeId: "episode-1",
    commentUser: "Listener",
    commentText: "A useful comment",
    commentUserId: uid,
    commentTime: "1787688000000",
    commentLikesCount: 0,
    commentLikes: null,
    ...overrides,
  };
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

describe("public listener content", () => {
  test("anonymous listeners can read stations from a known flavor root", async () => {
    await seed(stationPath(), { radioId: "radio-1", name: "HudHud FM" });

    const station = doc(anonymousDb(), stationPath());
    const snapshot = await new Promise((resolve, reject) => {
      const unsubscribe = onSnapshot(
        station,
        (value) => {
          unsubscribe();
          resolve(value);
        },
        reject,
      );
    });

    assert.equal(snapshot.exists(), true);
  });

  test("unknown flavor roots stay denied", async () => {
    await seed(stationPath("radio-1", "UntrustedRoot"), {
      radioId: "radio-1",
    });

    await assertFails(
      getDoc(doc(anonymousDb(), stationPath("radio-1", "UntrustedRoot"))),
    );
  });
});

describe("user ownership and admin claims", () => {
  test("a user can create and read only their safe profile", async () => {
    const db = userDb("user-a");
    const ownProfile = doc(db, userPath("user-a"));

    await assertSucceeds(setDoc(ownProfile, validUser("user-a")));
    await assertSucceeds(getDoc(ownProfile));
    await assertFails(getDoc(doc(db, userPath("user-b"))));
  });

  test("a user cannot self-assign an admin role or permissions", async () => {
    const db = userDb("user-a");

    await assertFails(
      setDoc(
        doc(db, userPath("user-a")),
        validUser("user-a", {
          userType: "SuperADMIN",
          allowedPermissions: ["ALL"],
        }),
      ),
    );
    await assertFails(
      setDoc(
        doc(db, userPath("user-a")),
        validUser("user-a", { password: "must-not-be-written" }),
      ),
    );
  });

  test("a user can update profile fields but not protected role fields", async () => {
    await seed(userPath("user-a"), validUser("user-a"));
    const profile = doc(userDb("user-a"), userPath("user-a"));

    await assertSucceeds(
      updateDoc(profile, {
        name: "Updated listener",
        notificationToken: "current-fcm-token",
        updatedAt: Timestamp.now(),
      }),
    );
    await assertFails(updateDoc(profile, { userType: "ADMIN" }));
    await assertFails(updateDoc(profile, { deviceId: "tracking-id" }));
  });

  test("regular users cannot list profiles containing private fields", async () => {
    await seed(userPath("user-a"), validUser("user-a", { mobile: "private" }));
    await assertFails(
      getDocs(collection(userDb("user-a"), `${ROOT}/Users/Users`)),
    );
  });

  test("the admin custom claim permits content writes and user listing", async () => {
    await seed(userPath("user-a"), validUser("user-a"));
    const db = userDb("admin-a", { admin: true });

    await assertSucceeds(
      setDoc(doc(db, programPath()), {
        programId: "program-1",
        radioId: "radio-1",
      }),
    );
    await assertSucceeds(getDocs(collection(db, `${ROOT}/Users/Users`)));
  });

  test("a local userType field never grants content write access", async () => {
    await seed(
      userPath("user-a"),
      validUser("user-a", { userType: "SuperADMIN" }),
    );

    await assertFails(
      setDoc(doc(userDb("user-a"), programPath()), {
        programId: "program-1",
        radioId: "radio-1",
      }),
    );
  });
});

describe("comments", () => {
  test("a signed-in author can create a valid comment with matching IDs", async () => {
    await assertSucceeds(
      setDoc(
        doc(userDb("user-a"), commentPath()),
        validComment("user-a"),
      ),
    );
    await assertSucceeds(getDoc(doc(anonymousDb(), commentPath())));
  });

  test("anonymous, forged-owner, mismatched-ID and invalid comments are denied", async () => {
    await assertFails(
      setDoc(doc(anonymousDb(), commentPath()), validComment("user-a")),
    );
    await assertFails(
      setDoc(
        doc(userDb("user-a"), commentPath()),
        validComment("user-b"),
      ),
    );
    await assertFails(
      setDoc(
        doc(userDb("user-a"), commentPath()),
        validComment("user-a", "different-id"),
      ),
    );
    await assertFails(
      setDoc(
        doc(userDb("user-a"), commentPath()),
        validComment("user-a", "comment-1", { commentText: "x".repeat(1001) }),
      ),
    );
  });

  test("only the owner or an admin can edit and delete a comment", async () => {
    await seed(commentPath(), validComment("user-a"));

    await assertSucceeds(
      updateDoc(doc(userDb("user-a"), commentPath()), {
        commentText: "Edited by owner",
      }),
    );
    await assertFails(
      deleteDoc(doc(userDb("user-b"), commentPath())),
    );
    await assertSucceeds(
      deleteDoc(doc(userDb("admin-a", { admin: true }), commentPath())),
    );
  });
});

describe("episode reactions", () => {
  test("a user can only change their own like entry and matching count", async () => {
    await seed(episodePath(), {
      epId: "episode-1",
      episodeLikes: {},
      likesCount: 0,
    });
    const episode = doc(userDb("user-a"), episodePath());

    await assertSucceeds(
      updateDoc(episode, {
        episodeLikes: { "user-a": true },
        likesCount: 1,
      }),
    );
    await assertFails(
      updateDoc(episode, {
        episodeLikes: { "user-a": true, "user-b": true },
        likesCount: 2,
      }),
    );
    await assertFails(updateDoc(episode, { likesCount: 99 }));
  });
});

describe("favorites", () => {
  test("favorites are private to their owner and administrators", async () => {
    const favoritePath = `${userPath("user-a")}/favorites/ad-1`;

    await assertSucceeds(
      setDoc(doc(userDb("user-a"), favoritePath), { id: "ad-1" }),
    );
    await assertFails(getDoc(doc(userDb("user-b"), favoritePath)));
    await assertSucceeds(
      getDoc(doc(userDb("admin-a", { admin: true }), favoritePath)),
    );
  });
});
