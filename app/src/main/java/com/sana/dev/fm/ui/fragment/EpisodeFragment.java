package com.sana.dev.fm.ui.fragment;


import static com.sana.dev.fm.utils.FmUtilize.isCollection;

import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
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

import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.RadiosAdapter;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.utils.ItemAnimation;
import com.sana.dev.fm.utils.SnackBarUtility;
import com.sana.dev.fm.utils.UserGuide;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;

import java.util.ArrayList;

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


    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        view = inflater.inflate(R.layout.fragment_episode, container, false);

        ButterKnife.bind(this, view);
        sbHelp = new SnackBarUtility(getActivity());
        materialIntroView = new MaterialIntroView(ctx);
        if (prefMgr.getUserSession() != null && prefMgr.getUserSession().getUserId() != null)
            _userId = prefMgr.getUserSession().getUserId();

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


        if (isCollection(prefMgr.getRadioList())) {
//        if (isCollection(ShardDate.getInstance().getInfoList())) {
//            stationList = (ArrayList<RadioInfo>) ShardDate.getInstance().getInfoList();
            int indexToScrollTo = prefMgr.read("ScrollToPosition", 0);

            stationList = prefMgr.getRadioList();
            ShardDate.getInstance().setRadioInfoList(stationList);
            RadiosAdapter adapter = new RadiosAdapter(ctx, stationList, recyclerView, indexToScrollTo);

            if (!isRadioSelected() && !stationList.isEmpty()) {
                prefMgr.write(FirebaseConstants.RADIO_INFO_TABLE, stationList.get(0));
            }

            recyclerView.setAdapter(adapter);
            recyclerView.setItemAnimator(new DefaultItemAnimator());
            adapter.setOnClickListener(new RadiosAdapter.OnClickListener() {
                @Override
                public void onItemClick(View view, RadioInfo radioInfo, int i) {
                    prefMgr.write("ScrollToPosition", i);
                    prefMgr.write(FirebaseConstants.RADIO_INFO_TABLE, radioInfo);
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

            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    recyclerView.smoothScrollToPosition(indexToScrollTo);
                    showIntro(recyclerView.getChildAt(0), UserGuide.INTRO_FOCUS_1, ctx.getString(R.string.label_radio_intro1));
                }
            }, 3000);
            // Scroll the RecyclerView to the selected index
//            recyclerView.scrollToPosition(indexToScrollTo);
            // Get the position of the first visible item
//            int firstVisiblePosition = ((LinearLayoutManager) layoutManager).findFirstVisibleItemPosition();
//            showIntro(recyclerView.getChildAt(firstVisiblePosition), UserGuide.INTRO_FOCUS_1, ctx.getString(R.string.label_radio_intro1));

//            recyclerView.addOnScrollListener(new RecyclerView.OnScrollListener() {
//
//                @Override
//                public void onScrolled(RecyclerView recyclerView, int dx, int dy) {
//                    if (layoutManager.findFirstVisibleItemPosition() > 0) {
//                        Log.d("SCROLLINGDOWN", "SCROLL");
//                    } else {
//                        Log.d("SCROLLINGUP", "SCROLL");
//                        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
//                            @Override
//                            public void run() {
//                                recyclerView.smoothScrollToPosition(indexToScrollTo);
//                                showIntro(recyclerView.getChildAt(0), UserGuide.INTRO_FOCUS_1, ctx.getString(R.string.label_radio_intro1));
//                            }
//                        }, 3000);
//                    }
//                }
//            });


        } else {
            // Todo check radio is empty call it again
        }


    }

    private void updateRecycle() {
//        Fragment childFragment = new EpChildFragment();
        Fragment childFragment = new RealTimeEpisodeFragment();
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
                prefMgr.write(UserGuide.INTRO_FOCUS_1, "");
                ((MainActivity) requireActivity()).showPlayIntro();
            }
        });
    }
}

