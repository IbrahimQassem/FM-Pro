package com.sana.dev.fm.utils;

import static android.content.Context.MODE_PRIVATE;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashMap;

public class PreferencesManager {

    public static final String KEY_VALUE = "com.sana.dev.fm.KEY_VALUE";
    public static final String PREF_NAME = "com.sana.dev.fm.PREF_NAME";
    private static PreferencesManager sInstance;
    private final SharedPreferences mPref;

    public static synchronized PreferencesManager getInstance() {
        if (sInstance == null) {
            throw new IllegalStateException(PreferencesManager.class.getSimpleName() +
                    " is not initialized, call initializeInstance(..) method first.");
        }
        return sInstance;
    }

    public static synchronized void initializeInstance(Context context) {
        if (sInstance == null) {
            sInstance = new PreferencesManager(context);
        }
    }

    private PreferencesManager(Context context) {
        mPref = context.getSharedPreferences(PREF_NAME, MODE_PRIVATE);
    }

    public long getValue() {
        return mPref.getLong(KEY_VALUE, 0);
    }

    public void setValue(long value) {
        mPref.edit()
                .putLong(KEY_VALUE, value)
                .apply();
    }

    public void remove(String key) {
        mPref.edit()
                .remove(key)
                .apply();
    }

    public boolean clear() {
        return mPref.edit()
                .clear()
                .commit();
    }


//    -------------------------------------

    public String read(String key, String defValue) {
        return mPref.getString(key, defValue);
    }

    public void write(String key, String value) {
        SharedPreferences.Editor prefsEditor = mPref.edit();
        prefsEditor.putString(key, value);
        prefsEditor.apply();
    }

    public boolean read(String key, boolean defValue) {
        return mPref.getBoolean(key, defValue);
    }

    public void write(String key, boolean value) {
        SharedPreferences.Editor prefsEditor = mPref.edit();
        prefsEditor.putBoolean(key, value);
        prefsEditor.apply();
    }

    public Integer read(String key, int defValue) {
        return mPref.getInt(key, defValue);
    }

    public void write(String key, Integer value) {
        SharedPreferences.Editor prefsEditor = mPref.edit();
        prefsEditor.putInt(key, value).apply();
    }

    public void write(String key, Object o) {
        Gson gson = new Gson();
        String json = gson.toJson(o);
        SharedPreferences.Editor prefsEditor = mPref.edit();
        prefsEditor.putString(key, json);
        prefsEditor.apply();
    }

    public String getPrefLange() {
        String lang = read(FirebaseConstants.PREF_LANGUAGE, "ar");
        return lang;
    }

    public UserModel getUserSession() {
        Gson gson = new Gson();
        String json = read(FirebaseConstants.USER_INFO, null);
        return gson.fromJson(json, UserModel.class);
    }

    public void setRadioInfo(ArrayList<RadioInfo> arrayList) {
        //Set the values
        Gson gson = new Gson();
        String jsonText = gson.toJson(arrayList);
        write(FirebaseConstants.RADIO_INFO_LIST, jsonText);
    }


    public ArrayList<RadioInfo> getRadioList(){
        Gson gson = new Gson();
        String jstring = read(FirebaseConstants.RADIO_INFO_LIST, null);
        Type type = new TypeToken<ArrayList<RadioInfo>>() {}.getType();

//        Type collectionType = new TypeToken<Collection<RadioInfo>>(){}.getType();
//        Collection<RadioInfo> enums = gson.fromJson(jstring, collectionType);
//        List<RadioInfo> lcs = (List<RadioInfo>) new Gson()
//                .fromJson( jstring , collectionType);

        return gson.fromJson(jstring, type);
    }

    public RadioInfo selectedRadio() {
        Gson gson = new Gson();
        String json = read(FirebaseConstants.RADIO_INFO_TABLE, null);
        return gson.fromJson(json, RadioInfo.class);
//        RadioInfo ob =  new RadioInfo();
//        ob.setRadioId("1001");
//        ob.setName("إختيار قناة");
//        String json = read(FirebaseConstants.RADIO_INFO_TABLE, gson.toJson(ob));
//        RadioInfo radio = RadioInfo.newInstance("1002", "أصالة", "", "https://streamingv2.shoutcast.com/assala-fm", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1002%2Fmicar.jpg?alt=media&token=b568c461-9563-44e2-a091-e953471e42c4", "@asalah_fm", "صنعاء", "", "Asalah Fm", "usId", true);
//        RadioInfo radio = RadioInfo.newInstance("", "", "", "", "", "@", "", "", "", "", true);
//        String rdString = gson.toJson(radio);

    }


//    -------------------------------------

    public HashMap<String, String> getHash() {
        HashMap<String, String> res = new HashMap<>();
        try {
            //get from shared prefs
            Gson gson = new Gson();
            String storedHashMapString = mPref.getString(KEY_VALUE, PREF_NAME);
            java.lang.reflect.Type type = new TypeToken<HashMap<String, String>>() {
            }.getType();
            res = gson.fromJson(storedHashMapString, type);
        } catch (Exception e) {

        }

        return res;
    }

    public void setHash(HashMap<String, String> testHashMap) {
        //convert to string using gson
        Gson gson = new Gson();
        String hashMapString = gson.toJson(testHashMap);
        mPref.edit().putString(KEY_VALUE, hashMapString).apply();
//        Class<?>
    }

    private void hashmaptest() {
        //create test hashmap
        HashMap<String, String> testHashMap = new HashMap<String, String>();
        testHashMap.put("key1", "value1");
        testHashMap.put("key2", "value2");

        //convert to string using gson
        Gson gson = new Gson();
        String hashMapString = gson.toJson(testHashMap);

        //save in shared prefs
        mPref.edit().putString("hashString", hashMapString).apply();

        //get from shared prefs
        String storedHashMapString = mPref.getString("hashString", "oopsDintWork");
        java.lang.reflect.Type type = new TypeToken<HashMap<String, String>>() {
        }.getType();
        HashMap<String, String> testHashMap2 = gson.fromJson(storedHashMapString, type);

        //use values
        String toastString = testHashMap2.get("key1") + " | " + testHashMap2.get("key2");
//        Toast.makeText(this, toastString, Toast.LENGTH_LONG).show();
    }
}