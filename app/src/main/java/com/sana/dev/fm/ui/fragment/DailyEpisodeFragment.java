package com.sana.dev.fm.ui.fragment;


import static com.sana.dev.fm.utils.FmUtilize.safeList;

import android.os.Bundle;
import android.text.Html;
import android.text.SpannableString;
import android.text.SpannableStringBuilder;
import android.text.style.ForegroundColorSpan;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;
import androidx.recyclerview.widget.DividerItemDecoration;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.firebase.firestore.CollectionReference;
import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.TimeLineAdapter;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.TempEpisodeModel;
import com.sana.dev.fm.model.enums.UserType;
import com.sana.dev.fm.model.enums.Weekday;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.ui.activity.ProgramDetailsActivity;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.WeekdayUtils;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQuery;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQueryConditionCode;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * A simple {@link Fragment} subclass.
 * Use the {@link DailyEpisodeFragment} factory method to
 * create an instance of this fragment.
 */
public class DailyEpisodeFragment extends BaseFragment {
    private static final String TAG = DailyEpisodeFragment.class.getSimpleName();
    RecyclerView recyclerView;
    TextView tvTittle;
    FrameLayout cf_container;
    private FirestoreDbUtility firestoreDbUtility;
    private List<TempEpisodeModel> programs = new ArrayList<>();
    private TimeLineAdapter adapter;
    private SwipeRefreshLayout swipeRefreshLayout;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        programs = new ArrayList<>();
        firestoreDbUtility = new FirestoreDbUtility();
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_programs, container, false);
        initializeViews(view);
        setupRecyclerView();
//        setupSearchView();
        setupSwipeRefresh();
        loadDailyPrograms();
        return view;
    }

    @Override
    public void onViewCreated(View view, Bundle savedInstanceState) {
        EmptyViewFragment emptyViewFragment = EmptyViewFragment.newInstance(requireActivity().getString(R.string.no_data_available), getString(R.string.brows_more_station), getString(R.string.label_main_screen));
        FragmentTransaction transaction = getChildFragmentManager().beginTransaction();
        transaction.replace(cf_container.getId(), emptyViewFragment).commit();
        emptyViewFragment.setOnItemClickListener(new CallBackListener() {
            @Override
            public void onCallBack() {
                if ((MainActivity) mActivity != null)
                    ((MainActivity) mActivity).selectTab(R.id.navigation_home);
            }
        });

        toggleView(true);
    }

    private void initializeViews(View view) {
        recyclerView = view.findViewById(R.id.programsRecyclerView);
        tvTittle = view.findViewById(R.id.tvTittle);
//        searchView = view.findViewById(R.id.programSearchView);
        swipeRefreshLayout = view.findViewById(R.id.swipeRefreshLayout);
        cf_container = view.findViewById(R.id.child_fragment_container);
    }

    private void toggleView(boolean hide) {
        recyclerView.setVisibility(!hide ? View.VISIBLE : View.GONE);
        swipeRefreshLayout.setVisibility(!hide ? View.VISIBLE : View.GONE);
        cf_container.setVisibility(hide ? View.VISIBLE : View.GONE);
    }

    private void setupRecyclerView() {
//        adapter = new AdapterMainProgram(programs, this::onProgramClick);
        adapter = new TimeLineAdapter(requireActivity(), programs);

        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        recyclerView.setAdapter(adapter);
        recyclerView.addItemDecoration(new DividerItemDecoration(getContext(), DividerItemDecoration.VERTICAL));

//        adapter.setOnItemClickListener(this::onProgramClick);
//        adapter.setOnLongItemClickListener(this::OnItemLongClick);
    }


    private void onProgramClick(View view, Object obj, int position) {
        RadioProgram item = (RadioProgram) obj;
        if (BuildConfig.FLAVOR.equals("internews") || BuildConfig.FLAVOR.equals("hudhud_fm") || (BuildConfig.FLAVOR.equals("hudhudfm_google_play") && BuildConfig.DEBUG)) {
            Episode episode = new Episode();
            episode.setRadioId(item.getRadioId());
            episode.setProgramId(item.getProgramId());
            int[] startingLocation = new int[2];
            view.getLocationOnScreen(startingLocation);
            startingLocation[0] += view.getWidth() / 2;
            ProgramDetailsActivity.startUserProfileFromLocation(startingLocation, mActivity, episode);
            mActivity.overridePendingTransition(0, 0);
//                                showToast("is : "+radioProgram.getPrName());
        }
//                                switch (v.getId()) {
//                                    case R.id.bt_toggle:
//                                        break;
//                                    default:return;
//                                }
    }

    private void OnItemLongClick(View view, Object obj, int position) {
        RadioProgram item = (RadioProgram) obj;
        if (isAccountSignedIn() && prefMgr.getUserSession().getUserType() == UserType.SuperADMIN) {
            ModelConfig config = new ModelConfig(R.drawable.ic_info, getString(R.string.label_warning), getString(R.string.confirm_delete, item.getPrName()), new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                @Override
                public void onClick(View v) {

                    CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.RADIO_PROGRAM_TABLE, getSelectedRadio().getRadioId()).document(AppConstant.Firebase.RADIO_PROGRAM_TABLE).collection(AppConstant.Firebase.RADIO_PROGRAM_TABLE);
                    firestoreDbUtility.deleteDocument(collectionReference, item.getProgramId(), new CallBack() {
                        @Override
                        public void onSuccess(Object object) {
                            showToast(getString(R.string.deleted_successfully_with_param, item.getPrName()));
//                                                    mAdapter.removeAt(position);
                            programs.remove(position);
                            adapter.notifyDataSetChanged();
//                                                    mAdapter.notifyItemRangeRemoved(position, itemList.size());
                        }

                        @Override
                        public void onFailure(Object object) {
                            showToast(getString(R.string.label_error_occurred_with_val, object));
                        }
                    });
                }
            }));
            showWarningDialog(config);
        }
    }

//    private void setupSearchView() {
//        searchView.setOnQueryTextListener(new SearchView.OnQueryTextListener() {
//            @Override
//            public boolean onQueryTextSubmit(String query) {
//                filterPrograms(query);
//                return true;
//            }
//
//            @Override
//            public boolean onQueryTextChange(String newText) {
//                filterPrograms(newText);
//                return true;
//            }
//        });
//    }

    private void setupSwipeRefresh() {
        swipeRefreshLayout.setOnRefreshListener(this::refreshPrograms);
        swipeRefreshLayout.setColorSchemeResources(
                R.color.refresh_color_1,
                R.color.refresh_color_2,
                R.color.refresh_color_3
        );
    }

    private void loadDailyPrograms() {
        // Async task to load programs from database
/*        new AsyncTask<Void, Void, List<RadioProgram>>() {
            @Override
            protected List<RadioProgram> doInBackground(Void... voids) {
                return dbHelper.getAllPrograms();
            }

            @Override
            protected void onPostExecute(List<RadioProgram> loadedPrograms) {
                programs.clear();
                programs.addAll(loadedPrograms);
                adapter.notifyDataSetChanged();
            }
        }.execute();*/
        if (isRadioSelected()) {
            try {
                SpannableStringBuilder builder = new SpannableStringBuilder();
                RadioInfo selectedRadio = prefMgr.selectedRadio();
                String primary = (selectedRadio != null && selectedRadio.getName() != null) ? selectedRadio.getName() : " ";
                SpannableString primarySpannable = new SpannableString(Html.fromHtml("<b>" + primary + "</b>"));
                primarySpannable.setSpan(new ForegroundColorSpan(getResources().getColor(R.color.colorPrimary)), 0, primary.length(), 0);
                builder.append(primarySpannable);

                String black = requireActivity().getResources().getString(R.string.episode_daily, "");
                SpannableString whiteSpannable = new SpannableString(black);
                whiteSpannable.setSpan(new ForegroundColorSpan(getResources().getColor(R.color.grey_40)), 0, black.length(), 0);
                builder.append(whiteSpannable);

                String blue = " " + FmUtilize.getDayName(new Date());
                SpannableString blueSpannable = new SpannableString(blue);
                blueSpannable.setSpan(new ForegroundColorSpan(getResources().getColor(R.color.grey_700)), 0, blue.length(), 0);
                builder.append(blueSpannable);

//        tvTittle.setText(String.format(" %s", ctx.getResources().getString(R.string.episode_daily,blue )));
                tvTittle.setText(builder, TextView.BufferType.SPANNABLE);

            } catch (Exception e) {
                e.printStackTrace();
                Log.e(TAG, "Error parsing remote config JSON: " + e.getMessage());
            }
        } else {
            toggleView(true);
        }

        List<FirestoreQuery> firestoreQueryList = new ArrayList<>();

        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.WHERE_EQUAL_TO,
                "disabled",
                false
        ));
        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, getSelectedRadio().getRadioId()).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);

        firestoreDbUtility.getMany(collectionReference, firestoreQueryList, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                List<Episode> episodeList = FirestoreDbUtility.getDataFromQuerySnapshot(object, Episode.class);

                List<TempEpisodeModel> modelList = new ArrayList<>();
                for (int i1 = 0; i1 < safeList(episodeList).size(); i1++) {
                    List<DateTimeModel> shTimeList = episodeList.get(i1).getShowTimeList();
                    for (int i2 = 0; i2 < safeList(shTimeList).size(); i2++) {
                        DateTimeModel timeModel = shTimeList.get(i2);
                        Episode ep = episodeList.get(i1);
                        List<Weekday> weekdays = safeList(timeModel.getWeekdays());
                        for (Weekday item : weekdays) {
                            boolean isDisplayDay = WeekdayUtils.isCurrentDay(item);
                            if (isDisplayDay) {
                                modelList.add(new TempEpisodeModel(ep.getEpProfile(), ep.getEpName(), ep.getEpAnnouncer(), timeModel, item));
                            }
                        }
                    }
                }

                boolean isToday = modelList.size() > 0;

                toggleView(!isToday);

                if (isToday) {
                    programs.clear();
                    programs.addAll(modelList);
                    adapter.notifyDataSetChanged();
                }
            }

            @Override
            public void onFailure(Object object) {
                LogUtility.e(TAG, " loadDailyEpisode :  " + object);
                toggleView(true);
            }
        });

    }

    private void refreshPrograms() {
        loadDailyPrograms();
        swipeRefreshLayout.setRefreshing(false);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
    }

    public void refresh() {
        loadDailyPrograms();
    }

}