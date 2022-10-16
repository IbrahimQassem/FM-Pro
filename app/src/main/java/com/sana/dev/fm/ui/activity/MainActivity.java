package com.sana.dev.fm.ui.activity;


import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Bitmap;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
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

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
//import com.google.firebase.iid.FirebaseInstanceId;
import com.google.gson.Gson;
import com.mikhaellopez.circularimageview.CircularImageView;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.activity.appuser.UserProfileActivity;
import com.sana.dev.fm.ui.dialog.MainDialog;
import com.sana.dev.fm.ui.fragment.DailyEpisodeFragment;
import com.sana.dev.fm.ui.fragment.EpisodeFragment;
import com.sana.dev.fm.ui.fragment.ProgramsFragment;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.UserGuide;
import com.sana.dev.fm.utils.radio_player.PlaybackStatus;
import com.sana.dev.fm.utils.radio_player.RadioManager;
import com.sana.dev.fm.utils.radio_player.StaticEventDistributor;
import com.sana.dev.fm.utils.radio_player.metadata.Metadata;
import com.sana.dev.fm.model.Users;


import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;

import co.mobiwise.materialintro.animation.MaterialIntroListener;
import co.mobiwise.materialintro.shape.Focus;
import co.mobiwise.materialintro.shape.ShapeType;

public class MainActivity extends BaseActivity implements StaticEventDistributor.EventListener, CallBackListener, BaseActivity.NetworkCallback {

    private static final String TAG = MainActivity.class.getSimpleName();

    public static String FRAGMENT_DATA = "transaction_data";
    public static String FRAGMENT_CLASS = "transaction_target";

    public static final String ACTION_SHOW_LOADING_ITEM = "action_show_loading_item";


    //    ---------- Radio Player -----------
    RadioManager radioManager;
    FloatingActionButton fab_radio;
    private BottomSheetDialog mBottomSheetDialog;
    private BottomSheetBehavior mBehavior;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

//        String sessionId = getIntent().getStringExtra("EXTRA_SESSION_ID");

//        NavController navController = Navigation.findNavController(MainBottomNav.this, R.id.main_container);
//        navController.navigateUp();
//        navController.navigate(R.id.myHomeFragment);

        fab_radio = (FloatingActionButton) findViewById(R.id.fab_radio);
        radioManager = RadioManager.with();


//        if (!isRadioSelected()) {
//            RadioInfo radio = RadioInfo.newInstance("1002", "أصالة", "", "https://streamingv2.shoutcast.com/assala-fm", "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/Fm_Folder_Images%2F1002%2Fmicar.jpg?alt=media&token=b568c461-9563-44e2-a091-e953471e42c4", "@asalah_fm", "صنعاء", "", "Asalah Fm", "usId", true);
//            RadioInfo.setSelectedRadio(radio, this);
//        }


        if (isPlaying()) {
            onAudioSessionId(RadioManager.getService().getAudioSessionId());
            fab_radio.setImageResource(R.drawable.ic_pause);
        }


        initBottomNav();


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
//        rotation.setRepeatCount(0);

//                v.clearAnimation();
//                fab_radio.clearAnimation();
                if (hasInternetConnection()) {
                    if (prefMgr.selectedRadio() != null){
                        RadioInfo info = prefMgr.selectedRadio();
                        Metadata metadata = new Metadata(info.getName(), info.getName(), info.getChannelFreq(), info.getName(), info.getStreamUrl());
                        startPlay(metadata);
                    }else {
                        showToast(getString(R.string.error_please_select_radio_station));
                    }

                } else {
                    showToast(getString(R.string.check_internet_connection));
                }


                if (prefMgr.read(UserGuide.INTRO_FOCUS_2, "").equals(UserGuide.INTRO_FOCUS_2)) {
                    showPlayIntro();
                }

//                RadioInfo info = new RadioInfo();
//                info.createRadio(MainActivity.this);
            }
        });


    }


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

    public void selectTab(@IdRes int itemId) {
        fm.beginTransaction().hide(active).show(fragment1).commit();
        active = fragment1;
        navigation.setSelectedItemId(itemId);
    }

    public void initToolbarProfile() {
        CircularImageView civ = (CircularImageView) findViewById(R.id.civ_logo);
//        int color = getResources().getColor(R.color.fab_color_shadow);
//        ColorFilter cf = new PorterDuffColorFilter(color, PorterDuff.Mode.MULTIPLY);
//        civ.setColorFilter(cf);

        TextView tv_user_name = findViewById(R.id.tv_user_name);
        TextView tv_user_state = findViewById(R.id.tv_user_state);
        ImageView iv_internet = findViewById(R.id.iv_internet);


        boolean isOnline = hasInternetConnection();
        String isOnlineTxt = isOnline ? getString(R.string.online) : getString(R.string.offline);
        int colorState = isOnline ? R.color.green_500 : R.color.yellow_500;

        if (isAccountSignedIn()) {
            PreferencesManager prefMgr = new PreferencesManager(this);

            Users user = prefMgr.getUsers();
            tv_user_name.setText(user.getName());
            tv_user_state.setText(isOnlineTxt);
            Tools.displayUserProfile(this, civ, user.getPhotoUrl());
            iv_internet.setColorFilter(ContextCompat.getColor(this, colorState), android.graphics.PorterDuff.Mode.MULTIPLY);
        }


    }

    private void showBottomSheetDialog() {

        View findViewById = findViewById(R.id.bottom_sheet);
        this.mBehavior = BottomSheetBehavior.from(findViewById);

        if (this.mBehavior.getState() == BottomSheetBehavior.STATE_EXPANDED) {
            this.mBehavior.setState(BottomSheetBehavior.STATE_COLLAPSED);
        }

        View inflate = getLayoutInflater().inflate(R.layout.sheet_list, null);

        LinearLayout lyt_add_program = inflate.findViewById(R.id.lyt_add_program);
        LinearLayout lyt_add_episode = inflate.findViewById(R.id.lyt_add_episode);
        LinearLayout lyt_update_episode = inflate.findViewById(R.id.lyt_update_episode);
        if (checkPrivilege()) {
            lyt_add_program.setVisibility(View.VISIBLE);
            lyt_add_episode.setVisibility(View.VISIBLE);
//            lyt_update_episode.setVisibility(View.VISIBLE);
        }

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
                Tools.rateAction(MainActivity.this);
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

        inflate.findViewById(R.id.lyt_add_program).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {

                if (checkPrivilege())
                    startActivity(new Intent(MainActivity.this, FormAddPrgram.class));
                mBottomSheetDialog.dismiss();
            }
        });

        inflate.findViewById(R.id.lyt_add_episode).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                EpisodeAddStepperVertical.startActivity(MainActivity.this);
                mBottomSheetDialog.dismiss();
            }
        });

        inflate.findViewById(R.id.lyt_update_episode).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                ListMultiSelection.startActivity(MainActivity.this);
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
            startLoginActivity();
        } else {
            UserProfileActivity.startActivity(MainActivity.this);
            finish();
        }
//        Fragment fragment = new EnterPhoneNumberFragment();
//        getSupportFragmentManager().beginTransaction()
//                .replace(R.id.main_container, fragment, fragment.getClass().getSimpleName()).addToBackStack(null).commit();

    }


    private void startPlay(Metadata metadata) {

        if (!FmUtilize.isEmptyOrNull(metadata.getUrl())) {
            //Check the sound level
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            int volume_level = am.getStreamVolume(AudioManager.STREAM_MUSIC);
            if (volume_level < 2) {
                showSnackBar(R.string.volume_low);
            } else {
                radioManager.playOrPause(metadata);
//        radioManager.playOrStop(streamURL);
//        http://edge.mixlr.com/channel/kijwr
            }
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

    @Override
    protected void onResume() {
        super.onResume();
        radioManager.bind(getApplicationContext());
        prefMgr = new PreferencesManager(this);
        initToolbarProfile();
    }

    @Subscribe
    public void onEvent(String status) {

        switch (status) {
            case PlaybackStatus.LOADING:
                // loading

                break;
            case PlaybackStatus.ERROR:
                showToast(String.format(" %s", getResources().getString(R.string.no_stream, prefMgr.selectedRadio().getName())));
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
            getSharedPreferences(PreferencesManager.PREF_NAME, MODE_PRIVATE).edit().putString(FMCConstants.DEVICE_TOKEN, newToken).apply();

        });

        Log.d("newToken",  getSharedPreferences(PreferencesManager.PREF_NAME, MODE_PRIVATE).getString(FMCConstants.DEVICE_TOKEN, "empty"));

        //If the device is having android oreo we will create a notification channel

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager mNotificationManager =
                    (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel mChannel = new NotificationChannel(FMCConstants.CHANNEL_ID, FMCConstants.CHANNEL_NAME, importance);
            mChannel.setDescription(FMCConstants.CHANNEL_DESCRIPTION);
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


    @Override
    protected void onDestroy() {
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
