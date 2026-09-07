export type DeletionSteps = {
  revokeProvider: () => Promise<void>;
  deleteData: () => Promise<unknown>;
  signOut: () => Promise<void>;
};

export async function completeAccountDeletion(
  steps: DeletionSteps,
): Promise<void> {
  await steps.revokeProvider();
  await steps.deleteData();
  // Auth/data deletion has succeeded. A local sign-out failure cannot undo it
  // and must not incorrectly tell the user deletion failed.
  await steps.signOut().catch(() => undefined);
}
