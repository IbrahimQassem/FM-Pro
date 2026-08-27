package com.sana.dev.fm.ui;

import com.sana.dev.fm.ui.activity.SplashActivity;
import com.sana.dev.fm.ui.widget.StateLayout;

import org.junit.Test;

import java.io.File;
import java.nio.file.Files;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class OnboardingAndUiStatesContractTest {

    @Test
    public void splashStartAction_neverRepeatsIntroOnVersionUpgrade() {
        // First install: show intro
        assertEquals(
                SplashActivity.AppStartAction.SHOW_INTRO,
                SplashActivity.getStartAction(SplashActivity.AppStart.FIRST_TIME)
        );

        // App update (new version code): skip intro directly to load radios
        assertEquals(
                SplashActivity.AppStartAction.LOAD_RADIOS,
                SplashActivity.getStartAction(SplashActivity.AppStart.FIRST_TIME_VERSION)
        );

        // Normal launch: skip intro directly to load radios
        assertEquals(
                SplashActivity.AppStartAction.LOAD_RADIOS,
                SplashActivity.getStartAction(SplashActivity.AppStart.NORMAL)
        );
    }

    @Test
    public void introLayout_containsAccessibleSkipButton() throws Exception {
        File file = new File("src/main/res/layout/activity_app_intro.xml");
        assertTrue("activity_app_intro.xml must exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Intro layout must contain btn_skip", content.contains("android:id=\"@+id/btn_skip\""));
        assertTrue("Skip button must have min_touch_target_size height",
                content.contains("android:layout_height=\"@dimen/min_touch_target_size\""));
        assertTrue("Skip button must have min_touch_target_size minWidth",
                content.contains("android:minWidth=\"@dimen/min_touch_target_size\""));
    }

    @Test
    public void stateLayout_coversAllFiveExplicitStates() {
        assertNotNull(StateLayout.State.valueOf("LOADING"));
        assertNotNull(StateLayout.State.valueOf("CONTENT"));
        assertNotNull(StateLayout.State.valueOf("EMPTY"));
        assertNotNull(StateLayout.State.valueOf("ERROR"));
        assertNotNull(StateLayout.State.valueOf("OFFLINE"));
        assertEquals(5, StateLayout.State.values().length);
    }
}
