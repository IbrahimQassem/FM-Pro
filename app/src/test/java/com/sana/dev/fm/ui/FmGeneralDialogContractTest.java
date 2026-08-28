package com.sana.dev.fm.ui;

import org.junit.Test;

import java.io.File;
import java.nio.file.Files;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class FmGeneralDialogContractTest {

    @Test
    public void dialogWarningLayout_adheresToMaterial3Contract() throws Exception {
        File file = new File("src/main/res/layout/dialog_warning.xml");
        assertTrue("dialog_warning.xml must exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Must use MaterialCardView", content.contains("MaterialCardView"));
        assertTrue("Must have iv_image", content.contains("android:id=\"@+id/iv_image\""));
        assertTrue("Must have tv_title", content.contains("android:id=\"@+id/tv_title\""));
        assertTrue("Must have tv_desc", content.contains("android:id=\"@+id/tv_desc\""));
        assertTrue("Must have bt_confirm", content.contains("android:id=\"@+id/bt_confirm\""));
        assertTrue("Must have bt_cancel", content.contains("android:id=\"@+id/bt_cancel\""));
        assertTrue("Must specify min_touch_target_size for buttons", content.contains("@dimen/min_touch_target_size"));
        assertTrue("Must use Material 3 typography token", content.contains("@style/TextAppearance.FMPro.TitleLarge"));
    }

    @Test
    public void dialogHeaderLayout_adheresToMaterial3Contract() throws Exception {
        File file = new File("src/main/res/layout/dialog_header.xml");
        assertTrue("dialog_header.xml must exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Must use MaterialCardView", content.contains("MaterialCardView"));
        assertTrue("Must have iv_image", content.contains("android:id=\"@+id/iv_image\""));
        assertTrue("Must have tv_title", content.contains("android:id=\"@+id/tv_title\""));
        assertTrue("Must have tv_desc", content.contains("android:id=\"@+id/tv_desc\""));
        assertTrue("Must have bt_confirm", content.contains("android:id=\"@+id/bt_confirm\""));
        assertTrue("Must have bt_cancel", content.contains("android:id=\"@+id/bt_cancel\""));
        assertTrue("Must specify min_touch_target_size for buttons", content.contains("@dimen/min_touch_target_size"));
    }

    @Test
    public void forceUpdateStrings_properlyLocalizedInBothLocales() throws Exception {
        File defaultStrings = new File("src/main/res/values/strings.xml");
        File arStrings = new File("src/main/res/values-ar/strings.xml");

        assertTrue("values/strings.xml must exist", defaultStrings.exists());
        assertTrue("values-ar/strings.xml must exist", arStrings.exists());

        String defaultContent = new String(Files.readAllBytes(defaultStrings.toPath()));
        String arContent = new String(Files.readAllBytes(arStrings.toPath()));

        // Ensure keys exist in default strings
        assertTrue("Must define label_force_update_title", defaultContent.contains("name=\"label_force_update_title\""));
        assertTrue("Must define label_force_update_message", defaultContent.contains("name=\"label_force_update_message\""));
        assertTrue("Must define label_update_now", defaultContent.contains("name=\"label_update_now\""));

        // Ensure keys exist in Arabic strings
        assertTrue("Must define label_force_update_title in AR", arContent.contains("name=\"label_force_update_title\""));
        assertTrue("Must define label_force_update_message in AR", arContent.contains("name=\"label_force_update_message\""));
        assertTrue("Must define label_update_now in AR", arContent.contains("name=\"label_update_now\""));

        // Ensure no typo or crude placeholder strings remain
        assertFalse("Must not contain Kindle typo in default strings", defaultContent.contains("Kindle update"));
        assertFalse("Must not contain Kindle typo in Arabic strings", arContent.contains("Kindle update"));
    }
}
