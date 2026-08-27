package com.sana.dev.fm.ui;

import androidx.fragment.app.Fragment;

import com.sana.dev.fm.ui.fragment.AccountFragment;
import com.sana.dev.fm.ui.fragment.DailyEpisodeFragment;
import com.sana.dev.fm.ui.fragment.MainHomeFragment;
import com.sana.dev.fm.ui.fragment.ProgramsFragment;

import org.junit.Test;

import java.io.File;
import java.nio.file.Files;

import static org.junit.Assert.assertTrue;

public class NavigationShellContractTest {

    @Test
    public void menuBottomXml_definesFourRequiredDestinations() throws Exception {
        File file = new File("src/main/res/menu/menu_bottom.xml");
        assertTrue("menu_bottom.xml must exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Must define Home destination", content.contains("android:id=\"@+id/navigation_home\""));
        assertTrue("Must define Schedule/Daily episodes destination", content.contains("android:id=\"@+id/nav_daily_epi\""));
        assertTrue("Must define Programs destination", content.contains("android:id=\"@+id/nav_radio_map\""));
        assertTrue("Must define Account destination", content.contains("android:id=\"@+id/nav_more\""));
    }

    @Test
    public void fourDestinations_allImplementFragment() {
        assertTrue(Fragment.class.isAssignableFrom(MainHomeFragment.class));
        assertTrue(Fragment.class.isAssignableFrom(DailyEpisodeFragment.class));
        assertTrue(Fragment.class.isAssignableFrom(ProgramsFragment.class));
        assertTrue(Fragment.class.isAssignableFrom(AccountFragment.class));
    }
}
