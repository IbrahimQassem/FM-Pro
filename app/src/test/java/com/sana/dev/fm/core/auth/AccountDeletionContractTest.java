package com.sana.dev.fm.core.auth;

import org.junit.Test;

import java.io.File;
import java.nio.file.Files;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class AccountDeletionContractTest {

    @Test
    public void strings_containCompleteAccountDeletionContractResources() throws Exception {
        File file = new File("src/main/res/values/strings.xml");
        assertTrue("strings.xml must exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Must contain label_delete_account",
                content.contains("name=\"label_delete_account\""));
        assertTrue("Must contain delete_account_confirm_title",
                content.contains("name=\"delete_account_confirm_title\""));
        assertTrue("Must contain delete_account_confirm_message",
                content.contains("name=\"delete_account_confirm_message\""));
        assertTrue("Must contain delete_account_confirm_button",
                content.contains("name=\"delete_account_confirm_button\""));
        assertTrue("Must contain delete_account_success",
                content.contains("name=\"delete_account_success\""));
        assertTrue("Must contain delete_account_reauth_required",
                content.contains("name=\"delete_account_reauth_required\""));
    }

    @Test
    public void accountLayout_containsDeleteAccountRowWithAccessibleTouchTarget() throws Exception {
        File file = new File("src/main/res/layout/fragment_account.xml");
        assertTrue("fragment_account.xml must exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Must declare row_delete_account",
                content.contains("android:id=\"@+id/row_delete_account\""));
        assertTrue("row_delete_account must enforce minimum touch target size",
                content.contains("android:minHeight=\"@dimen/min_touch_target_size\""));
        assertTrue("Delete account text must use md_theme_error color",
                content.contains("android:textColor=\"@color/md_theme_error\""));
    }

    @Test
    public void deletionResult_enumCoversAllScenarios() {
        assertNotNull(AccountDeletionCoordinator.DeletionResult.valueOf("SUCCESS"));
        assertNotNull(AccountDeletionCoordinator.DeletionResult.valueOf("REAUTH_REQUIRED"));
        assertNotNull(AccountDeletionCoordinator.DeletionResult.valueOf("NOT_SIGNED_IN"));
        assertNotNull(AccountDeletionCoordinator.DeletionResult.valueOf("ERROR"));
        assertEquals(4, AccountDeletionCoordinator.DeletionResult.values().length);
    }
}
