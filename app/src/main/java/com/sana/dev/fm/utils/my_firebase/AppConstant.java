package com.sana.dev.fm.utils.my_firebase;

import android.content.Context;

import com.sana.dev.fm.FmApplication;

public class AppConstant extends FmApplication {

    private static Context mContext;

    @Override
    public void onCreate() {
        super.onCreate();
        mContext = this;
    }
    public static Context getContext(){
        return mContext;
    }

     public static final String SUCCESS = "تمت العملية بنجاح";
    public static final String FAIL = "فشل في تنفذ العملية";
    public static final String ERROR = "خطأ غير معروف";
    public static final String ADD = "إضافة";
    public static final String UPDATE = "تحديث";
    public static final String DELETE = "حذف";
    public static final String BR = "BR";
}