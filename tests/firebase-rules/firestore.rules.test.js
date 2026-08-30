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
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const PROJECT_ID = "demo-hudhud-fm-rules-test";
const userPath = (uid) => `HudHudDev/users/users/${uid}`;
const episodePath = (id = "episode-1") =>
  `HudHudDev/episodes/episodes/${id}`;
const commentPath = (id = "comment-1") =>
  `${episodePath()}/comments/${id}`;

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
    await assertSucceeds(
      setDoc(doc(db, userPath("user-a")), listenerProfile()),
    );
    await assertSucceeds(getDoc(doc(db, userPath("user-a"))));
    await assertFails(getDoc(doc(db, userPath("user-b"))));
  });

  test("role escalation, private extra fields and client updates are denied", async () => {
    const profile = doc(userDb("user-a"), userPath("user-a"));
    await assertFails(
      setDoc(profile, listenerProfile({ role: "admin" })),
    );
    await assertFails(
      setDoc(profile, listenerProfile({ notificationToken: "secret" })),
    );
    await seed(userPath("user-a"), {
      ...listenerProfile(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await assertFails(updateDoc(profile, { role: "admin" }));
  });

  test("only an administrator can list profiles", async () => {
    await seed(userPath("user-a"), { displayName: "Listener" });
    await assertFails(
      getDocs(collection(userDb("user-a"), "HudHudDev/users/users")),
    );
    await assertSucceeds(
      getDocs(
        collection(
          userDb("admin-a", { admin: true }),
          "HudHudDev/users/users",
        ),
      ),
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
    await assertSucceeds(
      setDoc(doc(userDb("user-a"), commentPath()), validComment("user-a")),
    );
    await assertSucceeds(getDoc(doc(anonymousDb(), commentPath())));
  });

  test("anonymous and forged comments are denied", async () => {
    await assertFails(
      setDoc(doc(anonymousDb(), commentPath()), validComment("user-a")),
    );
    await assertFails(
      setDoc(
        doc(userDb("user-a"), commentPath()),
        validComment("user-a", { authorName: "Administrator" }),
      ),
    );
    await assertFails(
      setDoc(
        doc(userDb("user-a"), commentPath()),
        validComment("user-b"),
      ),
    );
  });

  test("invalid bodies and listener edits are denied", async () => {
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
    });
    await assertFails(
      updateDoc(doc(userDb("user-a"), commentPath()), {
        content: "Edited",
      }),
    );
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
