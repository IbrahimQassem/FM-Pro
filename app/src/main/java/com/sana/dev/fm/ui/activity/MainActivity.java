package com.sana.dev.fm.ui.activity;

import static android.view.View.VISIBLE;
import static com.sana.dev.fm.utils.playerpro.RadioPlayerService.ACTION_NOTIFICATION_PERMISSION_REQUIRED;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.IdRes;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

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
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.messaging.FirebaseMessaging;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.model.interfaces.CallBackListener;
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
import com.sana.dev.fm.utils.playerpro.RadioPlayerService;

import java.util.HashMap;
import java.util.Map;

import co.mobiwise.materialintro.animation.MaterialIntroListener;
import co.mobiwise.materialintro.shape.Focus;
import co.mobiwise.materialintro.shape.ShapeType;

public class MainActivity extends BaseActivity implements CallBackListener, BaseActivity.NetworkStatusCallback {
    private static final String TAG = MainActivity.class.getSimpleName();
    public static String FRAGMENT_DATA = "transaction_data";
    public static String FRAGMENT_CLASS = "transaction_target";
    public static final String ACTION_SHOW_LOADING_ITEM = "action_show_loading_item";

    private FirebaseCrashlytics firebaseCrashlytics;
    private FirebaseAnalytics firebaseAnalytics;
    private FloatingActionButton playPauseButton;
    private BottomSheetDialog mBottomSheetDialog;
    private BottomSheetBehavior mBehavior;
    private AdView adView;
    private TextView tv_user_state;
    private ImageView iv_internet;
    private TextView tv_user_name;
    private BottomNavigationView navigation;
    private FragmentManager fm;
    private Fragment fragment1, fragment2, fragment3, active;

    // Radio Player Service
    private String currentStreamUrl = "";
    private String currentStreamTitle;

    private static final int PERMISSION_REQUEST_CODE = 123;
    private RadioPlayerService radioService;
    private boolean bound = false;
    private BroadcastReceiver notificationPermissionReceiver;

    private ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            RadioPlayerService.LocalBinder binder = (RadioPlayerService.LocalBinder) service;
            radioService = binder.getService();
            bound = true;

            // Setup initial state
            setupInitialState();
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            bound = false;
        }
    };


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initializeFirebaseServices();

        initializeViews();
        initToolbarProfile();
        initializeFragments();
        bindRadioService();

        logRegToken();
        initComponent();
        initEvent();
        initBottomNav();

        if (savedInstanceState != null) {
            restoreInstanceState(savedInstanceState);
        }


        registerNotificationPermissionReceiver();
        checkNotificationPermission();
        bindRadioService();
    }

    private void bindRadioService() {
        Intent intent = new Intent(this, RadioPlayerService.class);
        bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
    }


    private void updatePlayButtonState() {
        if (bound && radioService != null) {
            radioService.setPlayPauseButton(playPauseButton);
//            playPauseButton.setImageResource(radioService.isPlaying() ? R.drawable.ic_play : R.drawable.ic_radio);
        }
    }

    private void setupInitialState() {
        updatePlayButtonState();
    }

    private void registerNotificationPermissionReceiver() {
        notificationPermissionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                showNotificationPermissionDialog();
            }
        };

        LocalBroadcastManager.getInstance(this).registerReceiver(
                notificationPermissionReceiver,
                new IntentFilter(ACTION_NOTIFICATION_PERMISSION_REQUIRED)
        );
    }

    private void checkNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        PERMISSION_REQUEST_CODE
                );
            }
        }
    }

    private void showNotificationPermissionDialog() {
        new AlertDialog.Builder(this)
                .setTitle(R.string.notification_permission_title)
                .setMessage(R.string.notification_permission_message)
                .setPositiveButton(R.string.go_to_settings, (dialog, which) -> {
                    openNotificationSettings();
                })
                .setNegativeButton(R.string.label_cancel, null)
                .show();
    }

    private void openNotificationSettings() {
        Intent intent = new Intent();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
        } else {
            intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getPackageName()));
        }
        startActivity(intent);
    }


    private void initializeFirebaseServices() {
        firebaseCrashlytics = FirebaseCrashlytics.getInstance();
        firebaseAnalytics = FirebaseAnalytics.getInstance(this);

        if (isAccountSignedIn()) {
            UserModel user = PreferencesManager.getInstance().getUserSession();
            firebaseCrashlytics.setUserId(user.getMobile());
            firebaseAnalytics.setUserId(user.getMobile());
        }
    }

    private void initializeViews() {
        tv_user_state = findViewById(R.id.tv_user_state);
        iv_internet = findViewById(R.id.iv_internet);
        tv_user_name = findViewById(R.id.tv_user_name);
        playPauseButton = findViewById(R.id.playPauseButton);

        iv_internet.setVisibility(View.INVISIBLE);
    }


    public void initToolbarProfile() {
        if (isAccountSignedIn()) {
            UserModel user = PreferencesManager.getInstance().getUserSession();
            tv_user_name.setText(user.getName());
//            tv_user_state.setText(isOnlineTxt);
            if (!Tools.isEmpty(user.getPhotoUrl()))
                Tools.displayUserProfile(this, findViewById(R.id.civ_logo), user.getPhotoUrl(), R.drawable.ic_baseline_person);
        }
    }

    private void initializeFragments() {
        fm = getSupportFragmentManager();
        fragment1 = new MainHomeFragment();
        fragment2 = new DailyEpisodeFragment();
        fragment3 = new ProgramsFragment();
        active = fragment1;
    }

    private void initComponent() {
        // Setup AdMob
        adView = findViewById(R.id.ad_view);
        boolean isAdMobEnable = remoteConfig != null && remoteConfig.isAdMobEnable();
        if (isAdMobEnable) {
            AdRequest adRequest = new AdRequest.Builder().build();
            adView.loadAd(adRequest);
        }
        adView.setVisibility(isAdMobEnable ? VISIBLE : View.GONE);
    }

    private void initEvent() {
        View lyt_profile = findViewById(R.id.lyt_profile);
        lyt_profile.setOnClickListener(v -> checkUserLogin());
        playPauseButton.setOnClickListener(v -> handlePlayPauseClick());
    }

    private void checkUserLogin() {
        if (!isAccountSignedIn()) {
//            Intent intent = IntentHelper.phoneLoginActivity(MainActivity.this, false);
            Intent intent = IntentHelper.intentFormSignUp(MainActivity.this, false);
            startActivity(intent);
        } else {
            startActivity(new Intent(IntentHelper.userProfileActivity(MainActivity.this, false)));
        }
//        new RadioInfo().createRadio(this);
    }

    private void initBottomNav() {
        navigation = findViewById(R.id.nav_view);
        navigation.setOnNavigationItemSelectedListener(item -> {
            switch (item.getItemId()) {
                case R.id.navigation_home:
                    switchFragment(fragment1);
                    return true;
                case R.id.nav_daily_epi:
                    switchFragment(fragment2);
                    return true;
                case R.id.nav_radio_map:
                    switchFragment(fragment3);
                    return true;
                case R.id.nav_more:
                    showBottomSheetDialog();
                    return true;
            }
            return false;
        });

        // Initialize fragments
        fm.beginTransaction()
                .add(R.id.main_container, fragment3, fragment3.getClass().getSimpleName())
                .hide(fragment3)
                .commit();
        fm.beginTransaction()
                .add(R.id.main_container, fragment2, fragment2.getClass().getSimpleName())
                .hide(fragment2)
                .commit();
        fm.beginTransaction()
                .add(R.id.main_container, fragment1, fragment1.getClass().getSimpleName())
                .commit();

        navigation.setSelectedItemId(R.id.navigation_home);
    }

    private void switchFragment(Fragment fragment) {
        if (!isFinishing() && !isDestroyed()) {
            fm.beginTransaction()
                    .setCustomAnimations(android.R.anim.fade_in, android.R.anim.fade_out)
                    .hide(active)
                    .show(fragment)
                    .commit();
            active = fragment;
        }
    }

    private void logRegToken() {
        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(new OnCompleteListener<String>() {
                    @Override
                    public void onComplete(@NonNull Task<String> task) {
                        if (!task.isSuccessful()) {
                            Log.w(TAG, "Fetching FCM registration token failed", task.getException());
                            return;
                        }

                        String token = task.getResult();
                        PreferencesManager.getInstance().write(AppConstant.General.FIREBASE_FCM_TOKEN, token);

                        if (isAccountSignedIn()) {
                            UserModel userModel = PreferencesManager.getInstance().getUserSession();
                            if (userModel.getNotificationToken() != null &&
                                    !userModel.getNotificationToken().equals(token)) {
                                updateUserFcmToken(userModel, token);
                            }
                        }
                    }
                });
    }

    private void updateUserFcmToken(UserModel userModel, String token) {
//        try {
//            Thread.sleep(2000);
//        } catch (InterruptedException e) {
//            e.printStackTrace();
//        }
        FirestoreDbUtility firestoreDbUtility = new FirestoreDbUtility();
        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.USERS_TABLE,
                AppConstant.Firebase.USERS_TABLE
        );

        Map<String, Object> data = new HashMap<>();
        data.put("notificationToken", token);

        firestoreDbUtility.update(collectionReference, userModel.getUserId(), data, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                LogUtility.w(TAG, "FCM token updated successfully : " + token);
                userModel.setNotificationToken(token);
                PreferencesManager.getInstance().setUserSession(userModel);
            }

            @Override
            public void onFailure(Object object) {
                LogUtility.e(TAG, "onError : " + object);
            }
        });
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putString("currentStreamUrl", currentStreamUrl);
        outState.putString("currentStreamTitle", currentStreamTitle);
    }

    private void restoreInstanceState(Bundle savedInstanceState) {
        currentStreamUrl = savedInstanceState.getString("currentStreamUrl");
        currentStreamTitle = savedInstanceState.getString("currentStreamTitle");
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (!bound) {
            bindRadioService();
        }
    }

//    @Override
//    protected void onStop() {
//        super.onStop();
//        if (isBound) {
//            unbindService(serviceConnection);
//            isBound = false;
//        }
//    }

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

        if (bound) {
            unbindService(serviceConnection);
            bound = false;
        }
        if (notificationPermissionReceiver != null) {
            LocalBroadcastManager.getInstance(this)
                    .unregisterReceiver(notificationPermissionReceiver);
        }
        super.onDestroy();
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
        initToolbarProfile();
    }


    private void handlePlayPauseClick() {
//        if (isBound && radioPlayerService != null) {
        if (PreferencesManager.getInstance().selectedRadio() != null) {
            RadioInfo info = PreferencesManager.getInstance().selectedRadio();
// Metadata metadata = new Metadata(info.getName(), info.getName(), info.getChannelFreq(), info.getName(), info.getStreamUrl());
            changeStation(info.getStreamUrl(), info.getName() + " " + info.getChannelFreq());
        } else {
            showToast(getString(R.string.error_please_select_radio_station));
        }
//        } else {
//         //   showToast(getString(R.string.no_data_available));
//        }
    }

    public void updateMetadataUI(String title, String artist) {
        runOnUiThread(() -> {
            String displayText = title;
            if (artist != null && !artist.isEmpty()) {
                displayText += " - " + artist;
            }
// metadataTextView.setText(displayText);
        });
    }

    // Method to change the radio station
    public void changeStation(String newStreamUrl, String newTitle) {
//        boolean isSameStation = currentStreamUrl.equals(newStreamUrl);
        currentStreamUrl = newStreamUrl;
        currentStreamTitle = newTitle;

        try {

            if (bound && radioService != null) {
                if (!radioService.isPlaying()) {
                    radioService.setStreamUrl(currentStreamUrl);
                    radioService.setStreamTitle(currentStreamTitle);
                    radioService.startPlayback();
                } else {
                    radioService.stop();

//                    if (isSameStation) {
//                        radioService.pause();
//                    } else {
//                        radioService.stop();
//                    }
                }
                updatePlayButtonState();
            } else {
                showToast(String.format("%s", getResources().getString(R.string.no_stream, PreferencesManager.getInstance().selectedRadio().getName())));
            }

        } catch (Exception e) {
            Log.d(TAG, "Error startPlay : " + e.getMessage());
            showToast(getString(R.string.label_error_occurred_with_val, e.getMessage()));
        }
    }

    public void selectTab(@IdRes int itemId) {
        switchFragment(fragment1);
        navigation.setSelectedItemId(itemId);
    }

    private void updateOnlineFlag() {
        if (isAccountSignedIn()) {
            boolean isOnline = hasInternetConnection();
            String isOnlineTxt = isOnline ? getString(R.string.label_online) : getString(R.string.offline);
            int colorState = isOnline ? R.color.green_500 : R.color.yellow_500;

            tv_user_state.setText(isOnlineTxt);
            iv_internet.setColorFilter(ContextCompat.getColor(this, colorState),
                    android.graphics.PorterDuff.Mode.MULTIPLY);
            iv_internet.setVisibility(VISIBLE);
        } else {
            iv_internet.setVisibility(View.GONE);
        }
    }

    private void showBottomSheetDialogZ() {
        if (mBottomSheetDialog != null && mBottomSheetDialog.isShowing()) {
            return;
        }

        View bottomSheetView = getLayoutInflater().inflate(R.layout.main_activity_sheet_list, null);
        mBottomSheetDialog = new BottomSheetDialog(this);
        mBottomSheetDialog.setContentView(bottomSheetView);

        mBehavior = BottomSheetBehavior.from((View) bottomSheetView.getParent());
        mBehavior.setState(BottomSheetBehavior.STATE_EXPANDED);

        initializeBottomSheetViews(bottomSheetView);

        mBottomSheetDialog.setOnDismissListener(dialog -> mBottomSheetDialog = null);
        mBottomSheetDialog.show();
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
//                UserModel user =  PreferencesManager.getInstance().getUserSession();
//                user.setUserType(UserType.SuperADMIN);
//                 PreferencesManager.getInstance().write(AppConstant.Firebase.USER_INFO, (UserModel) user);
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


    private void initializeBottomSheetViews(View bottomSheetView) {
        // Initialize bottom sheet views and set click listeners
        // Implementation depends on your layout and requirements
    }

    private void restartActivity() {
        ProgramsFragment _programsFragment = (ProgramsFragment) fm.findFragmentByTag(ProgramsFragment.class.getSimpleName());
        _programsFragment.refresh();

        DailyEpisodeFragment _dailyEpisodeFragment = (DailyEpisodeFragment) fm.findFragmentByTag(DailyEpisodeFragment.class.getSimpleName());
        _dailyEpisodeFragment.refresh();


        if (radioService.isPlaying()) {
            radioService.stop();
        }
    }


    @Override
    public void onCallBack() {
        restartActivity();
    }

//    @Override
//    public void onNetworkChanged(boolean status) {
//        LogUtility.e(TAG, "CheckInternetCon : " + status);
//        updateOnlineFlag();
//    }

    @Override
    public void onNetworkChanged(boolean isConnected) {
        LogUtility.e(TAG, "CheckInternetCon : " + isConnected);
        updateOnlineFlag();
//        if (!isConnected) {
//            showToast(getString(R.string.check_internet_connection));
//        }
    }

    public void showPlayIntro() {
        showIntro(playPauseButton, UserGuide.INTRO_FOCUS_2, getString(R.string.label_play_intro2));
    }

    private void showIntro(View view, String id, String text) {
        userGuide.showIntro(view, id, text, Focus.ALL, ShapeType.CIRCLE, new MaterialIntroListener() {
            @Override
            public void onUserClicked(String materialIntroViewId) {
                PreferencesManager.getInstance().write(UserGuide.INTRO_FOCUS_2, "");
            }
        });
    }
}