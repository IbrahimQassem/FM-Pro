import { after, before, beforeEach, describe, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteObject,
  getMetadata,
  ref,
  uploadBytes,
} from "firebase/storage";

const PROJECT_ID = "demo-fm-pro-rules-test";
const FOLDER = "HudHudFmGooglePlay_Folder";

let testEnv;

function storageFor(uid, claims = {}) {
  return testEnv.authenticatedContext(uid, claims).storage();
}

function imageBytes(size = 16) {
  return new Uint8Array(size);
}

async function seed(path) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await uploadBytes(ref(context.storage(), path), imageBytes(), {
      contentType: "image/jpeg",
    });
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      rules: readFileSync("storage.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearStorage();
});

after(async () => {
  await testEnv.cleanup();
});

describe("public image reads", () => {
  test("known flavor images are readable without authentication", async () => {
    const path = `${FOLDER}/user-a/avatar.jpg`;
    await seed(path);

    await assertSucceeds(
      getMetadata(ref(testEnv.unauthenticatedContext().storage(), path)),
    );
  });

  test("unknown folders are denied", async () => {
    const path = "UnknownFolder/user-a/avatar.jpg";
    await seed(path);

    await assertFails(
      getMetadata(ref(testEnv.unauthenticatedContext().storage(), path)),
    );
  });
});

describe("owned and administrative writes", () => {
  test("a user can upload and delete an image only below their UID", async () => {
    const ownImage = ref(storageFor("user-a"), `${FOLDER}/user-a/avatar.jpg`);
    const otherImage = ref(storageFor("user-a"), `${FOLDER}/user-b/avatar.jpg`);

    await assertSucceeds(
      uploadBytes(ownImage, imageBytes(), { contentType: "image/jpeg" }),
    );
    await assertFails(
      uploadBytes(otherImage, imageBytes(), { contentType: "image/jpeg" }),
    );
    await assertSucceeds(deleteObject(ownImage));
  });

  test("non-images and files at or above five MiB are denied", async () => {
    const storage = storageFor("user-a");

    await assertFails(
      uploadBytes(
        ref(storage, `${FOLDER}/user-a/profile.txt`),
        imageBytes(),
        { contentType: "text/plain" },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(storage, `${FOLDER}/user-a/large.jpg`),
        imageBytes(5 * 1024 * 1024),
        { contentType: "image/jpeg" },
      ),
    );
  });

  test("an admin claim can upload a program image outside its UID path", async () => {
    const programImage = ref(
      storageFor("admin-a", { admin: true }),
      `${FOLDER}/radio-1/program-1.jpg`,
    );

    await assertSucceeds(
      uploadBytes(programImage, imageBytes(), { contentType: "image/jpeg" }),
    );
  });

  test("anonymous uploads are denied", async () => {
    const image = ref(
      testEnv.unauthenticatedContext().storage(),
      `${FOLDER}/user-a/avatar.jpg`,
    );

    await assertFails(
      uploadBytes(image, imageBytes(), { contentType: "image/jpeg" }),
    );
  });
});
