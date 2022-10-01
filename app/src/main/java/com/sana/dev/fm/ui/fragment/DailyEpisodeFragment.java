package com.sana.dev.fm.ui.fragment;



import static com.sana.dev.fm.utils.FmUtilize.isCollection;
import static com.sana.dev.fm.utils.FmUtilize.safeList;
import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.EPISODE_TABLE;

import android.content.Context;
import android.os.Bundle;
import android.text.SpannableString;
import android.text.SpannableStringBuilder;
import android.text.style.ForegroundColorSpan;
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

import com.sana.dev.fm.R;

import com.sana.dev.fm.adapter.TimeLineAdapter;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.TempEpisodeModel;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.EpisodeRepositoryImpl;


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

    // TODO: Rename parameter arguments, choose names that match
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
    // TODO: Rename and change types of parameters
    private String mParam1;
    private String mParam2;
    private TimeLineAdapter mAdapter;
    //    private List<Episode> episodeList = new ArrayList<>();
    private EpisodeRepositoryImpl ePiRepo;


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
//     TODO: Rename and change types and number of parameters
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
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        view = inflater.inflate(R.layout.fragment_radio_map, container, false);
        ButterKnife.bind(this, view);

        ePiRepo = new EpisodeRepositoryImpl((MainActivity) ctx, EPISODE_TABLE);

//        if (getArguments() != null) {
//            episodeList = (List<Episode>) getArguments().getSerializable(ARG_PARAM2);
//        }

        if (isRadioSelected())
            loadDailyEpisode(prefMng.selectedRadio().getRadioId());


        return view;
    }

    @Override
    public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
        Fragment childFragment = new EmptyViewFragment();
        Bundle args = new Bundle();
        args.putString(EmptyViewFragment.ARG_NOTE_TITLE, ctx.getString(R.string.no_data_available));
        args.putString(EmptyViewFragment.ARG_NOTE_DETAILS, getString(R.string.brows_more_station));
        childFragment.setArguments(args);
        FragmentTransaction transaction = getChildFragmentManager().beginTransaction();
        transaction.replace(R.id.child_fragment_container, childFragment).commit();
        recyclerView.setVisibility(View.GONE);
        cf_container.setVisibility(View.VISIBLE);
    }


    private void loadDailyEpisode(String radioId) {
        SpannableStringBuilder builder = new SpannableStringBuilder();

        String primary = prefMng.selectedRadio() != null ? prefMng.selectedRadio().getName() : "";
         SpannableString primarySpannable = new SpannableString(primary);
        primarySpannable.setSpan(new ForegroundColorSpan(getResources().getColor(R.color.text_like_counter)), 0, primary.length(), 0);
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

        ePiRepo.reaDailyEpisodeByRadioId(radioId, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                List<Episode> episodeList = safeList((List<Episode>) object);
                List<TempEpisodeModel> modelList = new ArrayList<>();
                for (int i1 = 0; i1 < safeList(episodeList).size(); i1++) {
                    List<DateTimeModel> shTimeList = episodeList.get(i1).getShowTimeList();
                    for (int i2 = 0; i2 < safeList(shTimeList).size(); i2++) {
                        DateTimeModel timeModel = shTimeList.get(i2);
                        Episode ep = episodeList.get(i1);
                        String _displayDayName = isCollection(timeModel.getDisplayDays()) ? timeModel.getDisplayDays().get(0) : "";
                        modelList.add(new TempEpisodeModel(ep.getEpProfile(), ep.getEpName(), ep.getEpAnnouncer(), _displayDayName, timeModel));
                    }
                }



                List<TempEpisodeModel> filtered = new ArrayList<TempEpisodeModel>();
                for(TempEpisodeModel article : modelList)
                {
                    if(article.getDisplayDayName().matches(FmUtilize.getShortEnDayName()))
                        filtered.add(article);
                }

                boolean isToday = filtered.size() > 0;

                recyclerView.setLayoutManager(new LinearLayoutManager(ctx));
                TimeLineAdapter adapterPeople = new TimeLineAdapter(ctx, filtered);
                mAdapter = adapterPeople;
                recyclerView.setAdapter(adapterPeople);

                recyclerView.setVisibility(isToday ? View.VISIBLE : View.GONE);
                cf_container.setVisibility(!isToday ? View.VISIBLE : View.GONE);
            }

            @Override
            public void onError(Object object) {
                LogUtility.e(TAG, "reaDailyEpisodeByRadioId onError : " + object);
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
        if (isRadioSelected())
            loadDailyEpisode(prefMng.selectedRadio().getRadioId());
    }


}

