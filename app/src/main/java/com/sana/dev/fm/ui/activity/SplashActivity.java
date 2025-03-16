package com.sana.dev.fm.ui.activity;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Bundle;
import android.os.Handler;
import android.preference.PreferenceManager;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.crashlytics.FirebaseCrashlytics;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.Query;
import com.google.firebase.remoteconfig.FirebaseRemoteConfig;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.AppRemoteConfig;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.ui.dialog.FmGeneralDialog;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.MyContextWrapper;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQuery;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQueryConditionCode;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.List;

@SuppressLint("CustomSplashScreen")
public class SplashActivity extends AppCompatActivity {
    private static final String TAG = "SplashActivity";
    private final Integer START_DELAY = 1500;
    public PreferencesManager prefMgr;
    protected FirebaseCrashlytics crashlytics;

    private TextView tv_trail;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);
        prefMgr = PreferencesManager.getInstance();
        crashlytics = FirebaseCrashlytics.getInstance();

        tv_trail = findViewById(R.id.tv_trail);

//        Intent intent = new Intent(SplashActivity.this, GoogleSignInActivity.class);
//        startActivity(intent);
//        return;
        setFullScreen();
        startAnimation();
        initRemoteConfig();
//        useDefaultConfig();

        FirebaseAuth auth = FirebaseAuth.getInstance();
        FirebaseUser currentUser = auth.getCurrentUser();

        if (currentUser != null) {
            // User is already signed in
            // Proceed with user-specific operations
            updateUI(currentUser);
        } else {
            // User is not signed in
            signInAnonymously();
        }
//
    }

    private void signInAnonymously() {
        FirebaseAuth auth = FirebaseAuth.getInstance();
        auth.signInAnonymously()
                .addOnSuccessListener(authResult -> {
                    FirebaseUser user = authResult.getUser();
                    updateUI(user);
                })
                .addOnFailureListener(e -> {
                    Log.w(TAG, "Anonymous sign-in failed", e);
                    // Show retry dialog
                    new AlertDialog.Builder(this)
                            .setTitle("Connection Error")
                            .setMessage("Failed to connect. Retry?")
                            .setPositiveButton("Retry", (dialog, which) -> signInAnonymously())
                            .setNegativeButton("Exit", (dialog, which) -> finish())
                            .show();
                });
    }

    private void updateUI(FirebaseUser user) {
        int requiredVersion = (int) Tools.getAppRemoteConfig().getRequiredVersion();
        // Check for force update
        if (isForceUpdateRequired(requiredVersion)) {
            showDialogForForceUpdate();
        } else {
            if (user != null) {
                // User is signed in
                // Display welcome message or allow access to user-specific content
                checkFirstTime();
            } else {
                // User is not signed in
                // Display sign-in prompt or redirect to sign-in page
                startActivity(new Intent(IntentHelper.noInternetActivity(SplashActivity.this, false)));
            }
        }
    }


    private void loadRadios() {
        FirestoreDbUtility firestoreDbUtility = new FirestoreDbUtility();

        List<FirestoreQuery> firestoreQueryList = new ArrayList<>();

        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.Query_Direction_DESCENDING,
                "priority",
                Query.Direction.DESCENDING
        ));

        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.WHERE_EQUAL_TO,
                "disabled",
                false
        ));

        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.RADIO_INFO_TABLE).collection(AppConstant.Firebase.RADIO_INFO_TABLE);
        firestoreDbUtility.getMany(collectionReference, firestoreQueryList, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                List<RadioInfo> radioInfoList = FirestoreDbUtility.getDataFromQuerySnapshot(object, RadioInfo.class);
                ShardDate.getInstance().setRadioInfoList(radioInfoList);
                prefMgr.setRadioInfo(new ArrayList<>(radioInfoList));
                if (prefMgr.selectedRadio() == null && radioInfoList != null && radioInfoList.size() > 0) {
                    prefMgr.write(AppConstant.Firebase.RADIO_INFO_TABLE, radioInfoList.get(0));
                }
                startActivity(new Intent(IntentHelper.mainActivity(SplashActivity.this, true)));
            }

            @Override
            public void onFailure(Object object) {
                LogUtility.e(TAG, " loadRadios :  " + object);
                startActivity(new Intent(IntentHelper.mainActivity(SplashActivity.this, true)));
            }
        });
    }

    // Update the existing loadRadios method to use the task
    private void loadRadiosZ() {
        new LoadRadiosTask(this).execute();
    }

    private void handleRadiosLoaded(List<RadioInfo> radioInfoList) {
        try {
            // Store radio data in memory and preferences
            ShardDate.getInstance().setRadioInfoList(radioInfoList);
            prefMgr.setRadioInfo(new ArrayList<>(radioInfoList));

            // Set default radio if none selected
            if (prefMgr.selectedRadio() == null && !radioInfoList.isEmpty()) {
                prefMgr.write(AppConstant.Firebase.RADIO_INFO_TABLE, radioInfoList.get(0));
            }

            // Navigate to main activity
            startActivity(new Intent(IntentHelper.mainActivity(SplashActivity.this, true)));

        } catch (Exception e) {
            handleRadiosLoadFailed(e);
        }
    }

    private void handleRadiosLoadFailed(Exception exception) {
        // Log error details
        String errorMsg = "Failed to load radio data: " + exception.getMessage();
        LogUtility.e(TAG, errorMsg);
        crashlytics.log(errorMsg);
        crashlytics.recordException(exception);

        // Show user-friendly error dialog
        ModelConfig config = new ModelConfig(
                R.drawable.ic_warning,
                getString(R.string.label_warning),
                getString(R.string.radio_load_error),
                null,
                new ButtonConfig(getString(R.string.label_retry), view -> loadRadios())
        );

        config.setBtnConfirm(new ButtonConfig(
                getString(R.string.label_cancel),
                view -> finishAffinity()
        ));

        config.setCancellable(false);
        config.setViewType(FmGeneralDialog.VIEW_WARNING);

        new FmGeneralDialog(this, config).show();
    }


    // Add this as an inner class in SplashActivity
    private static class LoadRadiosTask extends AsyncTask<Void, Void, List<RadioInfo>> {
        private final WeakReference<SplashActivity> activityRef;
        private Exception exception;

        LoadRadiosTask(SplashActivity activity) {
            this.activityRef = new WeakReference<>(activity);
        }

        @Override
        protected List<RadioInfo> doInBackground(Void... voids) {
            try {
                SplashActivity activity = activityRef.get();
                if (activity != null && !activity.isFinishing()) {
                    return activity.fetchRadiosFromFirestore();
                }
                return null;
            } catch (Exception e) {
                this.exception = e;
                return null;
            }
        }

        @Override
        protected void onPostExecute(List<RadioInfo> radioInfoList) {
            SplashActivity activity = activityRef.get();
            if (activity != null && !activity.isFinishing()) {
                if (radioInfoList != null && exception == null) {
                    activity.handleRadiosLoaded(radioInfoList);
                } else {
                    activity.handleRadiosLoadFailed(exception != null ? exception :
                            new Exception("Unknown error loading radio data"));
                }
            }
        }
    }

    // Add this method in SplashActivity
    private List<RadioInfo> fetchRadiosFromFirestore() {
        List<RadioInfo> radioInfoList = new ArrayList<>();
        FirestoreDbUtility firestoreDbUtility = new FirestoreDbUtility();
        List<FirestoreQuery> firestoreQueryList = new ArrayList<>();

        // Add query conditions
        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.Query_Direction_DESCENDING,
                "priority",
                Query.Direction.DESCENDING
        ));

        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.WHERE_EQUAL_TO,
                "disabled",
                false
        ));

        CollectionReference collectionRef = firestoreDbUtility.getTopLevelCollection()
                .document(AppConstant.Firebase.RADIO_INFO_TABLE)
                .collection(AppConstant.Firebase.RADIO_INFO_TABLE);

        firestoreDbUtility.getMany(collectionRef, firestoreQueryList, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                List<RadioInfo> radioInfoList = FirestoreDbUtility.getDataFromQuerySnapshot(object, RadioInfo.class);
                ShardDate.getInstance().setRadioInfoList(radioInfoList);
                prefMgr.setRadioInfo(new ArrayList<>(radioInfoList));
                if (prefMgr.selectedRadio() == null && radioInfoList != null && radioInfoList.size() > 0) {
                    prefMgr.write(AppConstant.Firebase.RADIO_INFO_TABLE, radioInfoList.get(0));
                }
                radioInfoList.addAll(radioInfoList);
            }

            @Override
            public void onFailure(Object object) {
                LogUtility.e(TAG, " loadRadios :  " + object);
                startActivity(new Intent(IntentHelper.mainActivity(SplashActivity.this, true)));
            }
        });

        return radioInfoList;
    }


    private void setFullScreen() {
        View decorView = getWindow().getDecorView();
        int uiOptions = View.SYSTEM_UI_FLAG_FULLSCREEN;
        decorView.setSystemUiVisibility(uiOptions);
        TextView tvVersion = findViewById(R.id.tv_version);

        String version = getString(R.string.app_version) + " (" + Tools.getAppVersion(this) + ")";
        tvVersion.setText(version);

        AppRemoteConfig remoteConfig = Tools.getAppRemoteConfig();
        if (remoteConfig != null) {
            if (remoteConfig.isTrialMode()) {
                tv_trail.setVisibility(View.VISIBLE);
            } else {
                tv_trail.setVisibility(View.INVISIBLE);
            }
        }
    }

    private void startAnimation() {
        Animation animation = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.img_zoom_out);
        findViewById(R.id.introLogo).startAnimation(animation);
    }

    @Override
    public void finish() {
        super.finish();
        overridePendingTransition(R.anim.slide_in, R.anim.slide_out);
    }

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(MyContextWrapper.wrap(newBase, PreferencesManager.getInstance().getPrefLange()));
    }

    private void initRemoteConfigZ() {
        FirebaseRemoteConfig remoteConfig = FirebaseRemoteConfig.getInstance();
        remoteConfig.setDefaultsAsync(R.xml.remote_config_defaults); // Set default values

        remoteConfig.fetchAndActivate()
                .addOnCompleteListener(new OnCompleteListener<Boolean>() {
                    @Override
                    public void onComplete(@NonNull Task<Boolean> task) {
                        if (task.isSuccessful()) {
                            try {
                                String remoteConfigKey = getString(R.string.label_remote_config_key);
                                String jsonString = remoteConfig.getString(remoteConfigKey);

                                // Safety check for null or empty string before parsing
                                if (Tools.isEmpty(jsonString)) {
                                    Log.w(TAG, "Remote config data is empty or null. Using default config.");
                                    crashlytics.setCustomKey(TAG, "Remote config data is empty or null. Using default config.");
                                    useDefaultConfig();
                                }

                                // Parse JSON using Gson
                                Gson gson = new Gson();
                                AppRemoteConfig remoteConfigObject = gson.fromJson(jsonString, AppRemoteConfig.class);

                                // Access and use data from remoteConfigObject
                                // Save the entire config as a String (optional, consider specific data access)
                                if (remoteConfigObject != null){
                                    prefMgr.write(AppConstant.General.APP_REMOTE_CONFIG, remoteConfigObject.toString());
                                    Log.d(TAG, "RemoteConfig Fetch Success: " + remoteConfigObject.toString());
                                }else {
                                    Log.e(TAG, "Error remoteConfigObject is null! ");
                                }


                            } catch (Exception e) {
                                Log.e(TAG, "Error parsing remote config JSON: " + e.getMessage());
                                crashlytics.recordException(e);
                                crashlytics.setCustomKey("SplashActivity", TAG);
                                // Handle parsing errors (use more specific exception handling if possible)
                                useDefaultConfig();
                            }
                        } else {
                            // Handle fetch failure
                            Log.e(TAG, "RemoteConfig Fetch failed", task.getException());
                            // Log the Exception with custom key
                            crashlytics.setCustomKey(TAG, "RemoteConfig Fetch failed " + task.getException());
//                            crashlytics.recordException("RemoteConfig Fetch failed "+  task.getException());
//                            crashlytics.setCustomKey("activity_name", TAG);
                            useDefaultConfig();

//                            CustomKeysAndValues keysAndValues = new CustomKeysAndValues.Builder()
//                                    .putString("string key", "string value")
//                                    .putString("string key 2", "string  value 2")
//                                    .putBoolean("boolean key", True)
//                                    .putBoolean("boolean key 2", False)
//                                    .putFloat("float key", 1.01)
//                                    .putFloat("float key 2", 2.02)
//                                    .build();
//                            crashlytics.setCustomKeys(keysAndValues);
                        }
                        //        -----------------------------------------------------------------------------------------
                    }
                });
    }

    private void initRemoteConfig() {
        FirebaseRemoteConfig remoteConfig = FirebaseRemoteConfig.getInstance();
        remoteConfig.setDefaultsAsync(R.xml.remote_config_defaults);

        remoteConfig.fetchAndActivate().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                String jsonString = remoteConfig.getString(getString(R.string.label_remote_config_key));
                if (!TextUtils.isEmpty(jsonString)) {
                    try {
                        AppRemoteConfig config = new Gson().fromJson(jsonString, AppRemoteConfig.class);
                        prefMgr.write(AppConstant.General.APP_REMOTE_CONFIG, config.toString());
                    } catch (JsonSyntaxException e) {
                        Log.e(TAG, "Invalid remote config JSON", e);
                        LogUtility.e(TAG, "Configuration error. Using default settings.");
                        useDefaultConfig();
                    }
                }
            } else {
                LogUtility.e(TAG, "Failed to fetch settings. Using defaults.");
                useDefaultConfig();
            }
        });
    }

    // Helper method to use default config
    private void useDefaultConfig() {
        AppRemoteConfig remoteConfig = Tools.getAppRemoteConfig();
        prefMgr.write(AppConstant.General.APP_REMOTE_CONFIG, remoteConfig.toString());
    }

    private boolean isForceUpdateRequired(int requiredVersion) {
        return BuildConfig.FLAVOR.equals("hudhudfm_google_play")
                && BuildConfig.VERSION_CODE < requiredVersion;
    }

    private void showDialogForForceUpdate() {
        ModelConfig config = new ModelConfig(R.drawable.ic_warning, getString(R.string.label_update_now), getString(R.string.label_force_update_message), null, new ButtonConfig(getString(R.string.label_force_update_title), new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                // Open app store to download the update
                // You can use an Intent with the appropriate URI to open the app store for your app
                Uri uri = Uri.parse("market://details?id=" + getPackageName());
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                finish(); // Close the activity after starting the update
            }
        }));
        config.setViewType(FmGeneralDialog.VIEW_WARNING);
        config.setCancellable(false);
        FmGeneralDialog dialogWarning = new FmGeneralDialog(this, config);
        dialogWarning.show();
    }

    private void checkFirstTime() {

        //        int lastVersion = task.getResult().get(LAST_APP_VERSION) ?: -1;
//        AppStart appStart = determineAppStart(lastVersion);
//        handleAppStart(appStart);
        new Handler().postDelayed(new Runnable() {
            @Override
            public void run() {
                switch (checkAppStart()) {
                    case NORMAL:
                        loadRadios();
                        break;
                    case FIRST_TIME_VERSION:
                        // TODO show what's new
//                        startActivity(new Intent(IntentHelper.introActivity(SplashActivity.this, true)));
                        break;
                    case FIRST_TIME:
                        // TODO show a tutorial
                        Intent intent = IntentHelper.introActivity(SplashActivity.this, true);
                        startActivity(intent);
                        break;
                    default:
                        break;
                }

            }
        }, START_DELAY);
    }


    private AppStart determineAppStart(int lastVersion) {
        int currentVersion = BuildConfig.VERSION_CODE;
        if (lastVersion == -1) return AppStart.FIRST_TIME;
        else if (lastVersion < currentVersion) return AppStart.FIRST_TIME_VERSION;
        else return AppStart.NORMAL;
    }

    /**
     * Distinguishes different kinds of app starts: <li>
     * <ul>
     * First start ever ({@link #FIRST_TIME})
     * </ul>
     * <ul>
     * First start in this version ({@link #FIRST_TIME_VERSION})
     * </ul>
     * <ul>
     * Normal app start ({@link #NORMAL})
     * </ul>
     *
     * @author schnatterer
     */
    public enum AppStart {
        FIRST_TIME, FIRST_TIME_VERSION, NORMAL;
    }

    /**
     * The app version code (not the version name!) that was used on the last
     * start of the app.
     */
    public static final String LAST_APP_VERSION = "last_app_version";

    /**
     * Finds out started for the first time (ever or in the current version).<br/>
     * <br/>
     * Note: This method is <b>not idempotent</b> only the first call will
     * determine the proper result. Any subsequent calls will only return
     * {@link AppStart#NORMAL} until the app is started again. So you might want
     * to consider caching the result!
     *
     * @return the type of app start
     */
    public AppStart checkAppStart() {
        PackageInfo pInfo;
        SharedPreferences sharedPreferences = PreferenceManager
                .getDefaultSharedPreferences(this);
        AppStart appStart = AppStart.NORMAL;
        try {
            pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            int lastVersionCode = sharedPreferences.getInt(LAST_APP_VERSION, -1);
            int currentVersionCode = pInfo.versionCode;
            appStart = checkAppStart(currentVersionCode, lastVersionCode);
            // Update version in preferences
            sharedPreferences.edit()
                    .putInt(LAST_APP_VERSION, currentVersionCode).apply();
        } catch (PackageManager.NameNotFoundException e) {
            Log.w(AppConstant.LOG,
                    "Unable to determine current app version from pacakge manager. Defenisvely assuming normal app start.");
        }
        return appStart;
    }

    public AppStart checkAppStart(int currentVersionCode, int lastVersionCode) {
        if (lastVersionCode == -1) {
            return AppStart.FIRST_TIME;
        } else if (lastVersionCode < currentVersionCode) {
            return AppStart.FIRST_TIME_VERSION;
        } else if (lastVersionCode > currentVersionCode) {
            Log.w(AppConstant.LOG, "Current version code (" + currentVersionCode
                    + ") is less then the one recognized on last startup ("
                    + lastVersionCode
                    + "). Defenisvely assuming normal app start.");
            return AppStart.NORMAL;
        } else {
            return AppStart.NORMAL;
        }
    }

}