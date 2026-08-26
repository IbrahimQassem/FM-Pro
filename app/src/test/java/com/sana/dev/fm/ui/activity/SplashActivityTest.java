package com.sana.dev.fm.ui.activity;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class SplashActivityTest {
    @Test
    public void firstTimeVersionContinuesToRadioLoading() {
        assertEquals(
                SplashActivity.AppStartAction.LOAD_RADIOS,
                SplashActivity.getStartAction(SplashActivity.AppStart.FIRST_TIME_VERSION)
        );
    }

    @Test
    public void firstTimeEverShowsIntro() {
        assertEquals(
                SplashActivity.AppStartAction.SHOW_INTRO,
                SplashActivity.getStartAction(SplashActivity.AppStart.FIRST_TIME)
        );
    }

    @Test
    public void normalStartContinuesToRadioLoading() {
        assertEquals(
                SplashActivity.AppStartAction.LOAD_RADIOS,
                SplashActivity.getStartAction(SplashActivity.AppStart.NORMAL)
        );
    }
}
