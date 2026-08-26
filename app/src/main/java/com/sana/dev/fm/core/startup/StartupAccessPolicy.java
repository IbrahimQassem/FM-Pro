package com.sana.dev.fm.core.startup;

public final class StartupAccessPolicy {
    private StartupAccessPolicy() {
    }

    public enum Action {
        CONTINUE_AUTHENTICATED,
        CONTINUE_LISTENER,
        FORCE_UPDATE
    }

    public static Action decide(int currentVersion, int requiredVersion,
                                boolean firebaseUserAvailable) {
        if (currentVersion < requiredVersion) {
            return Action.FORCE_UPDATE;
        }
        return firebaseUserAvailable
                ? Action.CONTINUE_AUTHENTICATED
                : Action.CONTINUE_LISTENER;
    }
}
