package com.sana.dev.fm.ui.fragment;

import static com.sana.dev.fm.utils.FmUtilize.safeList;

import android.content.Context;
import android.os.Bundle;
import android.text.Html;
import android.text.SpannableString;
import android.text.SpannableStringBuilder;
import android.text.style.ForegroundColorSpan;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.TimeLineAdapter;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.TempEpisodeModel;
import com.sana.dev.fm.model.enums.Weekday;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.ui.widget.StateLayout;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.WeekdayUtils;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Fragment displaying today's schedule / episodes for the currently active radio station.
 */
public class DailyEpisodeFragment extends BaseFragment {
    private static final String TAG = "DailyEpisodeFragment";

    private View rootView;
    private Context ctx;
    private FrameLayout cf_container;
    private StateLayout stateLayout;
    private RecyclerView recyclerView;
    private TextView tvTittle;

    public DailyEpisodeFragment() {
        // Required empty public constructor
    }

    public static DailyEpisodeFragment newInstance() {
        return new DailyEpisodeFragment();
    }

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        rootView = inflater.inflate(R.layout.fragment_radio_map, container, false);

        cf_container = rootView.findViewById(R.id.child_fragment_container);
        stateLayout = rootView.findViewById(R.id.state_layout);
        recyclerView = rootView.findViewById(R.id.recyclerView);
        tvTittle = rootView.findViewById(R.id.tvTittle);

        if (isRadioSelected()) {
            loadDailyEpisode(prefMgr.selectedRadio().getRadioId());
        }

        return rootView;
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        EmptyViewFragment emptyViewFragment = EmptyViewFragment.newInstance(
                ctx != null ? ctx.getString(R.string.no_data_available) : "",
                getString(R.string.brows_more_station),
                getString(R.string.label_main_screen)
        );
        FragmentTransaction transaction = getChildFragmentManager().beginTransaction();
        transaction.replace(R.id.child_fragment_container, emptyViewFragment).commit();
        emptyViewFragment.setOnItemClickListener(new CallBackListener() {
            @Override
            public void onCallBack() {
                if (getActivity() instanceof MainActivity) {
                    ((MainActivity) getActivity()).selectTab(R.id.navigation_home);
                }
            }
        });

        toggleView(true);
    }

    private void loadDailyEpisode(String radioId) {
        try {
            SpannableStringBuilder builder = new SpannableStringBuilder();
            RadioInfo selectedRadio = prefMgr.selectedRadio();
            String primary = (selectedRadio != null && selectedRadio.getName() != null) ? selectedRadio.getName() : " ";
            SpannableString primarySpannable = new SpannableString(Html.fromHtml("<b>" + primary + "</b>"));
            primarySpannable.setSpan(new ForegroundColorSpan(getResources().getColor(R.color.colorPrimary)), 0, primary.length(), 0);
            builder.append(primarySpannable);

            String black = (ctx != null ? ctx.getResources().getString(R.string.episode_daily, "") : "");
            SpannableString whiteSpannable = new SpannableString(black);
            whiteSpannable.setSpan(new ForegroundColorSpan(getResources().getColor(R.color.grey_40)), 0, black.length(), 0);
            builder.append(whiteSpannable);

            String blue = " " + FmUtilize.getDayName(new Date());
            SpannableString blueSpannable = new SpannableString(blue);
            blueSpannable.setSpan(new ForegroundColorSpan(getResources().getColor(R.color.grey_700)), 0, blue.length(), 0);
            builder.append(blueSpannable);

            if (tvTittle != null) {
                tvTittle.setText(builder, TextView.BufferType.SPANNABLE);
            }
        } catch (Exception e) {
            LogUtility.e(TAG, "Error updating title: " + e.getMessage());
        }

        if (stateLayout != null) {
            stateLayout.showLoading();
        }

        String baseDb = BuildConfig.BASE_FB_DB;
        CollectionReference collectionRef = FirebaseFirestore.getInstance()
                .collection(baseDb)
                .document(AppConstant.Firebase.EPISODES_COLLECTION)
                .collection(AppConstant.Firebase.EPISODES_COLLECTION);

        collectionRef.get().addOnSuccessListener(queryDocumentSnapshots -> {
            List<Episode> episodeList = new ArrayList<>();
            if (queryDocumentSnapshots != null && !queryDocumentSnapshots.isEmpty()) {
                for (DocumentSnapshot doc : queryDocumentSnapshots.getDocuments()) {
                    try {
                        Episode ep = doc.toObject(Episode.class);
                        if (ep != null) {
                            if (ep.getEpId() == null || ep.getEpId().isEmpty()) {
                                ep.setEpId(doc.getId());
                            }
                            // Filter by station if specified
                            if (radioId == null || radioId.trim().isEmpty() || radioId.equals(ep.getRadioId())) {
                                if (!ep.isDisabled()) {
                                    episodeList.add(ep);
                                }
                            }
                        }
                    } catch (Exception e) {
                        LogUtility.w(TAG, "Could not parse episode doc: " + doc.getId() + " - " + e.getMessage());
                    }
                }
            }

            if (episodeList.isEmpty() && BuildConfig.DEBUG) {
                episodeList = com.sana.dev.fm.data.datasource.LocalSeedEpisodeDataSource.loadSeedEpisodes(ctx, radioId);
            }

            List<TempEpisodeModel> modelList = new ArrayList<>();
            Weekday currentWeekday = WeekdayUtils.getCurrentDayOfWeek();

            for (Episode ep : episodeList) {
                List<DateTimeModel> shTimeList = ep.getShowTimeList();
                boolean addedFromSchedule = false;
                if (shTimeList != null && !shTimeList.isEmpty()) {
                    for (DateTimeModel timeModel : shTimeList) {
                        if (timeModel != null) {
                            List<Weekday> weekdays = safeList(timeModel.getWeekdays());
                            for (Weekday item : weekdays) {
                                if (WeekdayUtils.isCurrentDay(item)) {
                                    modelList.add(new TempEpisodeModel(ep.getEpProfile(), ep.getEpName(), ep.getEpAnnouncer(), timeModel, item));
                                    addedFromSchedule = true;
                                }
                            }
                        }
                    }
                }

                // Fallback: if no showTimeList is present, add the episode directly for today
                if (!addedFromSchedule) {
                    modelList.add(new TempEpisodeModel(ep.getEpProfile(), ep.getEpName(), ep.getEpAnnouncer(), ep.getProgramScheduleTime(), currentWeekday));
                }
            }

            boolean hasEpisodes = !modelList.isEmpty();
            if (hasEpisodes) {
                if (stateLayout != null) {
                    stateLayout.showContent();
                }
                if (recyclerView != null && ctx != null) {
                    recyclerView.setLayoutManager(new LinearLayoutManager(ctx));
                    TimeLineAdapter adapter = new TimeLineAdapter(ctx, modelList);
                    recyclerView.setAdapter(adapter);
                }
                toggleView(false);
            } else {
                if (stateLayout != null) {
                    stateLayout.showEmpty(getString(R.string.no_data_available), getString(R.string.brows_more_station), () -> {
                        if (getActivity() instanceof MainActivity) {
                            ((MainActivity) getActivity()).selectTab(R.id.navigation_home);
                        }
                    });
                }
                toggleView(true);
            }
        }).addOnFailureListener(e -> {
            LogUtility.e(TAG, "Error fetching daily episodes: " + e.getMessage());
            if (BuildConfig.DEBUG) {
                List<Episode> seedEpisodes = com.sana.dev.fm.data.datasource.LocalSeedEpisodeDataSource.loadSeedEpisodes(ctx, radioId);
                List<TempEpisodeModel> modelList = new ArrayList<>();
                Weekday currentWeekday = WeekdayUtils.getCurrentDayOfWeek();
                for (Episode ep : seedEpisodes) {
                    modelList.add(new TempEpisodeModel(ep.getEpProfile(), ep.getEpName(), ep.getEpAnnouncer(), ep.getProgramScheduleTime(), currentWeekday));
                }
                if (!modelList.isEmpty() && recyclerView != null && ctx != null) {
                    if (stateLayout != null) stateLayout.showContent();
                    recyclerView.setLayoutManager(new LinearLayoutManager(ctx));
                    TimeLineAdapter adapter = new TimeLineAdapter(ctx, modelList);
                    recyclerView.setAdapter(adapter);
                    toggleView(false);
                    return;
                }
            }
            if (stateLayout != null) {
                stateLayout.showError(getString(R.string.an_error_occurred), null, () -> loadDailyEpisode(radioId));
            }
            toggleView(true);
        });
    }

    @Override
    public void onAttach(@NonNull Context context) {
        super.onAttach(context);
        this.ctx = context;
    }

    public void refresh() {
        if (isRadioSelected() && prefMgr.selectedRadio() != null) {
            loadDailyEpisode(prefMgr.selectedRadio().getRadioId());
        }
    }

    void toggleView(boolean hide) {
        if (recyclerView != null) {
            recyclerView.setVisibility(!hide ? View.VISIBLE : View.GONE);
        }
        if (cf_container != null) {
            cf_container.setVisibility(hide ? View.VISIBLE : View.GONE);
        }
    }
}
