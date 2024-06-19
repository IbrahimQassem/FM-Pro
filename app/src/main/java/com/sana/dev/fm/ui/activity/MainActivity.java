package com.sana.dev.fm.ui.activity;


import static android.view.View.VISIBLE;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Bitmap;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.MenuItem;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.IdRes;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.firebase.analytics.FirebaseAnalytics;
import com.google.firebase.crashlytics.FirebaseCrashlytics;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.gson.Gson;
import com.mikhaellopez.circularimageview.CircularImageView;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.dialog.MainDialog;
import com.sana.dev.fm.ui.fragment.DailyEpisodeFragment;
import com.sana.dev.fm.ui.fragment.EpisodeFragment;
import com.sana.dev.fm.ui.fragment.ProgramsFragment;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.UserGuide;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.radio_player.PlaybackStatus;
import com.sana.dev.fm.utils.radio_player.RadioManager;
import com.sana.dev.fm.utils.radio_player.StaticEventDistributor;
import com.sana.dev.fm.utils.radio_player.metadata.Metadata;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;

import java.util.HashMap;
import java.util.Map;

import co.mobiwise.materialintro.animation.MaterialIntroListener;
import co.mobiwise.materialintro.shape.Focus;
import co.mobiwise.materialintro.shape.ShapeType;

public class MainActivity extends BaseActivity implements StaticEventDistributor.EventListener, CallBackListener, BaseActivity.NetworkCallback {
    private static final String TAG = MainActivity.class.getSimpleName();
    public static String FRAGMENT_DATA = "transaction_data";
    public static String FRAGMENT_CLASS = "transaction_target";
    public static final String ACTION_SHOW_LOADING_ITEM = "action_show_loading_item";
    FirebaseCrashlytics firebaseCrashlytics;
    FirebaseAnalytics firebaseAnalytics;

    //    ---------- Radio Player -----------
    RadioManager radioManager;
    FloatingActionButton fab_radio;
    private BottomSheetDialog mBottomSheetDialog;
    private BottomSheetBehavior mBehavior;
    //    private final AtomicBoolean isMobileAdsInitializeCalled = new AtomicBoolean(false);
    private AdView adView;
//    private GoogleMobileAdsConsentManager googleMobileAdsConsentManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        firebaseCrashlytics = FirebaseCrashlytics.getInstance();
        firebaseAnalytics = FirebaseAnalytics.getInstance(this);

//        String sessionId = getIntent().getStringExtra("EXTRA_SESSION_ID");

//        NavController navController = Navigation.findNavController(MainBottomNav.this, R.id.main_container);
//        navController.navigateUp();
//        navController.navigate(R.id.myHomeFragment);

        fab_radio = (FloatingActionButton) findViewById(R.id.fab_radio);
        radioManager = RadioManager.with();

        logRegToken();

//        if (!isRadioSelected()) {
//            RadioInfo radio = RadioInfo.newInstance("1002", "أصالة", "", "https://streamingv2.shoutcast.com/assala-fm", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1002%2Fmicar.jpg?alt=media&token=b568c461-9563-44e2-a091-e953471e42c4", "@asalah_fm", "صنعاء", "", "Asalah Fm", "usId", true);
//            RadioInfo.setSelectedRadio(radio, this);
//        }


        if (isPlaying()) {
            onAudioSessionId(RadioManager.getService().getAudioSessionId());
            fab_radio.setImageResource(R.drawable.ic_pause);
        }


        initBottomNav();
//        initAdMob();

        // setup addMod
        adView = findViewById(R.id.ad_view);
        boolean isAdMobEnable = remoteConfig != null && remoteConfig.isAdMobEnable();
        if (isAdMobEnable) {
            AdRequest adRequest = new AdRequest.Builder().build();
            adView.loadAd(adRequest);
        }
        adView.setVisibility(isAdMobEnable ? VISIBLE : View.GONE);


        View lyt_profile = (View) findViewById(R.id.lyt_profile);
        lyt_profile.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                checkUserLogin();
            }
        });

        fab_radio.setOnLongClickListener(new View.OnLongClickListener() {

            @Override
            public boolean onLongClick(View v) {
//                showToast("Stop radio");
//                radioManager.stop();
//                v.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
//                startActivity(new Intent(MainBottomNav.this, BottomNavigationShifting.class));
//                startActivity(new Intent(MainBottomNav.this, TabsSimpleProduct.class));

//                if (isPlaying()) {
//                StopPlaying();
//                }

//                initFirebaseNote();


                return true;
            }
        });

//        RotateAnimation rotate = new RotateAnimation(0, 360,
//                Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF,
//                0.5f);
//
//        rotate.setDuration(4000);
//        rotate.setRepeatCount(Animation.INFINITE);
//        fab_radio.setAnimation(rotate);
//        //How you start
//        Animation rotation = AnimationUtils.loadAnimation(this, R.anim.rotate);
//        rotation.setRepeatCount(Animation.INFINITE);
//        fab_radio.startAnimation(rotation);

//You tell it not to repeat again
//        rotation.setRepeatCount(0);

//        Animation connectingAnimation = AnimationUtils.loadAnimation(this, R.anim.alpha_scale_animation);
//        fab_radio.startAnimation(connectingAnimation);
//        buttonPlayerAction();
//        OvershootInterpolator interpolator = new OvershootInterpolator();
//        ViewCompat.animate(fab_radio).
//                rotation(135f).
//                withLayer().
//                setDuration(300).
//                setInterpolator(interpolator).
//                start();

//        rotateImageAlbum();

        fab_radio.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {

/*                try {
                    FirestoreDbUtility firestoreDbUtility = new FirestoreDbUtility();

                    // Example: Add a document with generated ID
                    Map<String, Object> data = new HashMap<>();
                    data.put("id", "123");
                    data.put("name", "John Doe");
                    RadioInfo radio1 = RadioInfo.newInstance("1001", "يمن", "", "https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1001%2F1001.jpg?alt=media&token=41d7cab7-d1cf-4d10-840a-dd576c04871a", "@yemen_fm", "صنعاء", "99,9", "Yemen Fm", prefMgr.getUserSession().userId, false);

                    firestoreDbUtility.createOrMerge(firestoreDbUtility.getCollectionReference(AppConstant.Firebase.RADIO_INFO_TABLE, AppConstant.Firebase.RADIO_INFO_TABLE),radio1.getRadioId(), radio1, new CallBack() {
//                    firestoreDbUtility.createOrMerge(AppConstant.Firebase.RADIO_INFO_TABLE, radio1.getRadioId(), FmUtilize.classToMap(radio1), new CallBack() {
                        @Override
                        public void onSuccess(Object object) {
                            showToast(getString(R.string.done_successfully));
                        }

                        @Override
                        public void onFailure(Object object) {
                            showToast(getString(R.string.label_error_occurred_with_val, object));
                        }
                    });
                } catch (Exception e) {
                    showToast(getString(R.string.label_error_occurred_with_val, e.getLocalizedMessage()));
                }*/

              //        rotation.setRepeatCount(0);

//                v.clearAnimation();
//                fab_radio.clearAnimation();
                if (hasInternetConnection()) {
                    if (prefMgr.selectedRadio() != null) {
                        RadioInfo info = prefMgr.selectedRadio();
                        Metadata metadata = new Metadata(info.getName(), info.getName(), info.getChannelFreq(), info.getName(), info.getStreamUrl());
                        startPlay(metadata);
                    } else {
                        showToast(getString(R.string.error_please_select_radio_station));
                    }

                } else {
                    showToast(getString(R.string.check_internet_connection));
                }


                if (prefMgr.read(UserGuide.INTRO_FOCUS_2, "").equals(UserGuide.INTRO_FOCUS_2)) {
                    showPlayIntro();
                }
            }
        });
    }

    private void logRegToken() {
        // [START log_reg_token]
        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(new OnCompleteListener<String>() {
                    @Override
                    public void onComplete(@NonNull Task<String> task) {
                        if (!task.isSuccessful()) {
                            Log.w(TAG, "Fetching FCM registration token failed", task.getException());
                            return;
                        }

                        // Get new FCM registration token
                        String token = task.getResult();

                        // Log and toast
                        String msg = "FCM Registration token: " + token;
                        Log.d(TAG, msg);
                        PreferencesManager.getInstance().write(AppConstant.General.FIREBASE_FCM_TOKEN, token);
                    }
                });
        // [END log_reg_token]
    }

/*
    private void initAdMob() {
        // Log the Mobile Ads SDK version.
        Log.d(TAG, "Google Mobile Ads SDK Version: " + MobileAds.getVersion());

        // Set your test devices. Check your logcat output for the hashed device ID to
        // get test ads on a physical device. e.g.
        // "Use RequestConfiguration.Builder().setTestDeviceIds(Arrays.asList("ABCDEF012345"))
        // to get test ads on this device."
        //UserMessagingPlatform: Use new ConsentDebugSettings.Builder().addTestDeviceHashedId("A9E33D385BEC7E8EBB240261B32C2385") to set this as a debug device
//        MobileAds.setRequestConfiguration(
//                new RequestConfiguration.Builder().setTestDeviceIds(Arrays.asList("ABCDEF012345"))
//                        .build());

        // Gets the ad view defined in layout/ad_fragment.xml with ad unit ID set in
        // values/strings.xml.
        adView = findViewById(R.id.ad_view);

        googleMobileAdsConsentManager = new GoogleMobileAdsConsentManager(this);

        googleMobileAdsConsentManager.gatherConsent(
                consentError -> {
                    if (consentError != null) {
                        // Consent not obtained in current session. This sample loads ads using
                        // consent obtained in the previous session.
                        Log.w(
                                TAG,
                                String.format(
                                        "%s: %s",
                                        consentError.getErrorCode(),
                                        consentError.getMessage()));
                    }

                    if (googleMobileAdsConsentManager.canRequestAds()) {
                        initializeMobileAdsSdk();
                    }

                    if (googleMobileAdsConsentManager.isFormAvailable()) {
                        // Regenerate the options menu to include a privacy setting.
                        invalidateOptionsMenu();
                    }
                }
        );

        if (googleMobileAdsConsentManager.canRequestAds()) {
            initializeMobileAdsSdk();
        }
    }
*/

/*    private void initializeMobileAdsSdk() {
        if (isMobileAdsInitializeCalled.getAndSet(true)) {
            return;
        }

        // Initialize the Google Mobile Ads SDK.
        MobileAds.initialize(this);

        // Load an ad.
        AdRequest adRequest = new AdRequest.Builder().build();
        adView.loadAd(adRequest);
    }*/

    private void rotateImageAlbum() {
        fab_radio.setImageResource(R.drawable.ic_arrow_back);

//        if (isPlaying()) {
        this.fab_radio.animate().setDuration(100).rotation(this.fab_radio.getRotation() + 2.0f).setListener(new AnimatorListenerAdapter() {
            public void onAnimationEnd(Animator animator) {
                rotateImageAlbum();
                super.onAnimationEnd(animator);
            }
        });
//        }
    }


    BottomNavigationView navigation;
    FragmentManager fm = getSupportFragmentManager();
    Fragment fragment1 = new EpisodeFragment();
    Fragment fragment2 = new DailyEpisodeFragment();
    Fragment fragment3 = new ProgramsFragment();
    Fragment active = fragment1;

    public void initBottomNav() {

        BottomNavigationView.OnNavigationItemSelectedListener mOnNavigationItemSelectedListener
                = new BottomNavigationView.OnNavigationItemSelectedListener() {

            @Override
            public boolean onNavigationItemSelected(@NonNull MenuItem item) {
                switch (item.getItemId()) {
                    case R.id.navigation_home:
                        fm.beginTransaction().hide(active).show(fragment1).commit();
                        active = fragment1;
//                        fm.beginTransaction().replace(R.id.main_container, active).commit();

                        return true;

                    case R.id.nav_daily_epi:
                        fm.beginTransaction().hide(active).show(fragment2).commit();
                        active = fragment2;
//                        fm.beginTransaction().replace(R.id.main_container, active).commit();
                        return true;

                    case R.id.nav_radio_map:
                        fm.beginTransaction().hide(active).show(fragment3).commit();
                        active = fragment3;
//                        fm.beginTransaction().replace(R.id.main_container, active).commit();
//                        fm.beginTransaction().setMaxLifecycle(active,"").commit();
                        return true;

                    case R.id.nav_more:
                        showBottomSheetDialog();
                        return true;
                }
                return false;
            }
        };

        navigation = (BottomNavigationView) findViewById(R.id.nav_view);
//        disableShiftMode(navigation);
        navigation.setOnNavigationItemSelectedListener(mOnNavigationItemSelectedListener);
        navigation.setSelectedItemId(R.id.navigation_home);

        fm.beginTransaction().add(R.id.main_container, fragment3, fragment3.getClass().getSimpleName()).hide(fragment3).commit();
        fm.beginTransaction().add(R.id.main_container, fragment2, fragment2.getClass().getSimpleName()).hide(fragment2).commit();
        fm.beginTransaction().add(R.id.main_container, fragment1, fragment1.getClass().getSimpleName()).commit();


//         NavHostFragment navHostFragment = (NavHostFragment) getSupportFragmentManager().findFragmentById(R.id.nav_host_fragment);
//        NavigationUI.setupWithNavController(navigation, navHostFragment.getNavController());
//


//        // handle navigation selection
//        navigation.setOnNavigationItemSelectedListener(
//                new BottomNavigationView.OnNavigationItemSelectedListener() {
//                    @Override
//                    public boolean onNavigationItemSelected(@NonNull MenuItem item) {
//                        Fragment fragment;
//                        switch (item.getItemId()) {
//                            case R.id.navigation_home:
//                                fragment = fragment1;
//                                break;
//                            case R.id.nav_daily_epi:
//                                fragment = fragment2;
//                                break;
//                            case R.id.nav_radio_map:
//                            default:
//                                fragment = fragment3;
//                                break;
//                        }
//                        fm.beginTransaction().replace(R.id.main_container, fragment).commit();
//                        return true;
//                    }
//                });
    }

/*
    public void disableShiftMode(BottomNavigationView view) {
        BottomNavigationMenuView menuView = (BottomNavigationMenuView) view.getChildAt(0);
        try {
            Field shiftingMode = menuView.getClass().getDeclaredField("mShiftingMode");
            shiftingMode.setAccessible(true);
            shiftingMode.setBoolean(menuView, false);
            shiftingMode.setAccessible(false);
            for (int i = 0; i < menuView.getChildCount(); i++) {
                BottomNavigationItemView item = (BottomNavigationItemView) menuView.getChildAt(i);
                //noinspection RestrictedApi
                item.setShifting(false);
                // set once again checked value, so view will be updated
                //noinspection RestrictedApi
                item.setChecked(item.getItemData().isChecked());
            }
        } catch (NoSuchFieldException e) {
            Log.e("BNVHelper", "Unable to get shift mode field", e);
        } catch (IllegalAccessException e) {
            Log.e("BNVHelper", "Unable to change value of shift mode", e);
        }
    }
*/

    public void selectTab(@IdRes int itemId) {
        fm.beginTransaction().hide(active).show(fragment1).commit();
        active = fragment1;
        navigation.setSelectedItemId(itemId);
    }

    public void initToolbarProfile() {
        CircularImageView civ = (CircularImageView) findViewById(R.id.civ_logo);
//        int color = getResources().getColor(R.color.colorAccent);
//        ColorFilter cf = new PorterDuffColorFilter(color, PorterDuff.Mode.MULTIPLY);
//        civ.setColorFilter(cf);

        TextView tv_user_name = findViewById(R.id.tv_user_name);
        TextView tv_user_state = findViewById(R.id.tv_user_state);
        ImageView iv_internet = findViewById(R.id.iv_internet);


        boolean isOnline = hasInternetConnection();
        String isOnlineTxt = isOnline ? getString(R.string.label_online) : getString(R.string.offline);
        int colorState = isOnline ? R.color.green_500 : R.color.yellow_500;

        if (isAccountSignedIn()) {
            PreferencesManager prefMgr = PreferencesManager.getInstance();

            UserModel user = prefMgr.getUserSession();
            tv_user_name.setText(user.getName());
            tv_user_state.setText(isOnlineTxt);
            Tools.displayUserProfile(this, civ, user.getPhotoUrl(),R.drawable.ic_person);
            iv_internet.setColorFilter(ContextCompat.getColor(this, colorState), android.graphics.PorterDuff.Mode.MULTIPLY);

            firebaseCrashlytics.setUserId(user.getMobile());
            firebaseAnalytics.setUserId(user.getMobile());
        }


    }

    private void showBottomSheetDialog() {

        View findViewById = findViewById(R.id.bottom_sheet);
        this.mBehavior = BottomSheetBehavior.from(findViewById);

        if (this.mBehavior.getState() == BottomSheetBehavior.STATE_EXPANDED) {
            this.mBehavior.setState(BottomSheetBehavior.STATE_COLLAPSED);
        }

        View inflate = getLayoutInflater().inflate(R.layout.main_activity_sheet_list, null);

        LinearLayout lyt_add_program = inflate.findViewById(R.id.lyt_add_program);
        LinearLayout lyt_add_episode = inflate.findViewById(R.id.lyt_add_episode);
        LinearLayout lyt_update_episode = inflate.findViewById(R.id.lyt_update_episode);
        LinearLayout lyt_update_radio = inflate.findViewById(R.id.lyt_update_radio);
        //lyt_update_radio.setVisibility(View.GONE);


        if (checkPrivilegeAdmin()) {
            lyt_add_program.setVisibility(View.VISIBLE);
            lyt_add_episode.setVisibility(View.VISIBLE);
            lyt_update_episode.setVisibility(View.VISIBLE);
            lyt_update_radio.setVisibility(View.VISIBLE);
        } else {
            lyt_add_program.setVisibility(View.GONE);
            lyt_add_episode.setVisibility(View.GONE);
            lyt_update_episode.setVisibility(View.GONE);
            lyt_update_radio.setVisibility(View.GONE);
        }

//        if (checkPrivilegeAdmin() && (BuildConfig.FLAVOR.equals("hudhudfm_google_play") && BuildConfig.DEBUG)) {
//            lyt_update_radio.setVisibility(View.VISIBLE);
//            lyt_add_program.setVisibility(View.VISIBLE);
//            lyt_add_episode.setVisibility(View.VISIBLE);
//            lyt_update_episode.setVisibility(View.VISIBLE);
//            if (isAccountSignedIn()) {
//                UserModel user = prefMgr.getUserSession();
//                user.setUserType(UserType.SuperADMIN);
//                prefMgr.write(AppConstant.Firebase.USER_INFO, (UserModel) user);
//            }
//        }

        inflate.findViewById(R.id.lyt_user_acc).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                checkUserLogin();
                mBottomSheetDialog.dismiss();
            }
        });
        inflate.findViewById(R.id.lyt_share).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                FmUtilize.shareApp(MainActivity.this);
                mBottomSheetDialog.dismiss();
            }
        });
        inflate.findViewById(R.id.lyt_get_rate).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                MainDialog mainDialog = new MainDialog(MainActivity.this);
                mainDialog.showDialogRateUs();
                mBottomSheetDialog.dismiss();
            }
        });
        inflate.findViewById(R.id.lyt_about_us).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
//                Context applicationContext = getApplicationContext();
//                StringBuilder stringBuilder = new StringBuilder();
//                stringBuilder.append("Make a copy '");
//                stringBuilder.append("name");
//                stringBuilder.append("' clicked");
//                Toast.makeText(applicationContext, stringBuilder.toString(), Toast.LENGTH_SHORT).show();

                MainDialog mainDialog = new MainDialog(MainActivity.this);
                mainDialog.aboutUsDialogLight();

                mBottomSheetDialog.dismiss();
            }
        });

        lyt_add_program.setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                if (checkPrivilegeAdmin())
                    startActivity(new Intent(MainActivity.this, AddProgramActivity.class));
                mBottomSheetDialog.dismiss();
            }
        });

        lyt_add_episode.setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                if (checkPrivilegeAdmin())
                    AddEpisodeActivity.startActivity(MainActivity.this);
                mBottomSheetDialog.dismiss();
            }
        });

        lyt_update_episode.setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                if (checkPrivilegeAdmin())
                    ListMultiSelection.startActivity(MainActivity.this);
                mBottomSheetDialog.dismiss();
            }
        });


        lyt_update_radio.setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                if (checkPrivilegeAdmin())
                    RadioListActivity.startActivity(MainActivity.this);
                mBottomSheetDialog.dismiss();
            }
        });

        BottomSheetDialog bottomSheetDialog = new BottomSheetDialog(this);
        this.mBottomSheetDialog = bottomSheetDialog;
        bottomSheetDialog.setContentView(inflate);
        if (Build.VERSION.SDK_INT >= 21) {
            this.mBottomSheetDialog.getWindow().addFlags(67108864);
        }
        this.mBottomSheetDialog.show();
        this.mBottomSheetDialog.setOnDismissListener(new DialogInterface.OnDismissListener() {
            public void onDismiss(DialogInterface dialogInterface) {
                mBottomSheetDialog = null;
            }
        });

        inflate.findViewById(R.id.lyt_make_close).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                bottomSheetDialog.dismiss();
            }
        });
    }


    private void restartActivity() {
        ProgramsFragment _programsFragment = (ProgramsFragment) fm.findFragmentByTag(ProgramsFragment.class.getSimpleName());
        _programsFragment.refresh();

        DailyEpisodeFragment _dailyEpisodeFragment = (DailyEpisodeFragment) fm.findFragmentByTag(DailyEpisodeFragment.class.getSimpleName());
        _dailyEpisodeFragment.refresh();


        if (isPlaying()) {
            radioManager.stopPlay();
            fab_radio.setImageResource(R.drawable.ic_radio);
        }
    }


    private void checkUserLogin() {
        if (!isAccountSignedIn()) {
//            Intent intent = IntentHelper.phoneLoginActivity(MainActivity.this, false);
            Intent intent = IntentHelper.intentFormSignUp(MainActivity.this, false);
            startActivity(intent);
        } else {
            startActivity(new Intent(IntentHelper.userProfileActivity(MainActivity.this, false)));
        }
//        Fragment fragment = new EnterPhoneNumberFragment();
//        getSupportFragmentManager().beginTransaction()
//                .replace(R.id.main_container, fragment, fragment.getClass().getSimpleName()).addToBackStack(null).commit();

    }


    private void startPlay(Metadata metadata) {

        if (!FmUtilize.isEmpty(metadata.getUrl())) {
            //Check the sound level
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            int volume_level = am.getStreamVolume(AudioManager.STREAM_MUSIC);
            if (volume_level < 2) {
                showSnackBar(getString(R.string.volume_low));
            } else {
                radioManager.playOrPause(metadata);
//        radioManager.playOrStop(streamURL);
//        http://edge.mixlr.com/channel/kijwr
            }
        } else {
            showToast(String.format("%s", getResources().getString(R.string.no_stream, prefMgr.selectedRadio().getName())));
        }
    }


    private void StopPlaying() {
        // Click this button to pause the audio played in background service.
        radioManager.stopPlay();
//        radioManager.playOrStop(streamURL);
    }


    private boolean isPlaying() {
        return (null != radioManager && null != RadioManager.getService() && RadioManager.getService().isPlaying());
    }


    @Subscribe
    public void onEvent(String status) {

        switch (status) {
            case PlaybackStatus.LOADING:
                // loading

                break;
            case PlaybackStatus.ERROR:
                showToast(String.format("%s", getResources().getString(R.string.no_stream, prefMgr.selectedRadio().getName())));
                radioManager.stopPlay();
                fab_radio.setImageResource(R.drawable.ic_radio);
                break;

            case PlaybackStatus.PAUSED:
                fab_radio.setImageResource(R.drawable.ic_play);
                break;
            case PlaybackStatus.PLAYING:
//                showToast("PlaybackStatus.IDLE");
                fab_radio.setImageResource(R.drawable.ic_pause);
                break;//                showToast("PlaybackStatus.IDLE");
            case PlaybackStatus.IDLE:
//                showToast("PlaybackStatus.IDLE");
            default:
                fab_radio.setImageResource(R.drawable.ic_radio);

        }
//        fab_radio.setImageResource(status.equals(PlaybackStatus.PLAYING)
//                ? R.drawable.ic_pause
//                : R.drawable.ic_radio);

    }

    @Override
    public void onAudioSessionId(Integer i) {

    }

    @Override
    public void onMetaDataReceived(Metadata meta, Bitmap image) {
        //Update the mediainfo shown above the controls
//        String artistAndSong = null;
//        if (meta != null &&  meta.getArtist() != null)
//            artistAndSong = meta.getArtist() + " - " + meta.getSong();
//        showToast(artistAndSong);
//        updateMediaInfoFromBackground(artistAndSong, image);
//        onMetaDataReceived(RadioManager.getService().getMetaData(), null);
        LogUtility.e(TAG, "onMetaDataReceived: " + new Gson().toJson(meta));

    }


/*
    private void initFirebaseNote(){

        FirebaseInstanceId.getInstance().getInstanceId().addOnSuccessListener(this, instanceIdResult -> {
            String newToken = instanceIdResult.getToken();
            Log.e("newToken", newToken);
            getSharedPreferences(PreferencesManager.PREF_NAME, MODE_PRIVATE).edit().putString(AppConstant.Firebase.DEVICE_TOKEN, newToken).apply();

        });

        Log.d("newToken",  getSharedPreferences(PreferencesManager.PREF_NAME, MODE_PRIVATE).getString(FirebaseConstants.DEVICE_TOKEN, null));

        //If the device is having android oreo we will create a notification channel

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager mNotificationManager =
                    (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel mChannel = new NotificationChannel(FirebaseConstants.CHANNEL_ID, FirebaseConstants.CHANNEL_NAME, importance);
            mChannel.setDescription(FirebaseConstants.CHANNEL_DESCRIPTION);
            mChannel.enableLights(true);
            mChannel.setLightColor(Color.RED);
            mChannel.enableVibration(true);
            mChannel.setVibrationPattern(new long[]{100, 200, 300, 400, 500, 400, 300, 200, 400});
            mNotificationManager.createNotificationChannel(mChannel);
        }

        //Displaying a notification locally
        MyNotificationManager.getInstance(getApplicationContext()).displayNotification("Hi","Where are you?");

    }
*/

    @Override
    public void onStart() {
        super.onStart();
        EventBus.getDefault().register(this);
        StaticEventDistributor.registerAsListener(this);

    }

    @Override
    public void onStop() {
        super.onStop();
        EventBus.getDefault().unregister(this);
        StaticEventDistributor.unregisterAsListener(this);
    }

    /**
     * Called when leaving the activity
     */
    @Override
    public void onPause() {
        if (adView != null) {
            adView.pause();
        }
        super.onPause();
    }

    /**
     * Called when returning to the activity
     */
    @Override
    public void onResume() {
        super.onResume();
        if (adView != null) {
            adView.resume();
        }
        radioManager.bind(getApplicationContext());
        prefMgr = PreferencesManager.getInstance();
        initToolbarProfile();
    }


    /**
     * Called before the activity is destroyed
     */
    @Override
    protected void onDestroy() {
        if (adView != null) {
            adView.destroy();
        }
        super.onDestroy();
        if (!radioManager.isPlaying())
            radioManager.unbind(getApplicationContext());
    }


    @Override
    public void onCallBack() {
        restartActivity();
    }

    @Override
    public void onNetworkChange(boolean status) {
//        LogUtility.e(TAG, "chekInternetCon : " + status);
        initToolbarProfile();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
//        if (ACTION_SHOW_LOADING_ITEM.equals(intent.getAction())) {
//
//        }
//        Bundle extras = intent.getExtras();
//        if(extras != null){
//            if(extras.containsKey(FRAGMENT_DATA))
//            {
//                String[] extra = extras.getStringArray(MainActivity.FRAGMENT_DATA);
//                String msg = extras.getString("NotificationMessage");
//                Toast.makeText(this, extra[0], Toast.LENGTH_SHORT).show();
//
//            }
//        }
    }


    public void showPlayIntro() {
        showIntro(fab_radio, UserGuide.INTRO_FOCUS_2, getString(R.string.label_play_intro2));
    }

    private void showIntro(View view, String id, String text) {
        userGuide.showIntro(view, id, text, Focus.ALL, ShapeType.CIRCLE, new MaterialIntroListener() {
            @Override
            public void onUserClicked(String materialIntroViewId) {
                prefMgr.write(UserGuide.INTRO_FOCUS_2, "");
            }
        });
    }

}
