package com.sana.dev.fm.utils;

import android.util.Log;

public class LogUtility {
    public static final String TAG = "main_log";

    //To print log's and exceptions
    public static final boolean LOG = true;

    public static void i(String tag, String string) {
        if (LOG) Log.i(tag, string);
    }

    public static void e(String tag, String string) {
        if (LOG) Log.e(tag, string);
    }

    public static void e(String tag, String string, Exception e) {
        if (LOG) Log.e(tag, string, e);
    }

    public static void d(String tag, String string) {
        if (LOG) Log.d(tag, string);
    }

    public static void v(String tag, String string) {
        if (LOG) Log.v(tag, string);
    }

    public static void w(String tag, String string) {
        if (LOG) Log.w(tag, string);
    }

    public static void w(String tag, String string, Exception e) {
        if (LOG) Log.w(tag, string, e);
    }

    public static void printStackTrace(Exception e) {
        if (LOG) e.printStackTrace();
    }

    public static String tag(Class<?> clazz) {
        String simpleName = clazz.getSimpleName();
        if (simpleName.length() > 23) {
            return simpleName.substring(0, 23);
        }
        return simpleName;
    }

}
