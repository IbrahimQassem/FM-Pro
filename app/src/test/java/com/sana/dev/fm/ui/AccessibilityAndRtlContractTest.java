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
    public void stringsXml_definesLocalizationAndThemeKeysInBothLocales() throws Exception {
        File defaultStrings = new File("src/main/res/values/strings.xml");
        File arStrings = new File("src/main/res/values-ar/strings.xml");

        assertTrue("values/strings.xml must exist", defaultStrings.exists());
        assertTrue("values-ar/strings.xml must exist", arStrings.exists());

        String defaultContent = new String(Files.readAllBytes(defaultStrings.toPath()));
        String arContent = new String(Files.readAllBytes(arStrings.toPath()));

        assertTrue("Default strings must define pref_language", defaultContent.contains("name=\"pref_language\""));
        assertTrue("Default strings must define pref_theme", defaultContent.contains("name=\"pref_theme\""));

        assertTrue("Arabic strings must define pref_language", arContent.contains("name=\"pref_language\""));
        assertTrue("Arabic strings must define pref_theme", arContent.contains("name=\"pref_theme\""));
    }
}
