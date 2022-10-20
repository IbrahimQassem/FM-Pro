package com.sana.dev.fm.model;

import android.app.Activity;
import android.content.Context;
import android.net.Uri;
import android.os.AsyncTask;
import android.text.TextUtils;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GetTokenResult;
import com.google.firebase.auth.UserInfo;
import com.google.firebase.auth.UserProfileChangeRequest;
import com.google.firebase.firestore.ServerTimestamp;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.UsersRepositoryImpl;
import com.sana.dev.fm.utils.my_firebase.notification.FMCConstants;


import java.lang.ref.WeakReference;
import java.util.Date;

import static android.content.Context.MODE_PRIVATE;
import static com.sana.dev.fm.FmApplication.TAG;
import static com.sana.dev.fm.utils.FmUtilize.deviceId;
import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.USERS_TABLE;

/**
 * Created by Ibrahim on 22/2/18.
 */

public class Users extends UserId {


    private String name, email, mobile, password, photoUrl, nickNme, bio, tag, deviceId, stopNote, country, city, deviceToken;
    private boolean isVerified, isOnline, isStopped;
    private long lastSignInTimestamp;
    private Gender gender;
    private UserType userType;
    @ServerTimestamp
    private Date createdAt;

    public Users() {

    }

    public Users(String name, String photoUrl, Gender gender, String deviceToken) {
        this.name = name;
        this.photoUrl = photoUrl;
        this.gender = gender;
        this.deviceToken = deviceToken;
    }



    public Users(String userId, String name, String email, String mobile, String password, String photoUrl, String deviceToken, String nickNme, String bio, String tag, boolean isVerified, boolean isOnline, boolean isStopped, String deviceId, String stopNote, Gender gender, String country, String city, long lastSignInTimestamp,UserType userType) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.mobile = mobile;
        this.password = password;
        this.photoUrl = photoUrl;
        this.deviceToken = deviceToken;
        this.nickNme = nickNme;
        this.bio = bio;
        this.tag = tag;
        this.isVerified = isVerified;
        this.isOnline = isOnline;
        this.isStopped = isStopped;
        this.deviceId = deviceId;
        this.stopNote = stopNote;
        this.gender = gender;
        this.country = country;
        this.city = city;
        this.lastSignInTimestamp = lastSignInTimestamp;
        this.userType = userType;
    }

    @Override
    public String toString() {
        return "Users{" +
                "name='" + name + '\'' +
                ", email='" + email + '\'' +
                ", mobile='" + mobile + '\'' +
                ", password='" + password + '\'' +
                ", photoUrl='" + photoUrl + '\'' +
                ", deviceToken='" + deviceToken + '\'' +
                ", nickNme='" + nickNme + '\'' +
                ", bio='" + bio + '\'' +
                ", tag='" + tag + '\'' +
                ", deviceId='" + deviceId + '\'' +
                ", stopNote='" + stopNote + '\'' +
                ", country='" + country + '\'' +
                ", city='" + city + '\'' +
                ", isVerified=" + isVerified +
                ", isOnline=" + isOnline +
                ", isStopped=" + isStopped +
                ", lastSignInTimestamp=" + lastSignInTimestamp +
                ", gender=" + gender +
                ", userType=" + userType +
                '}';
    }


    public static String getToken(Context context) {
//        return PreferencesManager.getInstance().write(FMCConstants.DEVICE_TOKEN,"empty");
        return context.getSharedPreferences(PreferencesManager.PREF_NAME, MODE_PRIVATE).getString(FMCConstants.DEVICE_TOKEN, "empty");
    }

//    public static String getUserImageProfile(Context context) {
////        return PreferencesManager.getInstance().write(FMCConstants.DEVICE_TOKEN,"empty");
//        return context.getSharedPreferences(PreferencesManager.PREF_NAME, MODE_PRIVATE).getString(FMCConstants.USER_IMAGE_Profile, "empty");
//    }
    //  public static void initUser(Activity activity){
//
//        FirebaseAuth  mAuth=FirebaseAuth.getInstance();
//        PreferencesManager prefManager = new PreferencesManager(activity);
//        FmRepositoryImpl fmRepo = new FmRepositoryImpl(activity, USERS_TABLE);
//
////        final String downloadUri = task.getResult().getDownloadUrl().toString();
//
//        FirebaseUser user = mAuth.getCurrentUser();
//        if (user != null) {
//            // Name, email address, and profile photo Url
//            String name = user.getDisplayName();
//            String email = user.getEmail();
//            Uri photoUrl = user.getPhotoUrl();
//
//            // Check if user's email is verified
//            boolean emailVerified = user.isEmailVerified();
//
//            // The user's ID, unique to the Firebase project. Do NOT use this value to
//            // authenticate with your backend server, if you have one. Use
//            // FirebaseUser.getIdToken() instead.
//            String uid = user.getUid();
//
//
//            FirebaseInstallations.getInstance().getToken(true).addOnSuccessListener(new OnSuccessListener<InstallationTokenResult>() {
//                @Override
//                public void onSuccess(InstallationTokenResult installationTokenResult) {
//                        String token_id = installationTokenResult.getToken();
//                        // DO your thing with your firebase token
//                    Users _users = new Users(uid,name,email,"", "",photoUrl.toString(),token_id, "","","",emailVerified, true,false,deviceId(activity),"",Gender.MALE);
//
//                    fmRepo.createUser(  _users, new CallBack() {
//                        @Override
//                        public void onSuccess(Object object) {
//                            prefManager.writeObj("Users", _users);
//                            Toast.makeText(activity,"تم تسجيل الحساب "+ prefManager.getUsers().getName(), Toast.LENGTH_SHORT).show();
//                        }
//
//                        @Override
//                        public void onError(Object object) {
//
//                        }
//                    });
//                }
//            });
//
//        }
//
//    }

    public static void getUserInfo(Activity activity, String phone, CallBack callBack) {

//        PreferencesManager prefMgr = new PreferencesManager(activity);
        UsersRepositoryImpl fmRepo = new UsersRepositoryImpl(activity, USERS_TABLE);
        fmRepo.isUserExists(phone, new CallBack() {
            @Override
            public void onSuccess(Object object) {
//                Users _userModel = (Users) object;
//                prefMgr.write(FMCConstants.USER_INFO, _userModel);
//                String jsob = new Gson().toJson(object);
//                Log.d(TAG, "isUserExists : onSuccess " + jsob);
                callBack.onSuccess(object);

            }

            @Override
            public void onError(Object object) {
                callBack.onError(object);
                Log.d(TAG, "isUserExists:onError  " + object);
            }
        });
    }

    public static void initNewUser(FirebaseUser user, Activity activity) {

        if (user != null) {
            PreferencesManager prefMgr = PreferencesManager.getInstance();
            // Name, email address, and profile photo Url
            String uid = user.getUid();
            String name = user.getDisplayName();
            String email = user.getEmail();
            String mobile = TextUtils.isEmpty(user.getPhoneNumber()) ? user.getPhoneNumber() : prefMgr.read(FMCConstants.USER_MOBILE, "");
            final String[] photoUrl = {""};

//            final String[] photoUrl = {user.getPhotoUrl().toString()};

            //do this
//            if (TextUtils.isEmpty(user.getPhoneNumber())) mobile = user.getPhoneNumber();
//            if( user.getPhotoUrl() != null) photoUrl  = user.getPhotoUrl().toString();
            // Check if user's email is verified
            boolean emailVerified = user.isEmailVerified();

            // The user's ID, unique to the Firebase project. Do NOT use this value to
            // authenticate with your backend server, if you have one. Use
            // FirebaseUser.getIdToken() instead.

//            final String[] finalMobile = {mobile};
            user.getIdToken(true).addOnSuccessListener(new OnSuccessListener<GetTokenResult>() {
                @Override
                public void onSuccess(GetTokenResult result) {
//                    String token_id = result.getToken();
                    //Do whatever update

                    for (UserInfo user : FirebaseAuth.getInstance().getCurrentUser().getProviderData()) {
                        if (user.getProviderId().equals("facebook.com")) {
//                            System.out.println("User is signed in with Facebook");
                            photoUrl[0] = Tools.getFacebookProfilePicture(user.getUid()).toString();
                        } else if (user.getProviderId().equals("google.com")) {
                            //For linked Google account
//                            Log.d("xx_xx_provider_info", "User is signed in with Google");
                        }
                    }
                    Users _users = new Users(uid, name, email, mobile, "", photoUrl[0], getToken(activity), "", "", "", emailVerified, true, false, deviceId(activity), "", Gender.UNKNOWN, "", "", System.currentTimeMillis(),UserType.USER);

                    UsersRepositoryImpl fmRepo = new UsersRepositoryImpl(activity, USERS_TABLE);

                    fmRepo.createUpdateUser(_users.getUserId(), _users, new CallBack() {
                        @Override
                        public void onSuccess(Object object) {
                            prefMgr.write(FMCConstants.USER_INFO, _users);
//                            Toast.makeText(activity, "تم التسجيل بنجاح" + prefMgr.getUsers().getName(), Toast.LENGTH_SHORT).show();
                        }

                        @Override
                        public void onError(Object object) {

                        }
                    });
                }
            });

        }


    }


    public void updateProfile(FirebaseUser user) {
//        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();

        UserProfileChangeRequest profileUpdates = new UserProfileChangeRequest.Builder()
                .setDisplayName("Default User")
                .setPhotoUri(Uri.parse("https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1001%2F%25pDGJ%40%3F%3Cw.jpg?alt=media&token=b1d719eb-0881-4db2-954a-d74f37a332df"))
                .build();

        user.updateProfile(profileUpdates)
                .addOnCompleteListener(new OnCompleteListener<Void>() {
                    @Override
                    public void onComplete(@NonNull Task<Void> task) {
                        if (task.isSuccessful()) {
                            Log.d(TAG, "User profile updated.");
                        }
                    }
                });


        user.updateEmail("default@gmail.com")
                .addOnCompleteListener(new OnCompleteListener<Void>() {
                    @Override
                    public void onComplete(@NonNull Task<Void> task) {
                        if (task.isSuccessful()) {
                            Log.d(TAG, "User email address updated.");
                        }
                    }
                });

        String newPassword = "123456";
        user.updatePassword(newPassword)
                .addOnCompleteListener(new OnCompleteListener<Void>() {
                    @Override
                    public void onComplete(@NonNull Task<Void> task) {
                        if (task.isSuccessful()) {
                            Log.d(TAG, "User password updated.");
                        }
                    }
                });

//        Import user accounts
//        firebase auth:import users.json --hash-algo=scrypt --rounds=8 --mem-cost=14
//        https://firebase.google.com/docs/auth/android/manage-users

//        user.delete()
//                .addOnCompleteListener(new OnCompleteListener<Void>() {
//                    @Override
//                    public void onComplete(@NonNull Task<Void> task) {
//                        if (task.isSuccessful()) {
//                            Log.d(TAG, "User account deleted.");
//                        }
//                    }
//                });
    }


    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }


    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }

    public String getDeviceToken() {
        return deviceToken;
    }

    public void setDeviceToken(String deviceToken) {
        this.deviceToken = deviceToken;
    }

    public boolean isVerified() {
        return isVerified;
    }

    public void setVerified(boolean verified) {
        isVerified = verified;
    }

    public boolean isOnline() {
        return isOnline;
    }

    public void setOnline(boolean online) {
        isOnline = online;
    }

    public boolean isStopped() {
        return isStopped;
    }

    public void setStopped(boolean stopped) {
        isStopped = stopped;
    }

    public String getNickNme() {
        return nickNme;
    }

    public void setNickNme(String nickNme) {
        this.nickNme = nickNme;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getStopNote() {
        return stopNote;
    }

    public void setStopNote(String stopNote) {
        this.stopNote = stopNote;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public long getLastSignInTimestamp() {
        return lastSignInTimestamp;
    }

    public void setLastSignInTimestamp(long lastSignInTimestamp) {
        this.lastSignInTimestamp = lastSignInTimestamp;
    }

    public UserType getUserType() {
        return userType;
    }

    public void setUserType(UserType userType) {
        this.userType = userType;
    }
}

class UserId {

    public String userId;

    public <T extends UserId> T withId(@NonNull final String id) {
        this.userId = id;
        return (T) this;
    }


}

