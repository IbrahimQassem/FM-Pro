package com.sana.dev.fm.ui.activity;


import static com.sana.dev.fm.adapter.UserProfileAdapter.SPAN_COUNT_ONE;
import static com.sana.dev.fm.adapter.UserProfileAdapter.SPAN_COUNT_THREE;
import static com.sana.dev.fm.ui.activity.player.PermitActivity.MY_PERMISSIONS_REQUEST_READ_EXTERNAL_STORAGE;
import static com.sana.dev.fm.utils.FmUtilize.isCollection;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.PorterDuff;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.Interpolator;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.appcompat.widget.Toolbar;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.tabs.TabLayout;
import com.google.gson.Gson;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.UserProfileAdapter;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.ui.activity.player.SongPlayerFragment;
import com.sana.dev.fm.ui.view.RevealBackgroundView;
import com.sana.dev.fm.utils.DataGenerator;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.EpisodeRepositoryImpl;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;
import com.sana.dev.fm.utils.my_firebase.FmRepositoryImpl;


import java.util.ArrayList;
import java.util.List;

import butterknife.BindView;

/**
 * Created by  Ibrahim on 25.03.21.
 */
public class ProgramDetailsActivity extends BaseActivity implements RevealBackgroundView.OnStateChangeListener {

    public static final String ARG_REVEAL_START_LOCATION = "reveal_start_location";
    private static final int USER_OPTIONS_ANIMATION_DELAY = 300;
    private static final Interpolator INTERPOLATOR = new DecelerateInterpolator();
    private final String TAG = ProgramDetailsActivity.class.getSimpleName();
    @BindView(R.id.vRevealBackground)
    RevealBackgroundView vRevealBackground;
    @BindView(R.id.recyclerView)
    RecyclerView recyclerView;

    @BindView(R.id.tlUserProfileTabs)
    TabLayout tlUserProfileTabs;

    @BindView(R.id.ivUserProfilePhoto)
    ImageView ivUserProfilePhoto;
    @BindView(R.id.vUserDetails)
    View vUserDetails;
    @BindView(R.id.btnFollow)
    Button btnFollow;
    @BindView(R.id.vUserStats)
    View vUserStats;
    @BindView(R.id.vUserProfileRoot)
    View vUserProfileRoot;

    @BindView(R.id.tvName)
    TextView tvName;
    @BindView(R.id.tvTag)
    TextView tvTag;
    @BindView(R.id.tvCategory)
    TextView tvCategory;
    @BindView(R.id.tvSubTitle)
    TextView tvDesc;
    @BindView(R.id.tvPostCount)
    TextView tvPostCount;
    @BindView(R.id.tvSubscribers)
    TextView tvSubscribers;
    @BindView(R.id.tvLikesCount)
    TextView tvLikesCount;

    //    StaggeredGridLayoutManager layoutManager;
    private GridLayoutManager gridLayoutManager;


    private UserProfileAdapter itemAdapter;
    private List<Episode> detailsList = new ArrayList<>();


    public static void startUserProfileFromLocation(int[] startingLocation, Activity startingActivity) {
        Intent intent = new Intent(startingActivity, ProgramDetailsActivity.class);
        intent.putExtra(ARG_REVEAL_START_LOCATION, startingLocation);
        startingActivity.startActivity(intent);
    }

    public static void startUserProfileFromLocation(int[] startingLocation, Context context, Episode episode) {
        Intent intent = new Intent(context, ProgramDetailsActivity.class);
        intent.putExtra(ARG_REVEAL_START_LOCATION, startingLocation);
//        intent.putExtra("name", tempClass.name);

        String obj = (new Gson().toJson(episode));
        intent.putExtra("episode", obj);

        context.startActivity(intent);
    }


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.program_details_activity);

        gridLayoutManager = new GridLayoutManager(this, SPAN_COUNT_ONE);

        initToolbar();
        setupTabs();
        setupUserProfileGrid();
//        setupRevealBackground(savedInstanceState);
        setupUserProfile();
        initPlayer();

    }

    private void initPlayer() {
        if (!checkStoragePermission(this)) {
            Fragment songPlayerFragment = getSupportFragmentManager().findFragmentById(R.id.content);
            if (songPlayerFragment == null) {
                getSupportFragmentManager().beginTransaction().add(R.id.content, new SongPlayerFragment(), "SongPlayer").commit();
                Log.d(TAG, "songPlayerFragment Fragment new created");
            } else {
                Log.d(TAG, "songPlayerFragment Fragment reused ");
            }
        } else {
            showWarningDialog("External storage", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialogInterface, int i) {
                    ActivityCompat.requestPermissions(ProgramDetailsActivity.this,
                            new String[]{Manifest.permission.READ_EXTERNAL_STORAGE},
                            MY_PERMISSIONS_REQUEST_READ_EXTERNAL_STORAGE);
                }
            });
        }

    }

    public boolean checkStoragePermission(final Context context) {
        int currentAPIVersion = Build.VERSION.SDK_INT;
        if (currentAPIVersion >= android.os.Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(context,
                    Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                if (ActivityCompat.shouldShowRequestPermissionRationale(
                        (Activity) context,
                        Manifest.permission.READ_EXTERNAL_STORAGE)) {
                } else {
                    ActivityCompat
                            .requestPermissions(
                                    (Activity) context,
                                    new String[]{Manifest.permission.READ_EXTERNAL_STORAGE},
                                    MY_PERMISSIONS_REQUEST_READ_EXTERNAL_STORAGE);
                }
                return true;
            } else {
                return false;
            }

        } else {
            return false;
        }
    }


    private void initToolbar() {
        Toolbar toolbar = getToolbar();
        setSupportActionBar(toolbar);
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        toolbar.setNavigationIcon(R.drawable.ic_arrow_back_white_24dp);
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_list_animation, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            finish();
        }
        return super.onOptionsItemSelected(item);
    }

    private void setupUserProfile() {

        String s = getIntent().getStringExtra("episode");
        if (s != null) {
            Episode episode = new Gson().fromJson(s, Episode.class);
            FmRepositoryImpl rpRepo = new FmRepositoryImpl(this, FirebaseConstants.RADIO_PROGRAM_TABLE);
            RadioProgram program = new RadioProgram();
            program.setRadioId(episode.getRadioId());
            program.setProgramId(episode.getProgramId());
            rpRepo.readProgramByRadioIdAndProgramId(program, new CallBack() {
                @SuppressLint("SetTextI18n")
                @Override
                public void onSuccess(Object object) {
                    try {
                        if (isCollection(object)) {
                            List<RadioProgram> programList = (List<RadioProgram>) object;
                            RadioProgram radioProgram = programList.get(0);
                            TempModel _temp = new TempModel(radioProgram.getPrName(), radioProgram.getPrDesc(), radioProgram.getPrTag(), radioProgram.getPrCategoryList().toString(), radioProgram.getPrProfile(), radioProgram.getLikesCount(), radioProgram.getSubscribeCount(), radioProgram.getEpisodeCount());
                            Tools.displayImageRound(ProgramDetailsActivity.this, ivUserProfilePhoto, _temp.imgProfile);
                            tvName.setText(_temp.name);
                            tvDesc.setText(_temp.desc);
                            tvCategory.setText(_temp.category);
//                          tvTag.setText(getResources().getString(R.string.tag_format, _temp.tag));
                            tvTag.setText(String.format("@%s", _temp.tag));
                            tvLikesCount.setText(Integer.toString(_temp.likesCount));
                            tvSubscribers.setText(Integer.toString(_temp.subScribeCount));
                            tvPostCount.setText(Integer.toString(_temp.postCount));
                            vUserStats.setVisibility(View.VISIBLE);
//                        LogUtility.e(TAG, " readProgramByRadioIdAndProgramId: " + new Gson().toJson(object) );
                        }
                    } catch (Exception e) {
                        LogUtility.e(TAG, " readProgramByRadioIdAndProgramId: " + object, e);
                    }
                }

                @Override
                public void onError(Object object) {
                    LogUtility.e(TAG, "readProgramByRadioIdAndProgramId: " + object);
                }
            });

            EpisodeRepositoryImpl ePiRepo = new EpisodeRepositoryImpl(this, FirebaseConstants.EPISODE_TABLE);
            ePiRepo.readAllEpisodeByRadioIdAndPgId(episode, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    if (isCollection(object)) {
                        detailsList = (List<Episode>) object;
                    } else {
                        detailsList = DataGenerator.getEpisodeData(ProgramDetailsActivity.this);
                    }

//                    itemAdapter.notifyDataSetChanged();
//                    itemAdapter.notifyItemRangeChanged(0,detailsList.size());
                    setupUserProfileGrid();

                    LogUtility.e(TAG, "readAllEpisodeByRadioIdAndPgId: " + new Gson().toJson(object));
                }

                @Override
                public void onError(Object object) {
                    LogUtility.e(TAG, "readAllEpisodeByRadioIdAndPgId: " + object);
                }
            });


        } else {
            detailsList = DataGenerator.getEpisodeData(this);
            itemAdapter.notifyDataSetChanged();
            // Todo show empty view
        }


    }

    private void setupTabs() {
        tlUserProfileTabs.addTab(tlUserProfileTabs.newTab().setIcon(R.drawable.ic_grid_on_white).setText(R.string.label_grid));
        tlUserProfileTabs.addTab(tlUserProfileTabs.newTab().setIcon(R.drawable.ic_list_white).setText(R.string.label_list));
//        tlUserProfileTabs.addTab(tlUserProfileTabs.newTab().setIcon(R.drawable.ic_place_white));
//        tlUserProfileTabs.addTab(tlUserProfileTabs.newTab().setIcon(R.drawable.ic_label_white));


//        this.tlUserProfileTabs.getTabAt(0).getIcon().setColorFilter(-1, PorterDuff.Mode.SRC_IN);
//        this.tlUserProfileTabs.getTabAt(1).getIcon().setColorFilter(getResources().getColor(R.color.grey_20), PorterDuff.Mode.SRC_IN);
        this.tlUserProfileTabs.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            public void onTabSelected(TabLayout.Tab tab) {
                tab.getIcon().setColorFilter(-1, PorterDuff.Mode.SRC_IN);
                switchIcon(tab.getPosition());
//                showToast(tab.getText().toString());
            }

            public void onTabUnselected(TabLayout.Tab tab) {
                tab.getIcon().setColorFilter(ProgramDetailsActivity.this.getResources().getColor(R.color.grey_20), PorterDuff.Mode.SRC_IN);
            }

            public void onTabReselected(TabLayout.Tab tab) {
            }
        });


    }


//    private void switchLayout() {
//
//        if (gridLayoutManager.getSpanCount() == SPAN_COUNT_ONE) {
//            switchIcon(1);
//            gridLayoutManager.setSpanCount(SPAN_COUNT_THREE);
//        } else {
//            switchIcon(0);
//            gridLayoutManager.setSpanCount(SPAN_COUNT_ONE);
//        }
//        itemAdapter.notifyItemRangeChanged(0, itemAdapter.getItemCount());
//    }

    private void switchIcon(int tabIndex) {
//        tlUserProfileTabs.setScrollPosition(tabIndex, 0F, true);
//        TabLayout.Tab tab = tlUserProfileTabs.getTabAt(tabIndex);
//        assert tab != null;
//        tab.select();
//        if (tabIndex == 1) {
//            gridLayoutManager.setSpanCount(SPAN_COUNT_ONE);
//        } else {
//            gridLayoutManager.setSpanCount(SPAN_COUNT_THREE);
//        }

        if (gridLayoutManager.getSpanCount() == SPAN_COUNT_ONE) {
            gridLayoutManager.setSpanCount(SPAN_COUNT_THREE);
        } else {
            gridLayoutManager.setSpanCount(SPAN_COUNT_ONE);
        }

//        tlUserProfileTabs.setScrollPosition(tabIndex, 0f, true);
        itemAdapter.notifyItemRangeChanged(0, itemAdapter.getItemCount());
    }

    private void setupUserProfileGrid() {
//        detailsList = DataGenerator.getEpisodeData(ProgramProfileActivity.this);

        gridLayoutManager = new GridLayoutManager(this, SPAN_COUNT_THREE);
        itemAdapter = new UserProfileAdapter(this, detailsList, gridLayoutManager);
        recyclerView.setAdapter(itemAdapter);
        recyclerView.setLayoutManager(gridLayoutManager);


//        layoutManager = new StaggeredGridLayoutManager(viewType, StaggeredGridLayoutManager.VERTICAL);
////        final StaggeredGridLayoutManager layoutManager = new StaggeredGridLayoutManager(CELL_SIZE, StaggeredGridLayoutManager.VERTICAL);
//        recyclerView.setLayoutManager(layoutManager);
//
//        itemAdapter = new UserProfileAdapter(ProgramProfileActivity.this, detailsList, viewType);
//        recyclerView.setAdapter(itemAdapter);
//        itemAdapter.notifyDataSetChanged();
//
//
        recyclerView.setOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override
            public void onScrollStateChanged(RecyclerView recyclerView, int newState) {
                itemAdapter.setLockedAnimations(true);
            }
        });

//        switchIcon(1);

    }

    private void setupRevealBackground(Bundle savedInstanceState) {
        vRevealBackground.setOnStateChangeListener(this);
        if (savedInstanceState == null) {
            final int[] startingLocation = getIntent().getIntArrayExtra(ARG_REVEAL_START_LOCATION);
            vRevealBackground.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
                @Override
                public boolean onPreDraw() {
                    vRevealBackground.getViewTreeObserver().removeOnPreDrawListener(this);
                    vRevealBackground.startFromLocation(startingLocation);
                    return true;
                }
            });
        } else {
            vRevealBackground.setToFinishedFrame();
            itemAdapter.setLockedAnimations(true);
        }
    }

    @Override
    public void onStateChange(int state) {
        if (RevealBackgroundView.STATE_FINISHED == state) {
            recyclerView.setVisibility(View.VISIBLE);
            tlUserProfileTabs.setVisibility(View.VISIBLE);
            vUserProfileRoot.setVisibility(View.VISIBLE);
            itemAdapter = new UserProfileAdapter(this, detailsList, gridLayoutManager);
            recyclerView.setAdapter(itemAdapter);
            animateUserProfileOptions();
            animateUserProfileHeader();
        } else {
            tlUserProfileTabs.setVisibility(View.INVISIBLE);
            recyclerView.setVisibility(View.INVISIBLE);
            vUserProfileRoot.setVisibility(View.INVISIBLE);
        }
    }

    private void animateUserProfileOptions() {
        tlUserProfileTabs.setTranslationY(-tlUserProfileTabs.getHeight());
        tlUserProfileTabs.animate().translationY(0).setDuration(300).setStartDelay(USER_OPTIONS_ANIMATION_DELAY).setInterpolator(INTERPOLATOR);
    }

    private void animateUserProfileHeader() {
        vUserProfileRoot.setTranslationY(-vUserProfileRoot.getHeight());
        ivUserProfilePhoto.setTranslationY(-ivUserProfilePhoto.getHeight());
        vUserDetails.setTranslationY(-vUserDetails.getHeight());
        vUserStats.setAlpha(0);

        vUserProfileRoot.animate().translationY(0).setDuration(300).setInterpolator(INTERPOLATOR);
        ivUserProfilePhoto.animate().translationY(0).setDuration(300).setStartDelay(100).setInterpolator(INTERPOLATOR);
        vUserDetails.animate().translationY(0).setDuration(300).setStartDelay(200).setInterpolator(INTERPOLATOR);
        vUserStats.animate().alpha(1).setDuration(200).setStartDelay(400).setInterpolator(INTERPOLATOR).start();
    }


    public static class TempModel {
        String name, desc, tag, category, imgProfile;
        int likesCount, subScribeCount, postCount;

        public TempModel() {
        }

        public TempModel(String name, String desc, String tag, String category, String imgProfile, int likesCount, int subScribeCount, int postCount) {
            this.name = name;
            this.desc = desc;
            this.tag = tag;
            this.category = category;
            this.imgProfile = imgProfile;
            this.likesCount = likesCount;
            this.subScribeCount = subScribeCount;
            this.postCount = postCount;
        }
    }


}
