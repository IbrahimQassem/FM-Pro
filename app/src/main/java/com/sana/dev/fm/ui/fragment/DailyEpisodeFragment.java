package com.sana.dev.fm.ui.fragment;


import static com.sana.dev.fm.utils.FmUtilize.isCollection;
import static com.sana.dev.fm.utils.FmUtilize.safeList;

import android.content.Context;
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

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.Query;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.TimeLineAdapter;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.TempEpisodeModel;
import com.sana.dev.fm.model.enums.Weekday;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.WeekdayUtils;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQuery;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQueryConditionCode;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * A simple {@link Fragment} subclass.
 * Use the {@link DailyEpisodeFragment#newInstance} factory method to
 * create an instance of this fragment.
 */
public class DailyEpisodeFragment extends BaseFragment {
    private static final String TAG = DailyEpisodeFragment.class.getSimpleName();

    // the fragment initialization parameters, e.g. ARG_ITEM_NUMBER
    private static final String ARG_PARAM1 = "param1";
    private static final String ARG_PARAM2 = "param2";
    View view;
    Context ctx;
    @BindView(R.id.child_fragment_container)
    FrameLayout cf_container;
    @BindView(R.id.recyclerView)
    RecyclerView recyclerView;
    @BindView(R.id.tvTittle)
    TextView tvTittle;
    private TimeLineAdapter mAdapter;
    private FirestoreDbUtility firestoreDbUtility;


    public DailyEpisodeFragment() {
        // Required empty public constructor
    }

    /**
     * Use this factory method to create a new instance of
     * this fragment using the provided parameters.
     *
     * @param param1 Parameter 1.
     * @param list   Parameter 2.
     * @return A new instance of fragment RadioMapFragment.
     */
    public static DailyEpisodeFragment newInstance(String param1, List<Episode> list) {
        DailyEpisodeFragment fragment = new DailyEpisodeFragment();
        // Don't include arguments unless uuid != null
        if (isCollection(list)) {
            Bundle args = new Bundle();
            args.putString(ARG_PARAM1, param1);
            args.putSerializable(ARG_PARAM2, (Serializable) list);
            fragment.setArguments(args);
        }
        return fragment;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
//        if (getArguments() != null) {
//            mParam1 = getArguments().getString(ARG_PARAM1);
//            episodeList = (List<Episode>) getArguments().getSerializable(ARG_PARAM2);
//        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        view = inflater.inflate(R.layout.fragment_radio_map, container, false);
        ButterKnife.bind(this, view);

        firestoreDbUtility = new FirestoreDbUtility();

//        if (getArguments() != null) {
//            episodeList = (List<Episode>) getArguments().getSerializable(ARG_PARAM2);
//        }

        if (isRadioSelected()) {
            loadDailyEpisode(prefMgr.selectedRadio().getRadioId());
        } else {

        }


        return view;
    }

    @Override
    public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
        EmptyViewFragment emptyViewFragment = EmptyViewFragment.newInstance(ctx.getString(R.string.no_data_available), getString(R.string.brows_more_station), getString(R.string.label_main_screen));
        FragmentTransaction transaction = getChildFragmentManager().beginTransaction();
        transaction.replace(R.id.child_fragment_container, emptyViewFragment).commit();
        emptyViewFragment.setOnItemClickListener(new CallBackListener() {
            @Override
            public void onCallBack() {
                if ((MainActivity) getActivity() != null)
                    ((MainActivity) getActivity()).selectTab(R.id.navigation_home);
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

            String black = ctx.getResources().getString(R.string.episode_daily, "");
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


        // Todo
        List<FirestoreQuery> firestoreQueryList = new ArrayList<>();
        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.WHERE_LESS_THAN_OR_EQUAL_TO,
                "programScheduleTime.dateEnd",
                System.currentTimeMillis()
        ));

        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.Query_Direction_DESCENDING,
                "programScheduleTime.dateStart",
                Query.Direction.DESCENDING
        ));

        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.WHERE_EQUAL_TO,
                "disabled",
                false
        ));


        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);

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
                        String _displayDayName = WeekdayUtils.toSeparatedString(weekdays);
                        modelList.add(new TempEpisodeModel(ep.getEpProfile(), ep.getEpName(), ep.getEpAnnouncer(), _displayDayName, timeModel));
                    }
                }

                List<TempEpisodeModel> filtered = new ArrayList<TempEpisodeModel>();
                for (TempEpisodeModel article : modelList) {
                    if (article.getDisplayDayName().matches(FmUtilize.getShortEnDayName()))
                        filtered.add(article);
                }

                boolean isToday = filtered.size() > 0;

                recyclerView.setLayoutManager(new LinearLayoutManager(ctx));
                TimeLineAdapter adapterPeople = new TimeLineAdapter(ctx, filtered);
                mAdapter = adapterPeople;
                recyclerView.setAdapter(adapterPeople);

                toggleView(!isToday);
            }

            @Override
            public void onFailure(Object object) {
                LogUtility.e(TAG, " loadDailyEpisode :  " + object);
            }
        });

    }


    @Override
    public void onAttach(@NonNull Context context) {
        super.onAttach(context);
        this.ctx = context;

    }

    @Override
    public void onDetach() {
        super.onDetach();
    }

    public void refresh() {
        if (isRadioSelected()) loadDailyEpisode(prefMgr.selectedRadio().getRadioId());
    }

    void toggleView(boolean hide) {
        recyclerView.setVisibility(!hide ? View.VISIBLE : View.GONE);
        cf_container.setVisibility(hide ? View.VISIBLE : View.GONE);
    }

}

