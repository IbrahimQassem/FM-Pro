package com.sana.dev.fm.utils;

import static com.sana.dev.fm.BuildConfig.BASE_FB_DB;

/**
 * Global application constants, configuration limits, preferences keys,
 * and canonical Firebase/Storage paths for FM-Pro.
 */
public final class AppConstant {

    private AppConstant() {
        // Prevent instantiation
    }

    public static final String TAG = "FMPro";
    public static final String LOG = TAG;

    // =========================================================================
    // UI & USER PROFILE CONFIGURATION
    // =========================================================================
    public static final class Profile {
        public static final int MAX_AVATAR_SIZE_PX = 1280; // px, max bounding square
        public static final int MIN_AVATAR_SIZE_PX = 100;  // px, min bounding square
        public static final int MAX_DISPLAY_NAME_LENGTH = 120; // characters

        // Aliases for compatibility
        public static final int MAX_AVATAR_SIZE = MAX_AVATAR_SIZE_PX;
        public static final int MIN_AVATAR_SIZE = MIN_AVATAR_SIZE_PX;
        public static final int MAX_NAME_LENGTH = MAX_DISPLAY_NAME_LENGTH;
    }

    // =========================================================================
    // CONTENT & PAGINATION LIMITS
    // =========================================================================
    public static final class ContentLimits {
        public static final int MAX_TEXT_LENGTH_IN_LIST = 300; // characters
        public static final int MAX_POST_TITLE_LENGTH = 255;   // characters
        public static final int POST_AMOUNT_ON_PAGE = 10;       // pagination limit
        public static final int MAX_COMMENT_LENGTH = 1000;     // characters
    }

    public static final class Post {
        public static final int MAX_TEXT_LENGTH_IN_LIST = ContentLimits.MAX_TEXT_LENGTH_IN_LIST;
        public static final int MAX_POST_TITLE_LENGTH = ContentLimits.MAX_POST_TITLE_LENGTH;
        public static final int POST_AMOUNT_ON_PAGE = ContentLimits.POST_AMOUNT_ON_PAGE;
    }

    // =========================================================================
    // NETWORK & DATABASE TIMEOUTS
    // =========================================================================
    public static final class Database {
        public static final int MAX_UPLOAD_RETRY_MILLIS = 60000; // 1 minute
        public static final int CONNECT_TIMEOUT_MILLIS = 15000;   // 15 seconds
    }

    // =========================================================================
    // PUSH NOTIFICATIONS & CHANNELS
    // =========================================================================
    public static final class PushNotification {
        public static final String DEFAULT_CHANNEL_ID = "my_channel_01";
        public static final String PLAYBACK_CHANNEL_ID = "fm_pro_playback_channel";
        public static final int LARGE_ICON_SIZE_PX = 256; // px

        // Aliases for compatibility
        public static final int LARGE_ICONE_SIZE = LARGE_ICON_SIZE_PX;
    }

    // =========================================================================
    // PREFERENCES & INTENT KEYS
    // =========================================================================
    public static final class Preferences {
        public static final String KEY_USER_INFO = "userInfo";
        public static final String KEY_RADIO_INFO_LIST = "radioInfoList";
        public static final String KEY_SELECTED_RADIO = "stations";
        public static final String KEY_PREF_LANGUAGE = "prefLanguage";
        public static final String KEY_PREF_THEME_MODE = "prefThemeMode";
        public static final String KEY_APP_REMOTE_CONFIG = "appRemoteConfig";
        public static final String EXTRA_MOBILE_NUMBER = "userMobile";
    }

    // =========================================================================
    // GENERAL APP CONSTANTS & ALIASES
    // =========================================================================
    public static final class General {
        public static final long DOUBLE_CLICK_TO_EXIT_INTERVAL = 3000L; // in milliseconds

        public static final String FB_FM_FOLDER_PATH = BASE_FB_DB + "_Folder";

        public static final String CHANNEL_ID = PushNotification.DEFAULT_CHANNEL_ID;
        public static final String USER_INFO = Preferences.KEY_USER_INFO;
        public static final String RADIO_INFO_LIST = Preferences.KEY_RADIO_INFO_LIST;
        public static final String PREF_LANGUAGE = Preferences.KEY_PREF_LANGUAGE;
        public static final String PREF_THEME_MODE = Preferences.KEY_PREF_THEME_MODE;
        public static final String CONST_MOBILE = Preferences.EXTRA_MOBILE_NUMBER;
        public static final String APP_REMOTE_CONFIG = Preferences.KEY_APP_REMOTE_CONFIG;
    }

    // =========================================================================
    // CANONICAL FIRESTORE SCHEMAS & COLLECTIONS
    // =========================================================================
    public static final class Firebase {
        // Canonical top-level collections
        public static final String STATIONS_COLLECTION = "stations";
        public static final String PROGRAMS_COLLECTION = "programs";
        public static final String EPISODES_COLLECTION = "episodes";
        public static final String USERS_COLLECTION = "users";
        public static final String BANNERS_COLLECTION = "banners";

        // Canonical subcollections
        public static final String LIKES_SUBCOLLECTION = "likes";
        public static final String COMMENTS_SUBCOLLECTION = "comments";
        public static final String FAVORITES_SUBCOLLECTION = "favorites";
        public static final String SUBSCRIPTIONS_SUBCOLLECTION = "subscriptions";

        // =========================================================================
        // DEPRECATED LEGACY CONSTANTS - SCHEDULED FOR DELETION
        // DO NOT USE IN NEW CODE. USE CANONICAL COLLECTIONS ABOVE INSTEAD.
        // =========================================================================
        @Deprecated
        public static final String RADIO_INFO_TABLE = "RadioInfo";
        @Deprecated
        public static final String RADIO_PROGRAM_TABLE = "RadioProgram";
        @Deprecated
        public static final String EPISODE_TABLE = "Episode";
        @Deprecated
        public static final String USERS_TABLE = "Users";
        @Deprecated
        public static final String COMMENT_TABLE = "Comment";
        @Deprecated
        public static final String ADVERTISEMENT_TABLE = "Advertisement";
    }

    // =========================================================================
    // CANONICAL CLOUD STORAGE DIRECTORIES
    // =========================================================================
    public static final class StoragePaths {
        public static final String USERS_DIR = "users";
        public static final String STATIONS_DIR = "stations";
        public static final String PROGRAMS_DIR = "programs";
        public static final String EPISODES_DIR = "episodes";
        public static final String BANNERS_DIR = "banners";
    }
}
