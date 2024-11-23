package com.sana.dev.fm.utils.ugc;

import java.util.Set;

public interface ModeratorCheckCallback {
    void onResult(boolean isModerator, Set<String> permissions);
    void onError(Exception e);
}