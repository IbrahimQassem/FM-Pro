package com.sana.dev.fm.ui;

import org.junit.Test;

import java.io.File;
import java.nio.file.Files;

import static org.junit.Assert.assertTrue;

public class DesignTokensContractTest {

    @Test
    public void colorsTokensXml_definesSemanticMaterial3Colors() throws Exception {
        File file = new File("src/main/res/values/colors_tokens.xml");
        assertTrue("colors_tokens.xml should exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Must define md_theme_primary", content.contains("name=\"md_theme_primary\""));
        assertTrue("Must define md_theme_onPrimary", content.contains("name=\"md_theme_onPrimary\""));
        assertTrue("Must define md_theme_surface", content.contains("name=\"md_theme_surface\""));
        assertTrue("Must define md_theme_onSurface", content.contains("name=\"md_theme_onSurface\""));
        assertTrue("Must define md_theme_error", content.contains("name=\"md_theme_error\""));
        assertTrue("Must define md_theme_success", content.contains("name=\"md_theme_success\""));
    }

    @Test
    public void dimensTokensXml_definesSpacingGridAndTouchTarget() throws Exception {
        File file = new File("src/main/res/values/dimens_tokens.xml");
        assertTrue("dimens_tokens.xml should exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Must define 48dp minimum touch target", content.contains("name=\"min_touch_target_size\">48dp<"));
        assertTrue("Must define 4dp spacing", content.contains("name=\"spacing_xs\">4dp<"));
        assertTrue("Must define 8dp spacing", content.contains("name=\"spacing_sm\">8dp<"));
        assertTrue("Must define 16dp spacing", content.contains("name=\"spacing_md\">16dp<"));
    }

    @Test
    public void sharedStateLayouts_allExist() {
        assertTrue("view_state_loading.xml must exist", new File("src/main/res/layout/view_state_loading.xml").exists());
        assertTrue("view_state_empty.xml must exist", new File("src/main/res/layout/view_state_empty.xml").exists());
        assertTrue("view_state_error.xml must exist", new File("src/main/res/layout/view_state_error.xml").exists());
        assertTrue("view_state_offline.xml must exist", new File("src/main/res/layout/view_state_offline.xml").exists());
    }
}
