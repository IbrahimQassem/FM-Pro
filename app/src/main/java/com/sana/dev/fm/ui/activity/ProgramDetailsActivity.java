package com.sana.dev.fm.ui.activity;

import static com.sana.dev.fm.adapter.ProgramDetailsAdapter.SPAN_COUNT_ONE;
import static com.sana.dev.fm.adapter.ProgramDetailsAdapter.SPAN_COUNT_THREE;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.webkit.URLUtil;

import androidx.annotation.NonNull;
import androidx.fragment.app.FragmentTransaction;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.tabs.TabLayout;
import com.google.firebase.firestore.CollectionReference;
import com.google.gson.Gson;
import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.ProgramDetailsAdapter;
import com.sana.dev.fm.data.datasource.LocalSeedEpisodeDataSource;
import com.sana.dev.fm.databinding.ProgramDetailsActivityBinding;
import com.sana.dev.fm.domain.ranking.PriorityRankingEngine;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.model.TempEpModel;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.ui.activity.player.SongPlayerFragment;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.KProgressHUDHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;

import java.util.ArrayList;
import java.util.List;

/**
 * Modernized Station / Program Profile & Episodes Activity.
 * Material 3, RTL-first UX, Live Stream player, and dual-tab navigation.
 */
public class ProgramDetailsActivity extends BaseActivity {
    public static final String ARG_REVEAL_START_LOCATION = "reveal_start_location";
    private static final String TAG = "ProgramDetailsActivity";

    private ProgramDetailsActivityBinding binding;
    private GridLayoutManager gridLayoutManager;
    private ProgramDetailsAdapter itemAdapter;
    private List<Episode> detailsList = new ArrayList<>();
    private KProgressHUDHelper kProgressHUDHelper;
    private Episode currentEpisode;
    private boolean isGridView = true;

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
        binding = ProgramDetailsActivityBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        kProgressHUDHelper = new KProgressHUDHelper(this);

        initToolbar();
        setupTabs();
        setupUserProfileGrid();
        setupProgramProfile();
    }

    private void initToolbar() {
        if (binding.imbBack != null) {
            binding.imbBack.setOnClickListener(v -> finish());
        }

        if (binding.btnViewMode != null) {
            binding.btnViewMode.setOnClickListener(v -> toggleViewMode());
        }

        if (binding.btnShare != null) {
            binding.btnShare.setOnClickListener(v -> {
                if (currentEpisode != null) {
                    String shareText = currentEpisode.getProgramName() != null ? currentEpisode.getProgramName() : currentEpisode.getEpName();
                    if (shareText == null || shareText.isEmpty()) {
                        shareText = getString(R.string.app_name);
                    }
                    Intent sendIntent = new Intent();
                    sendIntent.setAction(Intent.ACTION_SEND);
                    sendIntent.putExtra(Intent.EXTRA_TEXT, shareText + "\n" + getString(R.string.app_name));
                    sendIntent.setType("text/plain");
                    startActivity(Intent.createChooser(sendIntent, getString(R.string.share_with)));
                }
            });
        }
    }

    private void toggleViewMode() {
        isGridView = !isGridView;
        if (isGridView) {
            gridLayoutManager.setSpanCount(SPAN_COUNT_THREE);
            if (binding.btnViewMode != null) {
                binding.btnViewMode.setImageResource(R.drawable.ic_list_white);
            }
        } else {
            gridLayoutManager.setSpanCount(SPAN_COUNT_ONE);
            if (binding.btnViewMode != null) {
                binding.btnViewMode.setImageResource(R.drawable.ic_grid_on_white);
            }
        }
        if (itemAdapter != null) {
            itemAdapter.notifyItemRangeChanged(0, itemAdapter.getItemCount());
        }
    }

    private void setupTabs() {
        binding.tlProfileTabs.removeAllTabs();
        binding.tlProfileTabs.addTab(binding.tlProfileTabs.newTab().setText(R.string.tab_episodes));
        binding.tlProfileTabs.addTab(binding.tlProfileTabs.newTab().setText(R.string.tab_about_station));

        binding.tlProfileTabs.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                if (tab.getPosition() == 0) {
                    binding.recyclerView.setVisibility(View.VISIBLE);
                    binding.lynAboutContainer.setVisibility(View.GONE);
                    if (binding.btnViewMode != null) {
                        binding.btnViewMode.setVisibility(View.VISIBLE);
                    }
                } else {
                    binding.recyclerView.setVisibility(View.GONE);
                    binding.lynAboutContainer.setVisibility(View.VISIBLE);
                    if (binding.btnViewMode != null) {
                        binding.btnViewMode.setVisibility(View.GONE);
                    }
                }
            }

            @Override
            public void onTabUnselected(TabLayout.Tab tab) {
            }

            @Override
            public void onTabReselected(TabLayout.Tab tab) {
            }
        });
    }

    private void setupUserProfileGrid() {
        gridLayoutManager = new GridLayoutManager(this, isGridView ? SPAN_COUNT_THREE : SPAN_COUNT_ONE);
        itemAdapter = new ProgramDetailsAdapter(this, detailsList, gridLayoutManager);
        binding.recyclerView.setAdapter(itemAdapter);
        binding.recyclerView.setLayoutManager(gridLayoutManager);

        itemAdapter.setOnClickListener(new OnClickListener<Episode>() {
            @Override
            public void onItemClick(View view, Episode model, int position) {
                if (model != null && URLUtil.isValidUrl(model.getEpStreamUrl())) {
                    showPlayerFragment(model);
                } else {
                    showToast(getString(R.string.error_episode_audio_not_available));
                }
            }
        });
    }

    private void setupProgramProfile() {
        String s = getIntent().getStringExtra("episode");
        if (s != null) {
            Episode parsed = new Gson().fromJson(s, Episode.class);
            currentEpisode = parsed != null ? parsed : new Episode();

            String title = currentEpisode.getProgramName();
            if (TextUtils.isEmpty(title) || "null".equalsIgnoreCase(title)) {
                title = currentEpisode.getEpName();
            }
            if (TextUtils.isEmpty(title) || "null".equalsIgnoreCase(title)) {
                title = getString(R.string.app_name);
            }
            if (binding.tvToolbarTitle != null) {
                binding.tvToolbarTitle.setText(title);
            }

            TempEpModel initialModel = new TempEpModel(
                    title,
                    currentEpisode.getEpDesc(),
                    currentEpisode.getRadioId() != null ? currentEpisode.getRadioId() : "",
                    "",
                    currentEpisode.getEpProfile(),
                    Math.max(1, currentEpisode.getLikesCount()),
                    Math.max(1, currentEpisode.getFavCount()),
                    1
            );
            updateInfoUI(initialModel);

            // Wire Play Live button
            binding.btnPlayLive.setOnClickListener(v -> {
                if (currentEpisode != null && URLUtil.isValidUrl(currentEpisode.getEpStreamUrl())) {
                    showPlayerFragment(currentEpisode);
                } else {
                    showToast(getString(R.string.error_episode_audio_not_available));
                }
            });

            // Populate About tab texts
            binding.tvAboutDesc.setText(!TextUtils.isEmpty(currentEpisode.getEpDesc()) ? currentEpisode.getEpDesc() : getString(R.string.label_station_info));
            binding.tvAboutFrequency.setText(getString(R.string.label_tag) + " • " + (currentEpisode.getRadioId() != null ? currentEpisode.getRadioId() : "FM"));
            binding.tvAboutSchedule.setText(getString(R.string.label_schedule_table) + ": " + FmUtilize.arabicFormat);

            // Fetch from Firestore
            FirestoreDbUtility firestoreDbUtility = new FirestoreDbUtility();
            String programId = currentEpisode.getProgramId() != null ? currentEpisode.getProgramId() : "";

            if (!programId.isEmpty()) {
                CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection()
                        .document(AppConstant.Firebase.PROGRAMS_COLLECTION)
                        .collection(AppConstant.Firebase.PROGRAMS_COLLECTION);

                firestoreDbUtility.getOne(collectionReference, programId, new CallBack() {
                    @Override
                    public void onSuccess(Object object) {
                        try {
                            List<RadioProgram> programList = FirestoreDbUtility.getDataFromQuerySnapshot(object, RadioProgram.class);
                            if (programList != null && !programList.isEmpty()) {
                                RadioProgram radioProgram = programList.get(0);
                                String prName = radioProgram.getPrName();
                                if (TextUtils.isEmpty(prName) || "null".equalsIgnoreCase(prName)) {
                                    prName = currentEpisode.getEpName();
                                }
                                String categories = radioProgram.getPrCategoryList() != null ? TextUtils.join(" • ", radioProgram.getPrCategoryList()) : "";
                                String profileImg = !TextUtils.isEmpty(radioProgram.getPrProfile()) ? radioProgram.getPrProfile() : currentEpisode.getEpProfile();
                                TempEpModel updatedModel = new TempEpModel(
                                        prName,
                                        radioProgram.getPrDesc(),
                                        radioProgram.getPrTag(),
                                        categories,
                                        profileImg,
                                        Math.max(1, radioProgram.getLikesCount()),
                                        Math.max(1, radioProgram.getSubscribeCount()),
                                        Math.max(1, radioProgram.getEpisodeCount())
                                );
                                updateInfoUI(updatedModel);
                                binding.tvAboutDesc.setText(radioProgram.getPrDesc());
                            }
                        } catch (Exception e) {
                            LogUtility.d(TAG, "Error parsing program: " + e.getMessage());
                        }
                    }

                    @Override
                    public void onFailure(Object object) {
                        LogUtility.e(TAG, "loadProgram failure: " + object);
                    }
                });
            }

            CollectionReference collectionReferenceE = firestoreDbUtility.getTopLevelCollection()
                    .document(AppConstant.Firebase.EPISODES_COLLECTION)
                    .collection(AppConstant.Firebase.EPISODES_COLLECTION);

            collectionReferenceE.get().addOnSuccessListener(queryDocumentSnapshots -> {
                List<Episode> episodeList = new ArrayList<>();
                if (queryDocumentSnapshots != null && !queryDocumentSnapshots.isEmpty()) {
                    for (com.google.firebase.firestore.DocumentSnapshot doc : queryDocumentSnapshots.getDocuments()) {
                        Episode ep = doc.toObject(Episode.class);
                        if (ep == null) ep = new Episode();
                        if (ep.getEpId() == null || ep.getEpId().isEmpty()) ep.setEpId(doc.getId());
                        if (ep.getEpName() == null || ep.getEpName().isEmpty()) ep.setEpName(doc.getString("title"));
                        if (ep.getEpDesc() == null || ep.getEpDesc().isEmpty()) ep.setEpDesc(doc.getString("description"));
                        if (ep.getEpProfile() == null || ep.getEpProfile().isEmpty()) ep.setEpProfile(doc.getString("coverUrl"));
                        if (ep.getEpStreamUrl() == null || ep.getEpStreamUrl().isEmpty()) ep.setEpStreamUrl(doc.getString("audioUrl"));

                        if (programId.isEmpty() || programId.equals(ep.getProgramId())) {
                            if (!ep.isDisabled()) {
                                episodeList.add(ep);
                            }
                        }
                    }
                }

                if (episodeList.isEmpty() && BuildConfig.DEBUG) {
                    episodeList = LocalSeedEpisodeDataSource.loadSeedEpisodes(ProgramDetailsActivity.this, currentEpisode.getRadioId());
                }

                episodeList = PriorityRankingEngine.sortEpisodes(episodeList);
                ShardDate.getInstance().setEpisodeList(episodeList);
                detailsList = episodeList;
                setupUserProfileGrid();
                binding.tvPostCount.setText(String.valueOf(Math.max(1, episodeList.size())));
            }).addOnFailureListener(e -> {
                LogUtility.e(TAG, "loadEpisodes failure: " + e.getMessage());
                if (BuildConfig.DEBUG) {
                    List<Episode> seedList = LocalSeedEpisodeDataSource.loadSeedEpisodes(ProgramDetailsActivity.this, currentEpisode.getRadioId());
                    seedList = PriorityRankingEngine.sortEpisodes(seedList);
                    detailsList = seedList;
                    setupUserProfileGrid();
                    binding.tvPostCount.setText(String.valueOf(Math.max(1, seedList.size())));
                }
            });
        }
    }

    @SuppressLint("SetTextI18n")
    private void updateInfoUI(TempEpModel model) {
        String imgUrl = model.getImgProfile();
        Tools.displayUserProfile(this, binding.imgProfile, imgUrl, R.mipmap.ic_launcher_foreground);

        String name = model.getName();
        if (TextUtils.isEmpty(name) || "null".equalsIgnoreCase(name)) {
            name = getString(R.string.app_name);
        }
        binding.tvName.setText(name);
        if (binding.tvToolbarTitle != null) {
            binding.tvToolbarTitle.setText(name);
        }

        String desc = model.getDesc();
        if (!TextUtils.isEmpty(desc) && !"null".equalsIgnoreCase(desc)) {
            binding.tvDesc.setText(desc);
            binding.tvDesc.setVisibility(View.VISIBLE);
        } else {
            binding.tvDesc.setVisibility(View.GONE);
        }

        String cat = model.getCategory();
        if (!TextUtils.isEmpty(cat) && !"null".equalsIgnoreCase(cat) && !"[]".equals(cat)) {
            binding.tvCategory.setText(cat);
            binding.tvCategory.setVisibility(View.VISIBLE);
        } else {
            binding.tvCategory.setVisibility(View.GONE);
        }

        if (!TextUtils.isEmpty(model.getTag()) && !"null".equalsIgnoreCase(model.getTag())) {
            binding.tvTag.setText(model.getTag());
            binding.tvTag.setVisibility(View.VISIBLE);
        } else {
            binding.tvTag.setText(getString(R.string.label_live_badge));
            binding.tvTag.setVisibility(View.VISIBLE);
        }

        binding.tvLikesCount.setText(formatCount(model.getLikesCount()));
        binding.tvSubscribers.setText(formatCount(model.getSubScribeCount()));
        binding.tvPostCount.setText(formatCount(model.getPostCount()));
    }

    private String formatCount(int count) {
        if (count >= 1000) {
            return String.format(java.util.Locale.US, "%.1fK", count / 1000.0);
        }
        return String.valueOf(Math.max(1, count));
    }

    private static final String TAG_FRAGMENT = SongPlayerFragment.class.getSimpleName();

    private void showPlayerFragment(Episode episode) {
        final SongPlayerFragment fragment = new SongPlayerFragment();
        final FragmentTransaction transaction = getSupportFragmentManager().beginTransaction();
        transaction.replace(R.id.co_content, fragment, TAG_FRAGMENT);
        transaction.addToBackStack(null);
        transaction.commit();
    }
}
