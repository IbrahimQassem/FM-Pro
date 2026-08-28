package com.sana.dev.fm.ui.fragment;

import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.viewpager2.widget.ViewPager2;

import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.DestinationSliderAdapter;
import com.sana.dev.fm.adapter.RadiosAdapter;
import com.sana.dev.fm.data.datasource.FirestoreBannersRemoteDataSource;
import com.sana.dev.fm.data.repository.BannersRepositoryImpl;
import com.sana.dev.fm.domain.model.Banner;
import com.sana.dev.fm.domain.repository.BannersRepository;
import com.sana.dev.fm.model.DestinationModel;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.SnackBarUtility;
import com.sana.dev.fm.utils.UserGuide;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import co.mobiwise.materialintro.animation.MaterialIntroListener;
import co.mobiwise.materialintro.shape.Focus;
import co.mobiwise.materialintro.shape.ShapeType;
import co.mobiwise.materialintro.view.MaterialIntroView;

/**
 * Main Home screen displaying stations slider, banners/advertisements, and episode stream.
 * Pure UI presentation layer — Banner data fetched via BannersRepository.
 */
public class MainHomeFragment extends BaseFragment implements DestinationSliderAdapter.OnDestinationClickListener {
    private static final String TAG = MainHomeFragment.class.getSimpleName();
    private static final String ARG_PARAM1 = "param1";

    private FrameLayout cf_container;
    private RecyclerView recyclerView;
    private LinearLayout lytParentStation;
    private ViewPager2 viewPager;
    private LinearLayout dotsLayout;

    View view;
    Context ctx;
    MaterialIntroView materialIntroView;
    private SnackBarUtility sbHelp;
    private CallBackListener callBackListener;
    private BannersRepository bannersRepository;
    private DestinationSliderAdapter sliderAdapter;
    private List<DestinationModel> destinationList = new ArrayList<>();
    private Handler sliderHandler = new Handler();
    private TextView[] dots;
    final private long delayMillis = 30000;


    public MainHomeFragment() {
        // Required empty public constructor
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bannersRepository = new BannersRepositoryImpl(new FirestoreBannersRemoteDataSource());
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        view = inflater.inflate(R.layout.fragment_main_home, container, false);

        cf_container = view.findViewById(R.id.child_fragment_container);
        recyclerView = view.findViewById(R.id.recyclerView);
        lytParentStation = view.findViewById(R.id.lyt_parent_stations);
        viewPager = view.findViewById(R.id.viewPager);
        dotsLayout = view.findViewById(R.id.dotsLayout);

        sbHelp = new SnackBarUtility(getActivity());
        materialIntroView = new MaterialIntroView(ctx);

        setupSlider();

        // Load banners via repository
        loadDestinations();

        loadRadios();

        return view;
    }

    @Override
    public void onViewCreated(View view, Bundle savedInstanceState) {
    }

    private void loadRadios() {
        recyclerView.setHasFixedSize(true);
        LinearLayoutManager layoutManager = new LinearLayoutManager(ctx, LinearLayoutManager.HORIZONTAL, true);
        recyclerView.setLayoutManager(layoutManager);

        ArrayList<RadioInfo> stationList = prefMgr.getRadioList();

        if (stationList != null && stationList.size() > 0) {
            lytParentStation.setVisibility(View.VISIBLE);
            int indexToScrollTo = prefMgr.read("ScrollToPosition", 0);

            RadiosAdapter radiosAdapter = new RadiosAdapter(RadiosAdapter.VIEW_TYPE_MAIN, ctx, stationList, recyclerView, indexToScrollTo);

            if (!isRadioSelected() && !stationList.isEmpty()) {
                prefMgr.write(AppConstant.Firebase.STATIONS_COLLECTION, stationList.get(0));
            }

            recyclerView.setAdapter(radiosAdapter);
            recyclerView.setItemAnimator(new DefaultItemAnimator());
            radiosAdapter.setOnClickListener(new RadiosAdapter.OnClickListener() {
                @Override
                public void onItemClick(View view, RadioInfo radioInfo, int i) {
                    prefMgr.write("ScrollToPosition", i);
                    prefMgr.write(AppConstant.Firebase.STATIONS_COLLECTION, radioInfo);
                    radiosAdapter.selectTaskListItem(i);
                    updateRecycle();
                    if (callBackListener != null)
                        callBackListener.onCallBack();

                    if (radioInfo != null && radioInfo.getName() != null) {
                        showToast(radioInfo.getName());
                    }
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

        } else {
            lytParentStation.setVisibility(View.GONE);
        }
    }

    private void updateRecycle() {
        Fragment childFragment = new RealTimeEpisodeFragment();
        FragmentTransaction transaction = getChildFragmentManager().beginTransaction();
        transaction.replace(R.id.child_fragment_container, childFragment).commit();
    }

    private void setupSlider() {
        // Auto slide setup
        sliderAdapter = new DestinationSliderAdapter(mActivity, this);
        viewPager.setAdapter(sliderAdapter);
        viewPager.registerOnPageChangeCallback(new ViewPager2.OnPageChangeCallback() {
            @Override
            public void onPageSelected(int position) {
                super.onPageSelected(position);
                sliderHandler.removeCallbacks(sliderRunnable);
                sliderHandler.postDelayed(sliderRunnable, delayMillis);
                updateDots(position);
            }
        });

        // Add page transformer for animation
        viewPager.setPageTransformer((page, position) -> {
            float r = 1 - Math.abs(position);
            page.setScaleY(0.85f + r * 0.15f);
        });
    }

    private Runnable sliderRunnable = new Runnable() {
        @Override
        public void run() {
            int currentPosition = viewPager.getCurrentItem();
            if (currentPosition == sliderAdapter.getItemCount() - 1) {
                viewPager.setCurrentItem(0);
            } else {
                viewPager.setCurrentItem(currentPosition + 1);
            }
        }
    };

    private void setupDots() {
        dotsLayout.removeAllViews();
        dots = new TextView[destinationList.size()];

        for (int i = 0; i < dots.length; i++) {
            dots[i] = new TextView(mActivity);
            dots[i].setText("•");
            dots[i].setTextSize(35);
            dots[i].setTextColor(ContextCompat.getColor(mActivity, android.R.color.darker_gray));
            dotsLayout.addView(dots[i]);
        }

        // Set first dot to active
        if (dots.length > 0) {
            dots[0].setTextColor(ContextCompat.getColor(mActivity, android.R.color.white));
        }
    }

    private void updateDots(int position) {
        if (dots == null) return;
        for (int i = 0; i < dots.length; i++) {
            if (dots[i] != null) {
                dots[i].setTextColor(ContextCompat.getColor(mActivity,
                        i == position ? android.R.color.white : android.R.color.darker_gray));
            }
        }
    }

    private void loadDestinations() {
        if (bannersRepository == null) return;

        bannersRepository.getBanners(result -> {
            if (result != null && result.isSuccess()) {
                List<Banner> banners = result.getDataOrNull();
                destinationList = new ArrayList<>();
                if (banners != null) {
                    for (Banner b : banners) {
                        if (b != null) {
                            DestinationModel dm = new DestinationModel();
                            dm.setId(b.getId());
                            dm.setName(b.getTitle());
                            dm.setImageUrl(b.getImageUrl());
                            dm.setPriority(b.getPriority());
                            destinationList.add(dm);
                        }
                    }
                }
                List<DestinationModel> sortedDestinations = getSortedDestinations(destinationList);
                sliderAdapter.setDestinations(sortedDestinations);
                setupDots();
            } else {
                LogUtility.e(TAG, "loadDestinations failure: " + (result != null && result.getErrorOrNull() != null ? result.getErrorOrNull().getMessage() : "unknown"));
            }
        });
    }

    private List<DestinationModel> getSortedDestinations(List<DestinationModel> destinations) {
        Collections.sort(destinations, (d1, d2) ->
                Integer.compare(d2.getPriority(), d1.getPriority()));
        return destinations;
    }

    @Override
    public void onResume() {
        super.onResume();
        updateRecycle();
        sliderHandler.postDelayed(sliderRunnable, delayMillis);
        LogUtility.e(TAG, "task resume");
    }

    @Override
    public void onPause() {
        super.onPause();
        sliderHandler.removeCallbacks(sliderRunnable);
        LogUtility.e(TAG, "task Pause");
    }

    @Override
    public void onAttach(@NonNull Context context) {
        super.onAttach(context);
        this.ctx = context;
    }

    @Override
    public void onActivityCreated(@Nullable Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);
        if (getActivity() instanceof CallBackListener)
            callBackListener = (CallBackListener) getActivity();
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

    @Override
    public void onDestinationClick(DestinationModel destination) {
    }

    @Override
    public void onFavoriteClick(DestinationModel destination) {
    }
}
