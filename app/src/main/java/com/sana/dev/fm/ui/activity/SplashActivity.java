package com.sana.dev.fm.ui.activity;

import static com.sana.dev.fm.utils.FmUtilize.isCollection;

import android.annotation.SuppressLint;
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
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.RecyclerView;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.firestore.auth.User;
import com.google.gson.Gson;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.RadiosAdapter;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.ui.activity.player.PlayerActivity;
import com.sana.dev.fm.utils.Constants;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.SignInResultNotifier;
import com.sana.dev.fm.utils.UserGuide;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;
import com.sana.dev.fm.utils.my_firebase.RadioInfoRepositoryImpl;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@SuppressLint("CustomSplashScreen")
public class SplashActivity extends AppCompatActivity {

    private final Integer START_DELAY = 1500;

    private RadioInfoRepositoryImpl rIRepo;
    public PreferencesManager prefMgr;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);
        prefMgr = new PreferencesManager(this);

        startAnimation();
        setFullScreen();
//        chekFirstTime();
        initRadios();

    }

    private void initRadios() {
        rIRepo = new RadioInfoRepositoryImpl(this, FirebaseConstants.RADIO_INFO_TABLE);

        rIRepo.readAllRadioByEvent(new CallBack() {
            @Override
            public void onSuccess(Object object) {
                LogUtility.d(LogUtility.TAG, "readAllRadioByEvent response: " + new Gson().toJson(object));
                if (isCollection(object)) {
//                    ArrayList<RadioInfo> stationList = new ArrayList<>();
//                    stationList = (ArrayList<RadioInfo>) object;
//                    for (RadioInfo a : (ArrayList<RadioInfo>) object) {
//                        if (a.isOnline()) {
//                            stationList.add(a);
//                        }
//                    }
//                    ShardDate.getInstance().setInfoList((ArrayList<RadioInfo>) object);
                    ShardDate.getInstance().setInfoList((ArrayList<RadioInfo>) object);
                    prefMgr.setRadioInfo((ArrayList<RadioInfo>) object);
                }
                chekFirstTime();
            }

            @Override
            public void onError(Object object) {
                LogUtility.d(LogUtility.TAG, "readAllRadioByEvent error: " + new Gson().toJson(object));
                chekFirstTime();
            }
        });

    }


    private void setFullScreen() {
        View decorView = getWindow().getDecorView();
        int uiOptions = View.SYSTEM_UI_FLAG_FULLSCREEN;
        decorView.setSystemUiVisibility(uiOptions);
    }

    private void startAnimation() {
        Animation animation = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.img_zoom_out);
        ImageView logo = findViewById(R.id.introLogo);
        logo.startAnimation(animation);
    }

    private void chekFirstTime() {
        new Handler().postDelayed(new Runnable() {
            @Override
            public void run() {
                switch (checkAppStart()) {
                    case NORMAL:
                        // We don't want to get on the user's nerves
//                EpisodeFragment fragment = (EpisodeFragment) fm.findFragmentByTag(EpisodeFragment.class.getSimpleName());
//                assert fragment != null;
//                fragment.startMeEvent();
                        // Todo redirect to the main activity
                        Intent intent = BaseActivity.mainPage(SplashActivity.this, true);
//                        Intent intent = new Intent(SplashActivity.this, PlayerActivity.class);
                        startActivity(intent);
                        finish();
                        break;
                    case FIRST_TIME_VERSION:
                        // TODO show what's new
                        break;
                    case FIRST_TIME:
                        // TODO show a tutorial
                        Intent intent2 = BaseActivity.introPage(SplashActivity.this, true);
                        startActivity(intent2);
                        finish();
                        FirebaseAuth.getInstance().signInAnonymously().addOnCompleteListener(new SignInResultNotifier(SplashActivity.this));
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
            int lastVersionCode = sharedPreferences
                    .getInt(LAST_APP_VERSION, -1);
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