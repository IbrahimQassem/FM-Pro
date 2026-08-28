package com.sana.dev.fm.core.navigation;

import android.net.Uri;
import androidx.annotation.IdRes;
import com.sana.dev.fm.model.Episode;

/**
 * Unified Navigation interface for FM-Pro.
 * Decouples presentation components from Activity/Fragment transaction internals.
 */
public interface AppNavigator {

    void openHome();

    void openSchedule();

    void openPrograms();

    void openAccount();

    void openProgramDetails(Episode episode);

    void openProgramDetails(String radioId, String programId, String title);

    void openEpisodeDetails(Episode episode);

    void openPlayerSheet(Episode episode);

    boolean handleDeepLink(Uri uri);

    boolean navigateBack();

    void selectTab(@IdRes int tabId);
}
