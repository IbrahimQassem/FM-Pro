package com.sana.dev.fm.ui.activity;


import static com.sana.dev.fm.adapter.ProgramDetailsAdapter.SPAN_COUNT_ONE;
import static com.sana.dev.fm.adapter.ProgramDetailsAdapter.SPAN_COUNT_THREE;
import static com.sana.dev.fm.utils.FmUtilize.isCollection;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.graphics.PorterDuff;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.Interpolator;

import androidx.fragment.app.FragmentTransaction;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.tabs.TabLayout;
import com.google.gson.Gson;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.ProgramDetailsAdapter;
import com.sana.dev.fm.databinding.ProgramDetailsActivityBinding;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.model.interfaces.OnClickListener;
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

/**
 * Created by  Ibrahim on 25.03.21.
 */
public class ProgramDetailsActivity extends BaseActivity implements RevealBackgroundView.OnStateChangeListener {
    public static final int MY_PERMISSIONS_REQUEST_READ_EXTERNAL_STORAGE = 123;

    public static final String ARG_REVEAL_START_LOCATION = "reveal_start_location";
    private static final int USER_OPTIONS_ANIMATION_DELAY = 300;
    private static final Interpolator INTERPOLATOR = new DecelerateInterpolator();
    private final String TAG = ProgramDetailsActivity.class.getSimpleName();

    ProgramDetailsActivityBinding binding;

    

    //    StaggeredGridLayoutManager layoutManager;
    private GridLayoutManager gridLayoutManager;


    private ProgramDetailsAdapter itemAdapter;
    private List<Episode> detailsList = new ArrayList<>();


    public static void startUserProfileFromLocation(int[] startingLocation, Context context, Episode episode) {
        Intent intent = new Intent(context, ProgramDetailsActivity.class);
        intent.putExtra(ARG_REVEAL_START_LOCATION, startingLocation);

        String obj = (new Gson().toJson(episode));
        intent.putExtra("episode", obj);
        context.startActivity(intent);
    }


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.program_details_activity);
        binding = ProgramDetailsActivityBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);
        


        initToolbar();
        setupTabs();
        setupUserProfileGrid();
//        setupRevealBackground(savedInstanceState);
        setupProgramProfile();
    }


    private void initToolbar() {
        binding.toolbar.imbEvent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });
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

    private void setupProgramProfile() {

        String s = getIntent().getStringExtra("episode");
        if (s != null) {
            Episode episode = new Gson().fromJson(s, Episode.class);


            TempModel tempModel = new TempModel(episode.getProgramName(), "", "", "", episode.getEpProfile(), episode.getLikesCount(), 1, 0);
            updateInfoUI(tempModel);

            FmRepositoryImpl rpRepo = new FmRepositoryImpl(this, FirebaseConstants.RADIO_PROGRAM_TABLE);
            RadioProgram program = new RadioProgram();
            program.setRadioId(episode.getRadioId());
            program.setProgramId(episode.getProgramId());
            rpRepo.readProgramByRadioIdAndProgramId(program, new CallBack() {
                @SuppressLint("SetTextI18n")
                @Override
                public void onSuccess(Object object) {
                    try {
                        LogUtility.d(LogUtility.TAG, "program info : " + new Gson().toJson(object));

                        if (isCollection(object)) {
                            List<RadioProgram> programList = (List<RadioProgram>) object;
                            RadioProgram radioProgram = programList.get(0);
                            TempModel tempModel = new TempModel(radioProgram.getPrName(), radioProgram.getPrDesc(), radioProgram.getPrTag(), radioProgram.getPrCategoryList().toString(), radioProgram.getPrProfile(), radioProgram.getLikesCount(), radioProgram.getSubscribeCount(), radioProgram.getEpisodeCount());
                            updateInfoUI(tempModel);
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
                    LogUtility.d(LogUtility.TAG, "program details : " + new Gson().toJson(object));

                    if (isCollection(object)) {
                        detailsList = (List<Episode>) object;
                        ShardDate.getInstance().setEpisodeList(detailsList);
                    } /*else {
                        detailsList = DataGenerator.getEpisodeData(ProgramDetailsActivity.this);
                    }*/

//                    itemAdapter.notifyDataSetChanged();
//                    itemAdapter.notifyItemRangeChanged(0,detailsList.size());
                    setupUserProfileGrid();

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

//        detailsList = DataGenerator.getEpisodeData(this);
//        setupUserProfileGrid();
    }

    @SuppressLint("SetTextI18n")
    private void updateInfoUI(TempModel model) {
//        TempModel _temp = new TempModel(radioProgram.getPrName(), radioProgram.getPrDesc(), radioProgram.getPrTag(), radioProgram.getPrCategoryList().toString(), radioProgram.getPrProfile(), radioProgram.getLikesCount(), radioProgram.getSubscribeCount(), radioProgram.getEpisodeCount());
        Tools.displayImageRound(ProgramDetailsActivity.this, binding.ivProfilePhoto, model.imgProfile);
        binding. tvName.setText(model.name);
        binding.tvDesc.setText(model.desc);
        binding.tvCategory.setText(model.category);
//      tvTag.setText(getResources().getString(R.string.tag_format, _temp.tag));
        if (!TextUtils.isEmpty(model.tag))
            binding. tvTag.setText(String.format("@%s", model.tag));
        if (model.likesCount >= 1)
            binding.tvLikesCount.setText(Integer.toString(model.likesCount));
        if (model.subScribeCount >= 1)
            binding. tvSubscribers.setText(Integer.toString(model.subScribeCount));
        if (model.postCount >= 1)
            binding. tvPostCount.setText(Integer.toString(model.postCount));
        binding.lynStats.setVisibility(View.VISIBLE);

        binding.btnFollow.setVisibility(View.GONE);
    }

    private void setupTabs() {
        gridLayoutManager = new GridLayoutManager(this, SPAN_COUNT_ONE);

        binding.tlProfileTabs.addTab(binding.tlProfileTabs.newTab().setIcon(R.drawable.ic_grid_on_white).setText(R.string.label_grid));
        binding.tlProfileTabs.addTab(binding.tlProfileTabs.newTab().setIcon(R.drawable.ic_list_white).setText(R.string.label_list));
//        binding.tlProfileTabs.addTab(binding.tlProfileTabs.newTab().setIcon(R.drawable.ic_place_white));
//        binding.tlProfileTabs.addTab(binding.tlProfileTabs.newTab().setIcon(R.drawable.ic_label_white));


//        this.binding.tlProfileTabs.getTabAt(0).getIcon().setColorFilter(-1, PorterDuff.Mode.SRC_IN);
//        this.binding.tlProfileTabs.getTabAt(1).getIcon().setColorFilter(getResources().getColor(R.color.grey_20), PorterDuff.Mode.SRC_IN);
        this.binding.tlProfileTabs.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
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
//        binding.tlProfileTabs.setScrollPosition(tabIndex, 0F, true);
//        TabLayout.Tab tab = binding.tlProfileTabs.getTabAt(tabIndex);
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

//        binding.tlProfileTabs.setScrollPosition(tabIndex, 0f, true);
        itemAdapter.notifyItemRangeChanged(0, itemAdapter.getItemCount());
    }

    private void setupUserProfileGrid() {
//        detailsList = DataGenerator.getEpisodeData(ProgramProfileActivity.this);

        gridLayoutManager = new GridLayoutManager(this, SPAN_COUNT_THREE);
        itemAdapter = new ProgramDetailsAdapter(this, detailsList, gridLayoutManager);
        binding.recyclerView.setAdapter(itemAdapter);
        binding.recyclerView.setLayoutManager(gridLayoutManager);


//        layoutManager = new StaggeredGridLayoutManager(viewType, StaggeredGridLayoutManager.VERTICAL);
////        final StaggeredGridLayoutManager layoutManager = new StaggeredGridLayoutManager(CELL_SIZE, StaggeredGridLayoutManager.VERTICAL);
//        binding.recyclerView.setLayoutManager(layoutManager);
//
//        itemAdapter = new UserProfileAdapter(ProgramProfileActivity.this, detailsList, viewType);
//        binding.recyclerView.setAdapter(itemAdapter);
//        itemAdapter.notifyDataSetChanged();
//
//
        binding.recyclerView.setOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override
            public void onScrollStateChanged(RecyclerView rv, int newState) {
                itemAdapter.setLockedAnimations(true);
            }
        });


        itemAdapter.setOnClickListener(new OnClickListener() {
            @Override
            public void onItemClick(View view, Object model, int position) {
//                showNotCancelableWarningDialog(String.valueOf((Episode) model));
                showFragment();
//                BottomSheet bottomSheet = new BottomSheet();
//                bottomSheet.show(getSupportFragmentManager(), bottomSheet.getTag());
            }
        });

    }


    private void setupRevealBackground(Bundle savedInstanceState) {
        binding.rbv.setOnStateChangeListener(this);
        if (savedInstanceState == null) {
            final int[] startingLocation = getIntent().getIntArrayExtra(ARG_REVEAL_START_LOCATION);
            binding.rbv.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
                @Override
                public boolean onPreDraw() {
                    binding.rbv.getViewTreeObserver().removeOnPreDrawListener(this);
                    binding.rbv.startFromLocation(startingLocation);
                    return true;
                }
            });
        } else {
            binding.rbv.setToFinishedFrame();
            itemAdapter.setLockedAnimations(true);
        }
    }

    @Override
    public void onStateChange(int state) {
        if (RevealBackgroundView.STATE_FINISHED == state) {
            binding.recyclerView.setVisibility(View.VISIBLE);
            binding.tlProfileTabs.setVisibility(View.VISIBLE);
            binding.lynProfileRoot.setVisibility(View.VISIBLE);
            itemAdapter = new ProgramDetailsAdapter(this, detailsList, gridLayoutManager);
            binding.recyclerView.setAdapter(itemAdapter);
            animateUserProfileOptions();
            animateUserProfileHeader();
        } else {
            binding.tlProfileTabs.setVisibility(View.INVISIBLE);
            binding.recyclerView.setVisibility(View.INVISIBLE);
            binding.lynProfileRoot.setVisibility(View.INVISIBLE);
        }
    }

    private void animateUserProfileOptions() {
        binding.tlProfileTabs.setTranslationY(-binding.tlProfileTabs.getHeight());
        binding.tlProfileTabs.animate().translationY(0).setDuration(300).setStartDelay(USER_OPTIONS_ANIMATION_DELAY).setInterpolator(INTERPOLATOR);
    }

    private void animateUserProfileHeader() {
        binding.lynProfileRoot.setTranslationY(-binding.lynProfileRoot.getHeight());
         binding.ivProfilePhoto.setTranslationY(-binding.ivProfilePhoto.getHeight());
         binding.lynDetails.setTranslationY(-binding.lynDetails.getHeight());
       binding.lynStats.setAlpha(0);

        binding.lynProfileRoot.animate().translationY(0).setDuration(300).setInterpolator(INTERPOLATOR);
        binding.ivProfilePhoto.animate().translationY(0).setDuration(300).setStartDelay(100).setInterpolator(INTERPOLATOR);
        binding.lynDetails.animate().translationY(0).setDuration(300).setStartDelay(200).setInterpolator(INTERPOLATOR);
        binding.lynStats.animate().alpha(1).setDuration(200).setStartDelay(400).setInterpolator(INTERPOLATOR).start();
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

    private final static String TAG_FRAGMENT = SongPlayerFragment.class.getSimpleName();

    private void showFragment() {
        final SongPlayerFragment fragment = new SongPlayerFragment();
        final FragmentTransaction transaction = getSupportFragmentManager().beginTransaction();
        transaction.replace(R.id.co_content, fragment, TAG_FRAGMENT);
        transaction.addToBackStack(null);
        transaction.commit();
    }


}
