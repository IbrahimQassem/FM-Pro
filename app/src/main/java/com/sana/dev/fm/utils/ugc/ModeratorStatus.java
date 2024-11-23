package com.sana.dev.fm.utils.ugc;

import java.util.HashSet;
import java.util.Set;

public class ModeratorStatus {
    private final boolean isModerator;
    private final long timestamp;
    private final Set<String> permissions;

    public ModeratorStatus(boolean isModerator, Set<String> permissions) {
        this.isModerator = isModerator;
        this.timestamp = System.currentTimeMillis();
        this.permissions = permissions != null ? permissions : new HashSet<>();
    }

//    public boolean isValid() {
//        return System.currentTimeMillis() - timestamp < MODERATOR_CACHE_DURATION;
//    }

    public boolean hasPermission(String permission) {
        return permissions.contains(permission);
    }
}