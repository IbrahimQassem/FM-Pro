package com.sana.dev.fm.ui.activity;


import static android.view.View.VISIBLE;

import android.content.ComponentName;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
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
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.viewpager2.widget.ViewPager2;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.firebase.analytics.FirebaseAnalytics;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.crashlytics.FirebaseCrashlytics;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.Query;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.gson.Gson;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.DestinationSliderAdapter;
import com.sana.dev.fm.model.DestinationModel;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.model.interfaces.MetadataListener;
import com.sana.dev.fm.ui.dialog.MainDialog;
import com.sana.dev.fm.ui.fragment.DailyEpisodeFragment;
import com.sana.dev.fm.ui.fragment.MainHomeFragment;
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
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQuery;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQueryConditionCode;
import com.sana.dev.fm.utils.playerpro.RadioPlayerService;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import co.mobiwise.materialintro.animation.MaterialIntroListener;
import co.mobiwise.materialintro.shape.Focus;
import co.mobiwise.materialintro.shape.ShapeType;

public class MainActivity extends BaseActivity implements CallBackListener, BaseActivity.NetworkCallback , DestinationSliderAdapter.OnDestinationClickListener  {
    private static final String TAG = MainActivity.class.getSimpleName();
    public static String FRAGMENT_DATA = "transaction_data";
    public static String FRAGMENT_CLASS = "transaction_target";
    public static final String ACTION_SHOW_LOADING_ITEM = "action_show_loading_item";
    FirebaseCrashlytics firebaseCrashlytics;
    FirebaseAnalytics firebaseAnalytics;

    FloatingActionButton playPauseButton;
    private BottomSheetDialog mBottomSheetDialog;
    private BottomSheetBehavior mBehavior;
    //    private final AtomicBoolean isMobileAdsInitializeCalled = new AtomicBoolean(false);
    private AdView adView;
//    private GoogleMobileAdsConsentManager googleMobileAdsConsentManager;

    TextView tv_user_state;
    ImageView iv_internet;
    TextView tv_user_name;

    private RecyclerView sliderRecyclerView;
    private DestinationSliderAdapter adapter;
    //    ---------- Radio Player -----------
    private RadioPlayerService radioPlayerService;
    private boolean isBound = false;
//    private TextView metadataTextView;
    private String currentStreamUrl = "https://c30.radioboss.fm:18267/stream"; // Replace with your stream URL
    private String currentStreamTitle;

    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            RadioPlayerService.LocalBinder binder = (RadioPlayerService.LocalBinder) service;
            radioPlayerService = binder.getService();
            isBound = true;

            // Initialize the service with the current stream
            setupRadioService();
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            radioPlayerService = null;
            isBound = false;
        }
    };

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

        initializeViews();
        bindRadioService();

        setupSlider();
        loadDestinations();

        logRegToken();
        initComponent();
        initEvent();
        initBottomNav();
//        initAdMob();
    }

    private void initComponent() {

        tv_user_state = findViewById(R.id.tv_user_state);
        iv_internet = findViewById(R.id.iv_internet);
        tv_user_name = findViewById(R.id.tv_user_name);
        iv_internet.setVisibility(View.INVISIBLE);

        // check if radio playing

        // setup addMod
        adView = findViewById(R.id.ad_view);
        boolean isAdMobEnable = remoteConfig != null && remoteConfig.isAdMobEnable();
        if (isAdMobEnable) {
            AdRequest adRequest = new AdRequest.Builder().build();
            adView.loadAd(adRequest);
        }
        adView.setVisibility(isAdMobEnable ? VISIBLE : View.GONE);
    }

    private void initEvent() {
        View lyt_profile = (View) findViewById(R.id.lyt_profile);
        lyt_profile.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                checkUserLogin();
            }
        });

//        fab_radio.setOnLongClickListener(new View.OnLongClickListener() {
//
//            @Override
//            public boolean onLongClick(View v) {
////                showToast("Stop radio");
////                radioManager.stop();
////                v.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
////                startActivity(new Intent(MainBottomNav.this, BottomNavigationShifting.class));
////                startActivity(new Intent(MainBottomNav.this, TabsSimpleProduct.class));
//
////                if (isPlaying()) {
////                StopPlaying();
////                }
//
////                initFirebaseNote();
//
//
//                return true;
//            }
//        });

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

/*
        fab_radio.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {

*/
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
                }*//*


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
*/
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
                        if (isAccountSignedIn()) {
                            UserModel userModel = prefMgr.getUserSession();
//                            LogUtility.w(TAG, "FCM UserModel : " + new Gson().toJson(userModel));
                            if (userModel.getNotificationToken() != null)
                                if (!userModel.getNotificationToken().equals(token)) {
                                    updateUserFcmToken(userModel, token);
                                }
                        }
                    }
                });
        // [END log_reg_token]
    }

    void updateUserFcmToken(UserModel userModel, String token) {
        FirestoreDbUtility firestoreDbUtility = new FirestoreDbUtility();

        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.USERS_TABLE, AppConstant.Firebase.USERS_TABLE);

        Map<String, Object> data = new HashMap<>();
        data.put("notificationToken", token);
        firestoreDbUtility.update(collectionReference, userModel.getUserId(), data, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                LogUtility.w(TAG, "FCM token updated successfully : " + token);
                userModel.setNotificationToken(token);
                prefMgr.setUserSession(userModel);
            }

            @Override
            public void onFailure(Object object) {
                LogUtility.e(TAG, "onError : " + object);
            }
        });
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

    BottomNavigationView navigation;
    FragmentManager fm = getSupportFragmentManager();
    Fragment fragment1 = new MainHomeFragment();
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
//        int color = getResources().getColor(R.color.colorAccent);
//        ColorFilter cf = new PorterDuffColorFilter(color, PorterDuff.Mode.MULTIPLY);
//        civ.setColorFilter(cf);


        if (isAccountSignedIn()) {
            PreferencesManager prefMgr = PreferencesManager.getInstance();

            UserModel user = prefMgr.getUserSession();
            tv_user_name.setText(user.getName());
//            tv_user_state.setText(isOnlineTxt);
            if (!Tools.isEmpty(user.getPhotoUrl()))
                Tools.displayUserProfile(this, findViewById(R.id.civ_logo), user.getPhotoUrl(), R.drawable.ic_baseline_person);

            firebaseCrashlytics.setUserId(user.getMobile());
            firebaseAnalytics.setUserId(user.getMobile());
            updateOnlineFlag();
        }


    }

    private void updateOnlineFlag() {
        if (isAccountSignedIn()) {
            boolean isOnline = hasInternetConnection();
            String isOnlineTxt = isOnline ? getString(R.string.label_online) : getString(R.string.offline);
            int colorState = isOnline ? R.color.green_500 : R.color.yellow_500;
            tv_user_state.setText(isOnlineTxt);
            iv_internet.setColorFilter(ContextCompat.getColor(this, colorState), android.graphics.PorterDuff.Mode.MULTIPLY);
            iv_internet.setVisibility(VISIBLE);
        } else {
            iv_internet.setVisibility(View.GONE);
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
        LinearLayout lyt_update_program = inflate.findViewById(R.id.lyt_update_program);
        LinearLayout lyt_update_radio = inflate.findViewById(R.id.lyt_update_radio);
        //lyt_update_radio.setVisibility(View.GONE);


        if (checkPrivilegeAdmin()) {
            lyt_add_program.setVisibility(View.VISIBLE);
            lyt_add_episode.setVisibility(View.VISIBLE);
            lyt_update_episode.setVisibility(View.VISIBLE);
            lyt_update_program.setVisibility(View.VISIBLE);
            lyt_update_radio.setVisibility(View.VISIBLE);
        } else {
            lyt_add_program.setVisibility(View.GONE);
            lyt_add_episode.setVisibility(View.GONE);
            lyt_update_episode.setVisibility(View.GONE);
            lyt_update_program.setVisibility(View.GONE);
            lyt_update_radio.setVisibility(View.GONE);
        }

//        if (checkPrivilegeAdmin() && (BuildConfig.FLAVOR.equals("hudhudfm_google_play") && BuildConfig.DEBUG)) {
//            lyt_update_radio.setVisibility(View.VISIBLE);
//            lyt_add_program.setVisibility(View.VISIBLE);
//            lyt_add_episode.setVisibility(View.VISIBLE);
//            lyt_update_episode.setVisibility(View.VISIBLE);
//            lyt_update_program.setVisibility(View.VISIBLE);
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
                    ListEpisodeActivity.startActivity(MainActivity.this);
                mBottomSheetDialog.dismiss();
            }
        });

        lyt_update_program.setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                if (checkPrivilegeAdmin())
                    ListProgramActivity.startActivity(MainActivity.this);
//                    ListUsersActivity.startActivity(MainActivity.this);
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


        if (radioPlayerService.isPlaying()) {
            radioPlayerService.stop();
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


/*    private void startPlay(String streamUrl) {
        try {
            if (!FmUtilize.isEmpty(streamUrl)) {
                //Check the sound level
                AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                int volume_level = am.getStreamVolume(AudioManager.STREAM_MUSIC);
                if (volume_level < 2) {
                    showSnackBar(getString(R.string.volume_low));
                } else {
                    radioPlayerService.playOrPause(streamUrl, "...");
//        radioManager.playOrStop(streamURL);
//        http://edge.mixlr.com/channel/kijwr
                }
            } else {
                showToast(String.format("%s", getResources().getString(R.string.no_stream, prefMgr.selectedRadio().getName())));
            }
        } catch (Exception e) {
            Log.d(TAG, "Error startPlay : " + e.getMessage());
            showToast(getString(R.string.label_error_occurred_with_val, e.getLocalizedMessage()));
        }
    }*/


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

    private void initializeViews() {
        currentStreamTitle = getString(R.string.app_name);
        playPauseButton = findViewById(R.id.playPauseButton);

        playPauseButton.setOnClickListener(v -> handlePlayPauseClick());
    }

    private void bindRadioService() {
        Intent intent = new Intent(this, RadioPlayerService.class);
        bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
    }

    private void setupRadioService() {
        if (radioPlayerService != null) {
            // Set up the play/pause button
            radioPlayerService.setPlayPauseButton(playPauseButton);

            // Initialize the media player with current stream
            radioPlayerService.initializeMediaPlayer(currentStreamUrl, currentStreamTitle);

            // Set up metadata listener
            radioPlayerService.setMetadataListener(new MetadataListener() {
                @Override
                public void onMetadataReceived(String title, String artist) {
                    updateMetadataUI(title, artist);
                }
            });
        }
    }

    private void handlePlayPauseClick() {
        if (isBound && radioPlayerService != null) {
            if (prefMgr.selectedRadio() != null) {
                RadioInfo info = prefMgr.selectedRadio();
//                Metadata metadata = new Metadata(info.getName(), info.getName(), info.getChannelFreq(), info.getName(), info.getStreamUrl());
                changeStation(info.getStreamUrl() ,info.getName() + " " + info.getChannelFreq());
            } else {
                showToast(getString(R.string.error_please_select_radio_station));
            }
        } else {
            showToast("Service not bound");
        }
    }

    public void updateMetadataUI(String title, String artist) {
//        runOnUiThread(() -> {
//            String displayText = title;
//            if (artist != null && !artist.isEmpty()) {
//                displayText += " - " + artist;
//            }
////            metadataTextView.setText(displayText);
//        });
    }

    // Method to change the radio station
    public void changeStation(String newStreamUrl, String newTitle) {
        currentStreamUrl = newStreamUrl;
        currentStreamTitle = newTitle;

        try {
            if (isBound && radioPlayerService != null) {
                // This will update the stream and start playing
                radioPlayerService.playOrPause(newStreamUrl, newTitle);
            } else {
                showToast(String.format("%s", getResources().getString(R.string.no_stream, prefMgr.selectedRadio().getName())));
            }
        } catch (Exception e) {
            Log.d(TAG, "Error startPlay : " + e.getMessage());
            showToast(getString(R.string.label_error_occurred_with_val, e.getLocalizedMessage()));
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (!isBound) {
            bindRadioService();
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        // Don't unbind if you want the service to continue playing in the background
    }

    @Override
    protected void onDestroy() {
        if (adView != null) {
            adView.destroy();
        }
        super.onDestroy();
        if (isBound) {
            unbindService(serviceConnection);
            isBound = false;
        }
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
        prefMgr = PreferencesManager.getInstance();
        initToolbarProfile();
    }


    @Override
    public void onCallBack() {
        restartActivity();
    }

    @Override
    public void onNetworkChange(boolean status) {
//        LogUtility.e(TAG, "chekInternetCon : " + status);
        updateOnlineFlag();
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
        showIntro(playPauseButton, UserGuide.INTRO_FOCUS_2, getString(R.string.label_play_intro2));
    }

    private void showIntro(View view, String id, String text) {
        userGuide.showIntro(view, id, text, Focus.ALL, ShapeType.CIRCLE, new MaterialIntroListener() {
            @Override
            public void onUserClicked(String materialIntroViewId) {
                prefMgr.write(UserGuide.INTRO_FOCUS_2, "");
            }
        });
    }


    private void setupSlider() {
        sliderRecyclerView = findViewById(R.id.sliderRecyclerView);
        adapter = new DestinationSliderAdapter(this, this);

        // Set up RecyclerView with horizontal scrolling
        LinearLayoutManager layoutManager = new LinearLayoutManager(this,
                LinearLayoutManager.HORIZONTAL, false);
        sliderRecyclerView.setLayoutManager(layoutManager);
        sliderRecyclerView.setAdapter(adapter);

        // Add page transformer for animation
        ViewPager2 viewPager = findViewById(R.id.viewPager);
        viewPager.setPageTransformer((page, position) -> {
            float r = 1 - Math.abs(position);
            page.setScaleY(0.85f + r * 0.15f);
        });
    }

    private void addDummyDestinations() {
        CollectionReference destinationsRef = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.ADVERTISEMENT_TABLE).collection(AppConstant.Firebase.ADVERTISEMENT_TABLE);  // Subcollection named "1001"

        List<DestinationModel> dummyDestinations = Arrays.asList(
                new DestinationModel(
                        "alaskan_mountain",
                        "Alaskan Mountain",
                        "Alaska, USA",
                        "https://picsum.photos/seed/picsum/200/300", // Replace with actual URLs
                        "Experience the majestic beauty of Alaska's mountain ranges. Home to diverse wildlife and stunning glaciers, this destination offers unforgettable hiking and photography opportunities.",
                        4.9f,
                        599.99,
                        7,
                        Arrays.asList("hiking", "nature", "adventure"),
                        "North America"
                ),
                new DestinationModel(
                        "northern_mountain",
                        "Northern Mountain",
                        "Himalayas, India",
                        "https://picsum.photos/seed/picsum/200/300",
                        "Discover the spiritual and natural wonder of the Himalayas. Trek through ancient paths, visit traditional villages, and witness breathtaking sunrise views over snow-capped peaks.",
                        5.0f,
                        799.99,
                        10,
                        Arrays.asList("trekking", "culture", "spiritual"),
                        "Asia"
                ),
                new DestinationModel(
                        "mt_fuji",
                        "Mt Fuji, Hakone",
                        "Japan",
                        "https://picsum.photos/seed/picsum/200/300",
                        "Join a full-day guided tour from Tokyo that travels to Mt Fuji, Japan's iconic mountain. Experience traditional Japanese culture and breathtaking natural beauty.",
                        4.8f,
                        350.00,
                        5,
                        Arrays.asList("culture", "nature", "sightseeing"),
                        "Asia"
                )
        );

        for (DestinationModel destination : dummyDestinations) {
            destinationsRef.document(destination.getId()).set(destination);
        }
    }
    FirestoreDbUtility firestoreDbUtility = new FirestoreDbUtility();

    private void loadDestinations() {
//        addDummyDestinations();
        List<FirestoreQuery> firestoreQueryList = new ArrayList<>();

        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.Query_Direction_DESCENDING,
                "rating",
                Query.Direction.DESCENDING
        ));
        
//     db.collection("destinations")
//                .orderBy("rating", Query.Direction.DESCENDING)
//                .limit(10)
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.ADVERTISEMENT_TABLE).collection(AppConstant.Firebase.ADVERTISEMENT_TABLE);  // Subcollection named "1001"
        firestoreDbUtility.getMany(collectionReference, firestoreQueryList, new CallBack() {
            @Override
            public void onSuccess(Object object) {
//                Map<String, Object> resultMap = new Gson().fromJson(object.toString(), Map.class);
                LogUtility.w(TAG, " loadDestinations onSuccess:  " + object.toString());
                List<DestinationModel> destinationList = FirestoreDbUtility.getDataFromQuerySnapshot(object, DestinationModel.class);
                String obj = new Gson().toJson(destinationList);
                LogUtility.w(TAG, " loadDestinations onSuccess data:  " + obj);

                adapter.setDestinations(destinationList);
            }

            @Override
            public void onFailure(Object object) {
                LogUtility.e(TAG, " loadDestinations onFailure:  " + object);
            }
        });
    }

    @Override
    public void onDestinationClick(DestinationModel destination) {
        // Handle destination click - navigate to details
        Intent intent = new Intent(this, DestinationDetailActivity.class);
        intent.putExtra("destination_id", destination.getId());
        startActivity(intent);
    }

    @Override
    public void onFavoriteClick(DestinationModel destination) {
        // Handle favorite click - update Firestore
        String userId = FirebaseAuth.getInstance().getCurrentUser().getUid();
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.USERS_TABLE).collection(AppConstant.Firebase.USERS_TABLE);
        DocumentReference userFavorites = collectionReference
                .document(userId)
                .collection("favorites")
                .document(destination.getId());

        userFavorites.get().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                if (task.getResult().exists()) {
                    userFavorites.delete();
                } else {
                    userFavorites.set(destination);
                }
            }
        });
    }
}
