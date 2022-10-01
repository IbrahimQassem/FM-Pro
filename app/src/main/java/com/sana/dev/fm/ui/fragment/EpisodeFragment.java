package com.sana.dev.fm.ui.fragment;


import static com.sana.dev.fm.utils.FmUtilize.isCollection;

import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.gson.Gson;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.RadiosAdapter;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.utils.ItemAnimation;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.SnackBarUtility;
import com.sana.dev.fm.utils.UserGuide;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;
import com.sana.dev.fm.utils.my_firebase.RadioInfoRepositoryImpl;


import java.util.ArrayList;
import java.util.Objects;

import butterknife.BindView;
import butterknife.ButterKnife;
import co.mobiwise.materialintro.animation.MaterialIntroListener;
import co.mobiwise.materialintro.shape.Focus;
import co.mobiwise.materialintro.shape.ShapeType;
import co.mobiwise.materialintro.view.MaterialIntroView;

/**
 * A simple {@link Fragment} subclass.
 * create an instance of this fragment.
 */
public class EpisodeFragment extends BaseFragment {

    public static final String EPISODE_FRAG = "EpisodeFrag";
    private static final String TAG = EpisodeFragment.class.getSimpleName();
    // TODO: Rename parameter arguments, choose names that match
    // the fragment initialization parameters, e.g. ARG_ITEM_NUMBER
    private static final String ARG_PARAM1 = "param1";
    @BindView(R.id.child_fragment_container)
    FrameLayout cf_container;

    @BindView(R.id.recyclerView)
    RecyclerView recyclerView;

    View view;
    Context ctx;
    PreferencesManager prefMng;
    String _userId;
    ArrayList<RadioInfo> stationList;
    boolean isSearchBarHide = false;
    MaterialIntroView materialIntroView;
    // TODO: Rename and change types of parameters
    private String mParam1;
    private String mParam2;
    private int animation_type = ItemAnimation.BOTTOM_UP;
    private SnackBarUtility sbHelp;
    private View lyt_station;
    private CallBackListener callBackListener;

    public EpisodeFragment() {
        // Required empty public constructor
    }

    /**
     * Use this factory method to create a new instance of
     * this fragment using the provided parameters.
     *
     * @return A new instance of fragment EpisodeFragment.
     */
    // TODO: Rename and change types and number of parameters
//    public static EpisodeFragment newInstance(String param1, List<Episode> list) {
//        EpisodeFragment fragment = new EpisodeFragment();
//        // Don't include arguments unless uuid != null
//
//        if (list != null ) {
//            Bundle args = new Bundle();
//            args.putString(ARG_PARAM1, param1);
//            args.putSerializable(ARG_PARAM2, (Serializable) list);
//            fragment.setArguments(args);
//        }
//        return fragment;
//    }

//    @Override
//    public void onCreate(Bundle savedInstanceState) {
//        super.onCreate(savedInstanceState);
//        if (getArguments() != null) {
//            mParam1 = getArguments().getString(ARG_PARAM1);
//            episodeList = (List<Episode>) getArguments().getSerializable(ARG_PARAM2);
//        }
//    }
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        view = inflater.inflate(R.layout.fragment_episode, container, false);

//        if (getArguments() != null) {
//            episodeList = (List<Episode>) getArguments().getSerializable(ARG_PARAM2);
//        }

//        setRetainInstance(true);
        ButterKnife.bind(this, view);
        sbHelp = new SnackBarUtility(getActivity());
        prefMng = new PreferencesManager(ctx);
        materialIntroView = new MaterialIntroView(ctx);
        if (prefMng.getUsers() != null && prefMng.getUsers().getUserId() != null)
            _userId = prefMng.getUsers().getUserId();

        initRadios();

//     updateRecycle();


        return view;
    }

    @Override
    public void onViewCreated(View view, Bundle savedInstanceState) {
//        Fragment childFragment = new EmptyViewFragment();
//        Bundle args = new Bundle();
//        args.putString(ARG_NOTE_TITLE, ctx.getString(R.string.no_data_available));
//        args.putString(ARG_NOTE_DETAILS, getString(R.string.brows_more_station));
//        childFragment.setArguments(args);
//        FragmentTransaction transaction = getChildFragmentManager().beginTransaction();
//        transaction.replace(R.id.child_fragment_container, childFragment).commit();
    }

    private void initRadios() {

//        lyt_station = view.findViewById(R.id.lyt_station);
//        ((NestedScrollView) view.findViewById(R.id.nested_scroll_view)).setOnScrollChangeListener(new NestedScrollView.OnScrollChangeListener() {
//            public void onScrollChange(NestedScrollView nestedScrollView, int i, int i2, int i3, int i4) {
//                if (i2 < i4) {
//                     animateSearchBar(false);
//                }
//                if (i2 > i4) {
//                    animateSearchBar(true);
//                }
//            }
//        });


        stationList = new ArrayList<>();

//        RecyclerView recyclerView = (RecyclerView) view.findViewById(R.id.recyclerView);
        recyclerView.setHasFixedSize(true);
        LinearLayoutManager layoutManager = new LinearLayoutManager(ctx, LinearLayoutManager.HORIZONTAL, true);
        recyclerView.setLayoutManager(layoutManager);


        if (isCollection(prefMng.getRadioList())) {
//        if (isCollection(ShardDate.getInstance().getInfoList())) {
//            stationList = (ArrayList<RadioInfo>) ShardDate.getInstance().getInfoList();
            stationList = prefMng.getRadioList();
            ShardDate.getInstance().setInfoList(stationList);
            RadiosAdapter adapter = new RadiosAdapter(ctx, stationList, recyclerView, prefMng.read("ScrollToPosition", 0));

            if (!isRadioSelected()) {
                prefMng.write("RadioInfo", stationList.get(0));
            }

            recyclerView.setAdapter(adapter);
            recyclerView.setItemAnimator(new DefaultItemAnimator());
            adapter.setOnClickListener(new RadiosAdapter.OnClickListener() {
                @Override
                public void onItemClick(View view, RadioInfo radioInfo, int i) {
                    prefMng.write("ScrollToPosition", i);
                    prefMng.write("RadioInfo", radioInfo);
                    adapter.selectTaskListItem(i);
                    updateRecycle();
                    if (callBackListener != null)
                        callBackListener.onCallBack();

                    Toast.makeText(ctx, radioInfo.getName(), Toast.LENGTH_SHORT).show();
                }

                @Override
                public void onItemLongClick(View view, RadioInfo radioInfo, int i) {

                }
            });

//                    new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
//                        @Override
//                        public void run() {
//                            recyclerView.smoothScrollToPosition(prefMng.read("ScrollToPosition", 0));
//                            startMeEvent();
//                        }
//                    }, 3000);

//                    if (recyclerView.getAdapter().getItemCount() - 1 == 0) {
//                        recyclerView.smoothScrollToPosition(prefMng.read("ScrollToPosition", 0));
//                        startMeEvent();
//                    }


            recyclerView.addOnScrollListener(new RecyclerView.OnScrollListener() {

                @Override
                public void onScrolled(RecyclerView recyclerView, int dx, int dy) {
                    if (layoutManager.findFirstVisibleItemPosition() > 0) {
//                                startMeEvent();
                        Log.d("SCROLLINGDOWN", "SCROLL");
//                                showToast("1");
                    } else {
                        Log.d("SCROLLINGUP", "SCROLL");
                        recyclerView.smoothScrollToPosition(0);
                        showIntro(recyclerView.getChildAt(0), UserGuide.INTRO_FOCUS_1, ctx.getString(R.string.label_radio_intro1));
//                                showToast("2");
                    }
                }
            });

        }


    }

    private void updateRecycle() {
//        Fragment childFragment = new EpChildFragment();
        Fragment childFragment = new FirestoreChatFragment();
        FragmentTransaction transaction = getChildFragmentManager().beginTransaction();
        transaction.replace(R.id.child_fragment_container, childFragment).commit();
    }

    @Override
    public void onAttach(@NonNull Context context) {
        super.onAttach(context);
        this.ctx = context;
    }

    @Override
    public void onActivityCreated(@Nullable Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);
        //getActivity() is fully created in onActivityCreated and instanceOf differentiate it between different Activities
        if (getActivity() instanceof CallBackListener)
            callBackListener = (CallBackListener) getActivity();
    }

    private void animateSearchBar(boolean z) {
        boolean z2 = this.isSearchBarHide;
        if (!(z2 && z) && (z2 || z)) {
            this.isSearchBarHide = z;
            this.lyt_station.animate().translationY((float) (z ? -(this.lyt_station.getHeight() * 2) : 0)).setStartDelay(100).setDuration(300).start();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
//        Toast.makeText(ctx, "onResume", Toast.LENGTH_SHORT).show();
        updateRecycle();
    }


    private void showIntro(View view, String id, String text) {
        userGuide.showIntro(view, id, text, Focus.ALL, ShapeType.RECTANGLE, new MaterialIntroListener() {
            @Override
            public void onUserClicked(String materialIntroViewId) {
                prefMng.write(UserGuide.INTRO_FOCUS_1, "");
                ((MainActivity) requireActivity()).showPlayIntro();
            }
        });
    }
}

