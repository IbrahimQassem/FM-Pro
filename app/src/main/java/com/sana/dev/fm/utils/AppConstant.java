package com.sana.dev.fm.utils;

/**
 * Created by alexey on 08.12.16.
 */

public class AppConstant {

    public static final String LOG = "MyLog";

    public static class Profile {
        public static final int MAX_AVATAR_SIZE = 1280; //px, side of square
        public static final int MIN_AVATAR_SIZE = 100; //px, side of square
        public static final int MAX_NAME_LENGTH = 120;
    }

    public static class Post {
        public static final int MAX_TEXT_LENGTH_IN_LIST = 300; //characters
        public static final int MAX_POST_TITLE_LENGTH = 255; //characters
        public static final int POST_AMOUNT_ON_PAGE = 10;
    }

    public static class Database {
        public static final int MAX_UPLOAD_RETRY_MILLIS = 60000; //1 minute
    }

    public static class PushNotification {
        public static final int LARGE_ICONE_SIZE = 256; //px
    }


    public static class General {
        public static final long DOUBLE_CLICK_TO_EXIT_INTERVAL = 3000; // in milliseconds

        public static String FB_FM_FOLDER_PATH = "FM_Folder";
//    public static String CREATED_DATE_TIME = "createdDateTime";

        public static final String CHANNEL_ID = "my_channel_01";
        //    public static final String CHANNEL_NAME = "Simplified  Notification";
//    public static final String CHANNEL_DESCRIPTION = "www.sanaadev.net";
        public static final String DEVICE_TOKEN = "deviceToken";
        public static final String USER_INFO = "userInfo";
        public static final String RADIO_INFO_LIST = "radioInfoList";
        //    public static final String USER_IMAGE_Profile = "userImageProfile";
        public static final String PREF_LANGUAGE = "prefLanguage";
        public static final String CONST_MOBILE = "userMobile";
        public static final String APP_REMOTE_CONFIG = "appRemoteConfig";    }

    public class Firebase {
        public static final String RADIO_INFO_TABLE = "RadioInfo";
        public static final String RADIO_PROGRAM_TABLE = "RadioProgram";
        public static final String EPISODE_TABLE = "Episode";
        public static final String USERS_TABLE = "Users";
        public static final String COMMENT_TABLE = "Comment";
        //    public static String LIKED_USERS = "Liked_Users";
//    public static String FAVORITE_USERS = "Favorite_Users";



    }
}
