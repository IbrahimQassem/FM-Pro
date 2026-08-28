package com.sana.dev.fm.ui.fragment;

import static com.sana.dev.fm.adapter.ProgramDetailsAdapter.SPAN_COUNT_ONE;
import static com.sana.dev.fm.adapter.ProgramDetailsAdapter.SPAN_COUNT_THREE;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.URLUtil;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.GridLayoutManager;

import com.google.android.material.tabs.TabLayout;
import com.google.firebase.firestore.CollectionReference;
import com.google.gson.Gson;
import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.ProgramDetailsAdapter;
import com.sana.dev.fm.core.navigation.AppNavigator;
import com.sana.dev.fm.data.datasource.LocalSeedEpisodeDataSource;
import com.sana.dev.fm.databinding.ProgramDetailsActivityBinding;
import com.sana.dev.fm.domain.ranking.PriorityRankingEngine;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.model.TempEpModel;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;

import java.util.ArrayList;
import java.util.List;

/**
 * In-Shell Fragment displaying Station / Program Profile and Episodes.
 * Fully integrated with Single-Activity Shell, Media3 Playback, and RTL UX.
 */
public class ProgramDetailsFragment extends BaseFragment {
    private static final String TAG = "ProgramDetailsFragment";
    public static final String ARG_EPISODE_JSON = "arg_episode_json";
    public static final String ARG_RADIO_ID = "arg_radio_id";
    public static final String ARG_PROGRAM_ID = "arg_program_id";
    public static final String ARG_PROGRAM_TITLE = "arg_program_title";

    private ProgramDetailsActivityBinding binding;
    private GridLayoutManager gridLayoutManager;
    private ProgramDetailsAdapter itemAdapter;
    private List<Episode> detailsList = new ArrayList<>();
    private Episode currentEpisode;
    private boolean isGridView = true;

    public static ProgramDetailsFragment newInstance(@NonNull Episode episode) {
        ProgramDetailsFragment fragment = new ProgramDetailsFragment();
        Bundle args = new Bundle();
        args.putString(ARG_EPISODE_JSON, new Gson().toJson(episode));
        fragment.setArguments(args);
        return fragment;
    }

    public static ProgramDetailsFragment newInstance(@Nullable String radioId, @Nullable String programId, @Nullable String title) {
        ProgramDetailsFragment fragment = new ProgramDetailsFragment();
        Bundle args = new Bundle();
        args.putString(ARG_RADIO_ID, radioId);
        args.putString(ARG_PROGRAM_ID, programId);
        args.putString(ARG_PROGRAM_TITLE, title);
        fragment.setArguments(args);
        return fragment;
    }

    public ProgramDetailsFragment() {
        // Required empty public constructor
    }

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        binding = ProgramDetailsActivityBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        initToolbar();
        setupTabs();
        setupUserProfileGrid();
        setupProgramProfile();
    }

    private void initToolbar() {
        if (binding.imbBack != null) {
            binding.imbBack.setOnClickListener(v -> {
                if (getActivity() instanceof AppNavigator) {
                    ((AppNavigator) getActivity()).navigateBack();
                } else if (getActivity() != null) {
                    getActivity().onBackPressed();
                }
            });
        }

        if (binding.btnViewMode != null) {
            binding.btnViewMode.setOnClickListener(v -> toggleViewMode());
        }

        if (binding.btnShare != null) {
            binding.btnShare.setOnClickListener(v -> {
                if (currentEpisode != null && getContext() != null) {
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
        if (getContext() == null) return;
        gridLayoutManager = new GridLayoutManager(requireContext(), isGridView ? SPAN_COUNT_THREE : SPAN_COUNT_ONE);
        itemAdapter = new ProgramDetailsAdapter(requireContext(), detailsList, gridLayoutManager);
        binding.recyclerView.setAdapter(itemAdapter);
        binding.recyclerView.setLayoutManager(gridLayoutManager);

        itemAdapter.setOnClickListener(new OnClickListener<Episode>() {
            @Override
            public void onItemClick(View view, Episode model, int position) {
                if (model != null && URLUtil.isValidUrl(model.getEpStreamUrl())) {
                    triggerPlayback(model);
                } else {
                    showToast(getString(R.string.error_episode_audio_not_available));
                }
            }
        });
    }

    private void triggerPlayback(Episode episode) {
        if (getActivity() instanceof AppNavigator) {
            ((AppNavigator) getActivity()).openPlayerSheet(episode);
        } else {
            showToast(getString(R.string.action_play_stream));
        }
    }

    private void setupProgramProfile() {
        Bundle args = getArguments();
        String json = args != null ? args.getString(ARG_EPISODE_JSON) : null;

        if (json != null) {
            Episode parsed = new Gson().fromJson(json, Episode.class);
            currentEpisode = parsed != null ? parsed : new Episode();
        } else if (args != null) {
            currentEpisode = new Episode();
            currentEpisode.setRadioId(args.getString(ARG_RADIO_ID, ""));
            currentEpisode.setProgramId(args.getString(ARG_PROGRAM_ID, ""));
            currentEpisode.setProgramName(args.getString(ARG_PROGRAM_TITLE, ""));
        } else {
            currentEpisode = new Episode();
        }

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
                triggerPlayback(currentEpisode);
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

            if (episodeList.isEmpty() && BuildConfig.DEBUG && getContext() != null) {
                episodeList = LocalSeedEpisodeDataSource.loadSeedEpisodes(requireContext(), currentEpisode.getRadioId());
            }

            episodeList = PriorityRankingEngine.sortEpisodes(episodeList);
            ShardDate.getInstance().setEpisodeList(episodeList);
            detailsList = episodeList;
            setupUserProfileGrid();
            binding.tvPostCount.setText(String.valueOf(Math.max(1, episodeList.size())));
        }).addOnFailureListener(e -> {
            LogUtility.e(TAG, "loadEpisodes failure: " + e.getMessage());
            if (BuildConfig.DEBUG && getContext() != null) {
                List<Episode> seedList = LocalSeedEpisodeDataSource.loadSeedEpisodes(requireContext(), currentEpisode.getRadioId());
                seedList = PriorityRankingEngine.sortEpisodes(seedList);
                detailsList = seedList;
                setupUserProfileGrid();
                binding.tvPostCount.setText(String.valueOf(Math.max(1, seedList.size())));
            }
        });
    }

    @SuppressLint("SetTextI18n")
    private void updateInfoUI(TempEpModel model) {
        if (getContext() == null) return;
        String imgUrl = model.getImgProfile();
        Tools.displayUserProfile(requireContext(), binding.imgProfile, imgUrl, R.mipmap.ic_launcher_foreground);

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

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
