const fs = require('node:fs');
const assert = require('node:assert/strict');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} = require('firebase/firestore');
const {
  getDownloadURL,
  ref,
  uploadBytes,
} = require('firebase/storage');

const projectId = 'demo-no-project';
const base = 'HudHudFmGooglePlay';

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: fs.readFileSync('firebase/firestore.rules', 'utf8'),
    },
    storage: {
      rules: fs.readFileSync('firebase/storage.rules', 'utf8'),
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore rules', () => {
  it('allows public reads for legacy radio content', async () => {
    await seedFirestore(async (firestore) => {
      await setDoc(doc(firestore, `${base}/RadioInfo/RadioInfo/sanaa-fm`), {
        radioId: 'sanaa-fm',
        name: 'Sanaa FM',
      });
    });

    const publicDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(
      getDoc(doc(publicDb, `${base}/RadioInfo/RadioInfo/sanaa-fm`)),
    );
  });

  it('denies public writes to legacy content', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(
      setDoc(doc(publicDb, `${base}/RadioInfo/RadioInfo/sanaa-fm`), {
        radioId: 'sanaa-fm',
        name: 'Sanaa FM',
      }),
    );
  });

  it('allows admin writes to legacy content', async () => {
    await seedAdminUser('admin-user');
    const adminDb = testEnv.authenticatedContext('admin-user').firestore();

    await assertSucceeds(
      setDoc(doc(adminDb, `${base}/RadioInfo/RadioInfo/sanaa-fm`), {
        radioId: 'sanaa-fm',
        name: 'Sanaa FM',
      }),
    );
  });

  it('denies profile role escalation by ordinary users', async () => {
    await seedFirestore(async (firestore) => {
      await setDoc(doc(firestore, `${base}/Users/Users/user-1`), {
        userId: 'user-1',
        name: 'User',
        userType: 'USER',
      });
    });
    const userDb = testEnv.authenticatedContext('user-1').firestore();

    await assertFails(
      updateDoc(doc(userDb, `${base}/Users/Users/user-1`), {
        userType: 'SuperADMIN',
      }),
    );
  });

  it('allows ordinary users to update safe profile fields', async () => {
    await seedFirestore(async (firestore) => {
      await setDoc(doc(firestore, `${base}/Users/Users/user-1`), {
        userId: 'user-1',
        name: 'User',
        userType: 'USER',
      });
    });
    const userDb = testEnv.authenticatedContext('user-1').firestore();

    await assertSucceeds(
      updateDoc(doc(userDb, `${base}/Users/Users/user-1`), {
        name: 'Updated User',
        city: 'Sanaa',
      }),
    );
  });
});

describe('Storage rules', () => {
  it('allows admin image uploads to the legacy folder path', async () => {
    await seedAdminUser('admin-user');
    const storage = testEnv.authenticatedContext('admin-user').storage();
    const imageRef = ref(storage, `${base}_Folder/sanaa-fm/logo.jpg`);

    await assertSucceeds(uploadBytes(imageRef, imageBytes(), {
      contentType: 'image/jpeg',
    }));
  });

  it('denies non-image uploads to the legacy folder path', async () => {
    await seedAdminUser('admin-user');
    const storage = testEnv.authenticatedContext('admin-user').storage();
    const imageRef = ref(storage, `${base}_Folder/sanaa-fm/logo.txt`);

    await assertFails(uploadBytes(imageRef, new Uint8Array([1, 2, 3]), {
      contentType: 'text/plain',
    }));
  });

  it('denies ordinary user uploads to the legacy folder path', async () => {
    await seedFirestore(async (firestore) => {
      await setDoc(doc(firestore, `${base}/Users/Users/user-1`), {
        userId: 'user-1',
        userType: 'USER',
      });
    });
    const storage = testEnv.authenticatedContext('user-1').storage();
    const imageRef = ref(storage, `${base}_Folder/sanaa-fm/logo.jpg`);

    await assertFails(uploadBytes(imageRef, imageBytes(), {
      contentType: 'image/jpeg',
    }));
  });

  it('allows public reads from the legacy folder path', async () => {
    await seedAdminUser('admin-user');
    const adminStorage = testEnv.authenticatedContext('admin-user').storage();
    const path = `${base}_Folder/sanaa-fm/public-logo.jpg`;
    await uploadBytes(ref(adminStorage, path), imageBytes(), {
      contentType: 'image/jpeg',
    });

    const publicStorage = testEnv.unauthenticatedContext().storage();

    await assertSucceeds(getDownloadURL(ref(publicStorage, path)));
  });
});

async function seedAdminUser(userId) {
  await seedFirestore(async (firestore) => {
    await setDoc(doc(firestore, `${base}/Users/Users/${userId}`), {
      userId,
      userType: 'ADMIN',
    });
  });
}

async function seedFirestore(callback) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await callback(context.firestore());
  });
}

function imageBytes() {
  assert.equal(typeof Uint8Array, 'function');
  return new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
}
