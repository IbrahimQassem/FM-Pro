package com.sana.dev.fm.ui.activity;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.preference.PreferenceManager;
import android.util.Log;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.crashlytics.FirebaseCrashlytics;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.Query;
import com.google.firebase.remoteconfig.FirebaseRemoteConfig;
import com.google.gson.Gson;
import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;
import com.sana.dev.fm.core.playback.DefaultStationPolicy;
import com.sana.dev.fm.core.startup.StartupAccessPolicy;
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

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@SuppressLint("CustomSplashScreen")
public class SplashActivity extends AppCompatActivity {
    private static final String TAG = "SplashActivity";
    private static final long START_DELAY_MS = 1500L;
    private static final long AUTH_TIMEOUT_MS = 3000L;
    public PreferencesManager prefMgr;
    protected FirebaseCrashlytics crashlytics;
    private final AtomicBoolean startupContinued = new AtomicBoolean(false);

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
//         Todo undo
        initRemoteConfig();
//        useDefaultConfig();

        FirebaseAuth auth = FirebaseAuth.getInstance();
        FirebaseUser currentUser = auth.getCurrentUser();

        if (currentUser != null) {
            continueStartupOnce(true);
        } else {
            new Handler(Looper.getMainLooper()).postDelayed(
                    () -> continueStartupOnce(false),
                    AUTH_TIMEOUT_MS
            );
            auth.signInAnonymously()
                    .addOnSuccessListener(new OnSuccessListener<AuthResult>() {
                        @Override
                        public void onSuccess(AuthResult authResult) {
                            Log.d(TAG, "signInAnonymously:success");
                            continueStartupOnce(authResult.getUser() != null);
                        }
                    })
                    .addOnFailureListener(new OnFailureListener() {
                        @Override
                        public void onFailure(@NonNull Exception e) {
                            Log.w(TAG, "Anonymous sign-in unavailable; continuing in listener mode");
                            continueStartupOnce(false);
                        }
                    });
        }
//        signInAnonymously();
    }

    private void continueStartupOnce(boolean firebaseUserAvailable) {
        if (startupContinued.compareAndSet(false, true)) {
            continueStartup(firebaseUserAvailable);
        }
    }

    private void continueStartup(boolean firebaseUserAvailable) {
        int requiredVersion = (int) Tools.getAppRemoteConfig().getRequiredVersion();
        StartupAccessPolicy.Action action = StartupAccessPolicy.decide(
                BuildConfig.VERSION_CODE,
                requiredVersion,
                firebaseUserAvailable
        );
        switch (action) {
            case FORCE_UPDATE:
                showDialogForForceUpdate();
                break;
            case CONTINUE_AUTHENTICATED:
            case CONTINUE_LISTENER:
                checkFirstTime();
                break;
            default:
                throw new IllegalStateException("Unsupported startup action: " + action);
        }
    }


    private List<RadioInfo> loadSeedRadioInfoList() {
        List<com.sana.dev.fm.domain.model.Station> stations = com.sana.dev.fm.data.datasource.LocalSeedStationDataSource.loadSeedStations(this);
        List<RadioInfo> list = new ArrayList<>();
        if (stations != null) {
            for (com.sana.dev.fm.domain.model.Station s : stations) {
                RadioInfo r = new RadioInfo();
                r.setRadioId(s.getId());
                r.setName(s.getName());
                r.setEnName(s.getNameEn());
                r.setDesc(s.getDescription());
                r.setChannelFreq(s.getFrequency());
                r.setCity(s.getCity());
                r.setStreamUrl(s.getStreamUrl());
                r.setLogo(s.getLogoUrl());
                r.setPriority(s.getPriority());
                r.setOnline(s.isLive());
                r.setDisabled(!s.isActive());
                list.add(r);
            }
        }
        return list;
    }

    private void loadRadios() {
        FirestoreDbUtility firestoreDbUtility = new FirestoreDbUtility();
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection()
                .document(AppConstant.Firebase.STATIONS_COLLECTION)
                .collection(AppConstant.Firebase.STATIONS_COLLECTION);

        collectionReference.get().addOnSuccessListener(queryDocumentSnapshots -> {
            List<RadioInfo> activeList = new ArrayList<>();
            if (queryDocumentSnapshots != null && !queryDocumentSnapshots.isEmpty()) {
                for (com.google.firebase.firestore.DocumentSnapshot doc : queryDocumentSnapshots.getDocuments()) {
                    RadioInfo r = doc.toObject(RadioInfo.class);
                    if (r == null) {
                        r = new RadioInfo();
                    }
                    if (r.getRadioId() == null || r.getRadioId().isEmpty()) {
                        r.setRadioId(doc.getId());
                    }
                    // Canonical schema fallback mapping
                    if (r.getName() == null || r.getName().isEmpty()) {
                        String name = doc.getString("name");
                        if (name != null) r.setName(name);
                    }
                    if (r.getChannelFreq() == null || r.getChannelFreq().isEmpty()) {
                        String freq = doc.getString("frequency");
                        if (freq != null) r.setChannelFreq(freq);
                    }
                    if (r.getStreamUrl() == null || r.getStreamUrl().isEmpty()) {
                        String streamUrl = doc.getString("streamUrl");
                        if (streamUrl != null) r.setStreamUrl(streamUrl);
                    }
                    if (r.getLogo() == null || r.getLogo().isEmpty()) {
                        String logo = doc.getString("logoUrl");
                        if (logo != null) r.setLogo(logo);
                    }
                    if (r.getCity() == null || r.getCity().isEmpty()) {
                        String city = doc.getString("city");
                        if (city != null) r.setCity(city);
                    }
                    Boolean isActive = doc.getBoolean("isActive");
                    if (isActive != null) {
                        r.setDisabled(!isActive);
                    }
                    Long priority = doc.getLong("priority");
                    if (priority != null) {
                        r.setPriority(priority.intValue());
                    }
                    Boolean isLive = doc.getBoolean("isLive");
                    if (isLive != null) {
                        r.setOnline(isLive);
                    }
                    if (!r.isDisabled()) {
                        activeList.add(r);
                    }
                }
                activeList.sort((a, b) -> Integer.compare(b.getPriority(), a.getPriority()));
            }
            if (activeList.isEmpty()) {
                activeList = loadSeedRadioInfoList();
            }
            ShardDate.getInstance().setRadioInfoList(activeList);
            prefMgr.setRadioInfo(new ArrayList<>(activeList));
            RadioInfo activeStation = DefaultStationPolicy.resolveActiveStation(prefMgr.selectedRadio(), activeList);
            prefMgr.write(AppConstant.Firebase.RADIO_INFO_TABLE, activeStation);
            openMainActivity();
        }).addOnFailureListener(e -> {
            LogUtility.e(TAG, "Radio refresh unavailable; using seed stations: " + e.getMessage());
            List<RadioInfo> fallback = loadSeedRadioInfoList();
            ShardDate.getInstance().setRadioInfoList(fallback);
            prefMgr.setRadioInfo(new ArrayList<>(fallback));
            RadioInfo activeStation = DefaultStationPolicy.resolveActiveStation(prefMgr.selectedRadio(), fallback);
            prefMgr.write(AppConstant.Firebase.RADIO_INFO_TABLE, activeStation);
            openMainActivity();
        });
    }

    private void openMainActivity() {
        startActivity(IntentHelper.mainActivity(SplashActivity.this, true));
    }

    private void setFullScreen() {
        View decorView = getWindow().getDecorView();
        int uiOptions = View.SYSTEM_UI_FLAG_FULLSCREEN;
        decorView.setSystemUiVisibility(uiOptions);

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

    private void initRemoteConfig() {
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
                                prefMgr.write(AppConstant.General.APP_REMOTE_CONFIG, remoteConfigObject.toString());

//                                if (remoteConfigObject.isTrialMode()) {
//                                    tv_trail.setVisibility(View.VISIBLE);
//                                } else {
//                                    tv_trail.setVisibility(View.INVISIBLE);
//                                }


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


                        // initSplash();

                        //        -----------------------------------------------------------------------------------------

//                        /*
//                         * Showing splash screen with a timer. This will be useful when you
//                         * want to show case your app logo / company
//                         */
//                        new Handler().postDelayed(new Runnable() {
//                            @Override
//                            public void run() {
//                                binding.tvSlogan.setVisibility(View.VISIBLE);
//                                Animation animation = AnimationUtils.loadAnimation(SplashActivity.this, R.anim.topnews_text_view);
//                                binding.tvSlogan.setAnimation(animation);
//                            }
//                        }, 1000);


//                        new Handler().postDelayed(new Runnable() {
//                            @Override
//                            public void run() {
////                //this method will be executed once the timer is over
////                //start the main activity or the start activity
//                                if (isAccountSignedIn()) {
//                                    intent = new Intent(IntentHelper.mainActivity(mContext, true));
//                                } else {
//                                    intent = new Intent(IntentHelper.loginIntroActivity(mContext, true));
//                                }
//                                startActivity(intent);
//                                finish();
//                                //checkIfUserIsAuthenticated();
//                            }
//                        }, SPLASH_TIME_OUT);
                    }
                });
    }

    // Helper method to use default config
    private void useDefaultConfig() {
        AppRemoteConfig remoteConfig = Tools.getAppRemoteConfig();
        prefMgr.write(AppConstant.General.APP_REMOTE_CONFIG, remoteConfig.toString());
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

/*    private void linkAccount() {
        AuthCredential credential = EmailAuthProvider.getCredential("", "");

        // [START link_credential]
        mAuth.getCurrentUser().linkWithCredential(credential)
                .addOnCompleteListener(this, new OnCompleteListener<AuthResult>() {
                    @Override
                    public void onComplete(@NonNull Task<AuthResult> task) {
                        if (task.isSuccessful()) {
                            Log.d(TAG, "linkWithCredential:success");
                            FirebaseUser user = task.getResult().getUser();
                            updateUI(user);
                        } else {
                            Log.w(TAG, "linkWithCredential:failure", task.getException());
                            Toast.makeText(SplashActivity.this, "Authentication failed.",
                                    Toast.LENGTH_SHORT).show();
                            updateUI(null);
                        }
                    }
                });
        // [END link_credential]
    }*/


    private void checkFirstTime() {
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                switch (getStartAction(checkAppStart())) {
                    case LOAD_RADIOS:
                        loadRadios();
                        break;
                    case SHOW_INTRO:
                        Intent intent = IntentHelper.introActivity(SplashActivity.this, true);
                        startActivity(intent);
                        break;
                    default:
                        break;
                }

            }
        }, START_DELAY_MS);

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

    public enum AppStartAction {
        LOAD_RADIOS, SHOW_INTRO
    }

    public static AppStartAction getStartAction(AppStart appStart) {
        return appStart == AppStart.FIRST_TIME
                ? AppStartAction.SHOW_INTRO
                : AppStartAction.LOAD_RADIOS;
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
