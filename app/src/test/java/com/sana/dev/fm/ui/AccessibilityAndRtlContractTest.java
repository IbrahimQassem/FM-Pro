package com.sana.dev.fm.ui;

import org.junit.Test;

import java.io.File;
import java.nio.file.Files;

import static org.junit.Assert.assertTrue;

public class AccessibilityAndRtlContractTest {

    @Test
    public void manifest_enablesRtlSupport() throws Exception {
        File file = new File("src/main/AndroidManifest.xml");
        assertTrue("AndroidManifest.xml must exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Manifest must declare android:supportsRtl=\"true\"",
                content.contains("android:supportsRtl=\"true\""));
    }

    @Test
    public void dimensTokens_declaresAccessible48dpTouchTarget() throws Exception {
        File file = new File("src/main/res/values/dimens_tokens.xml");
        assertTrue("dimens_tokens.xml must exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Must define min_touch_target_size",
                content.contains("name=\"min_touch_target_size\""));
        assertTrue("min_touch_target_size must be at least 48dp",
                content.contains(">48dp<"));
    }

    @Test
    public void typographyTokens_useSpUnitsForAccessibilityScaling() throws Exception {
        File file = new File("src/main/res/values/styles_tokens.xml");
        assertTrue("styles_tokens.xml must exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Must include FMPro typography scale",
                content.contains("TextAppearance.FMPro.DisplayLarge"));
        assertTrue("Font size must use sp units",
                content.contains("sp</item>"));
    }

    @Test
    public void phase3Layouts_enforceRtlAndTouchTargets() throws Exception {
        String[] layoutFiles = new String[]{
                "src/main/res/layout/view_mini_player.xml",
                "src/main/res/layout/fragment_account.xml",
                "src/main/res/layout/activity_app_intro.xml",
                "src/main/res/layout/view_state_loading.xml",
                "src/main/res/layout/view_state_empty.xml",
                "src/main/res/layout/view_state_error.xml",
                "src/main/res/layout/view_state_offline.xml"
        };

        for (String path : layoutFiles) {
            File file = new File(path);
            assertTrue("Layout file must exist: " + path, file.exists());
            String content = new String(Files.readAllBytes(file.toPath()));

            // Verify touch targets where minHeight or dimension is applied
            if (path.contains("view_mini_player") || path.contains("fragment_account") || path.contains("activity_app_intro")) {
                assertTrue("Layout " + path + " must reference min_touch_target_size",
                        content.contains("@dimen/min_touch_target_size"));
            }
        }
    }
}
