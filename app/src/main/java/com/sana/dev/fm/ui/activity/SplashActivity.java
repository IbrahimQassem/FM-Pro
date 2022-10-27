package com.sana.dev.fm.ui.activity;

import static com.sana.dev.fm.utils.FmUtilize.isCollection;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.preference.PreferenceManager;
import android.util.Log;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.ImageView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.utils.Constants;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.MyContextWrapper;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.SignInResultNotifier;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;
import com.sana.dev.fm.utils.my_firebase.FmStationCRUDImpl;

import java.util.ArrayList;

@SuppressLint("CustomSplashScreen")
public class SplashActivity extends AppCompatActivity {

    private final Integer START_DELAY = 1500;

    private FmStationCRUDImpl rIRepo;
    public PreferencesManager prefMgr;

//    private FirebaseAuth mAuth;
//    private FirebaseUser currentUser;

    private boolean isIntentChecked = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);
        prefMgr = PreferencesManager.getInstance();
        startAnimation();
        setFullScreen();
    }


    private void initRadios() {
        rIRepo = new FmStationCRUDImpl(this, FirebaseConstants.RADIO_INFO_TABLE);

        rIRepo.queryAllBy(null,null,new CallBack() {
            @Override
            public void onSuccess(Object object) {
                if (isCollection(object)) {
                    ArrayList<RadioInfo> stationList = (ArrayList<RadioInfo>) object;
                    ShardDate.getInstance().setInfoList(stationList);
                    prefMgr.setRadioInfo(stationList);

                    if (prefMgr.selectedRadio() == null) {
                        prefMgr.write(FirebaseConstants.RADIO_INFO_TABLE, stationList.get(0));
                    }

                    if (!isIntentChecked) {
                        startActivity(new Intent(IntentHelper.mainActivity(SplashActivity.this, true)));
                        isIntentChecked = true;
                    }


                }
            }

            @Override
            public void onError(Object object) {
//                goToMain();
                initRadios();
            }
        });

        if (isCollection(prefMgr.getRadioList()) && !isIntentChecked) {
            startActivity(new Intent(IntentHelper.mainActivity(SplashActivity.this, true)));
            isIntentChecked = true;
        }

    }


    private void setFullScreen() {
        View decorView = getWindow().getDecorView();
        int uiOptions = View.SYSTEM_UI_FLAG_FULLSCREEN;
        decorView.setSystemUiVisibility(uiOptions);
        chekFirstTime();
    }

    private void startAnimation() {
        Animation animation = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.img_zoom_out);
        ImageView logo = findViewById(R.id.introLogo);
        logo.startAnimation(animation);
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


    @Override
    public void onStart() {
        super.onStart();
        // Check if user is signed in (non-null) and update UI accordingly.
        checkIfFirebaseAuth();
    }

    private void checkIfFirebaseAuth() {
        FirebaseAuth.getInstance().signInAnonymously().addOnCompleteListener(new SignInResultNotifier(SplashActivity.this));
//        mAuth.getInstance().signInAnonymously()
//                .addOnCompleteListener(SplashActivity.this, new OnCompleteListener<AuthResult>() {
//                    @Override
//                    public void onComplete(@NonNull Task<AuthResult> task) {
//                        if (task.isSuccessful()) {
//                            // Sign in success, update UI with the signed-in user's information
//                            Log.d(LogUtility.TAG, "signInAnonymously:success");
////                            startActivity(new Intent(IntentHelper.introActivity(SplashActivity.this, true)));
//                        } else {
//                            // If sign in fails, display a message to the user.
//                            Log.w(LogUtility.TAG, "signInAnonymously:failure", task.getException());
////                            startActivity(new Intent(IntentHelper.noInternetActivity(SplashActivity.this,false)));
////                            prefMgr.remove(LAST_APP_VERSION);
//                        }
//                    }
//                });
    }

    private void chekFirstTime() {
        new Handler().postDelayed(new Runnable() {
            @Override
            public void run() {
                switch (checkAppStart()) {
                    case NORMAL:
                        if (FirebaseAuth.getInstance().getCurrentUser() != null) {
                            initRadios();
                        } else {
                            startActivity(new Intent(IntentHelper.noInternetActivity(SplashActivity.this, false)));
                        }
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
            Log.w(Constants.LOG,
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
            Log.w(Constants.LOG, "Current version code (" + currentVersionCode
                    + ") is less then the one recognized on last startup ("
                    + lastVersionCode
                    + "). Defenisvely assuming normal app start.");
            return AppStart.NORMAL;
        } else {
            return AppStart.NORMAL;
        }
    }

}