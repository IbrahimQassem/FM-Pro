package com.sana.dev.fm.ui.fragment;

import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.viewpager2.widget.ViewPager2;

import com.google.android.material.chip.ChipGroup;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.DestinationSliderAdapter;
import com.sana.dev.fm.adapter.StationGridAdapter;
import com.sana.dev.fm.core.navigation.AppNavigator;
import com.sana.dev.fm.data.datasource.FirestoreBannersRemoteDataSource;
import com.sana.dev.fm.data.repository.BannersRepositoryImpl;
import com.sana.dev.fm.domain.model.Banner;
import com.sana.dev.fm.domain.repository.BannersRepository;
import com.sana.dev.fm.model.DestinationModel;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.LogUtility;

import java.util.ArrayList;
import java.util.List;

/**
 * Unified Main Hub Screen:
 * - Featured Banners Carousel
 * - Instant Search & Category Filters
 * - Responsive 2-Column Grid / 1-Column List Toggle for Radio Stations
 * - In-shell navigation to Station Details & Direct Audio Playback
 */
public class MainHomeFragment extends BaseFragment implements DestinationSliderAdapter.OnDestinationClickListener {
    private static final String TAG = MainHomeFragment.class.getSimpleName();

    private ViewPager2 viewPager;
    private LinearLayout dotsLayout;
    private EditText etSearchRadios;
    private ImageView ivClearSearch;
    private ChipGroup chipGroupFilters;
    private TextView tvStationsCount;
    private ImageButton ibViewToggle;
    private RecyclerView rvStationsGrid;
    private LinearLayout lytEmptySearch;

    private BannersRepository bannersRepository;
    private DestinationSliderAdapter sliderAdapter;
    private StationGridAdapter stationGridAdapter;
    private List<DestinationModel> destinationList = new ArrayList<>();
    private final Handler sliderHandler = new Handler();
    private TextView[] dots;
    private final long delayMillis = 30000;

    private String currentSelectedChipTag = "all";
    private boolean isGridView = true;

    public MainHomeFragment() {
        // Required empty public constructor
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bannersRepository = new BannersRepositoryImpl(new FirestoreBannersRemoteDataSource());
    }

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_main_home, container, false);

        viewPager = view.findViewById(R.id.viewPager);
        dotsLayout = view.findViewById(R.id.dotsLayout);
        etSearchRadios = view.findViewById(R.id.et_search_radios);
        ivClearSearch = view.findViewById(R.id.iv_clear_search);
        chipGroupFilters = view.findViewById(R.id.chip_group_filters);
        tvStationsCount = view.findViewById(R.id.tv_stations_count);
        ibViewToggle = view.findViewById(R.id.ib_view_toggle);
        rvStationsGrid = view.findViewById(R.id.rv_stations_grid);
        lytEmptySearch = view.findViewById(R.id.lyt_empty_search);

        setupSlider();
        setupSearchAndFilters();
        setupViewToggle();
        loadDestinations();
        loadRadiosGrid();

        return view;
    }

    private void setupSlider() {
        if (getActivity() == null) return;
        sliderAdapter = new DestinationSliderAdapter(getActivity(), this);
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

        viewPager.setPageTransformer((page, position) -> {
            float r = 1 - Math.abs(position);
            page.setScaleY(0.88f + r * 0.12f);
        });
    }

    private final Runnable sliderRunnable = new Runnable() {
        @Override
        public void run() {
            if (viewPager == null || sliderAdapter == null || sliderAdapter.getItemCount() == 0) return;
            int currentPosition = viewPager.getCurrentItem();
            if (currentPosition >= sliderAdapter.getItemCount() - 1) {
                viewPager.setCurrentItem(0);
            } else {
                viewPager.setCurrentItem(currentPosition + 1);
            }
        }
    };

    private void setupDots() {
        if (dotsLayout == null || getActivity() == null) return;
        dotsLayout.removeAllViews();
        dots = new TextView[destinationList.size()];

        for (int i = 0; i < dots.length; i++) {
            dots[i] = new TextView(getActivity());
            dots[i].setText("•");
            dots[i].setTextSize(32);
            dots[i].setTextColor(ContextCompat.getColor(getActivity(), android.R.color.darker_gray));
            dotsLayout.addView(dots[i]);
        }

        if (dots.length > 0) {
            dots[0].setTextColor(ContextCompat.getColor(getActivity(), android.R.color.white));
        }
    }

    private void updateDots(int position) {
        if (dots == null || getActivity() == null) return;
        for (int i = 0; i < dots.length; i++) {
            if (dots[i] != null) {
                dots[i].setTextColor(ContextCompat.getColor(getActivity(),
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
                if (sliderAdapter != null && !destinationList.isEmpty()) {
                    sliderAdapter.setDestinations(destinationList);
                    setupDots();
                }
            }
        });
    }

    private void setupSearchAndFilters() {
        // Clear search icon
        ivClearSearch.setOnClickListener(v -> {
            etSearchRadios.setText("");
        });

        // Search text watcher
        etSearchRadios.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                boolean hasText = !TextUtils.isEmpty(s);
                ivClearSearch.setVisibility(hasText ? View.VISIBLE : View.GONE);
                applyFilter();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        // Chip filters listener
        chipGroupFilters.setOnCheckedChangeListener((group, checkedId) -> {
            if (checkedId == R.id.chip_sanaa) {
                currentSelectedChipTag = "sanaa";
            } else if (checkedId == R.id.chip_aden) {
                currentSelectedChipTag = "aden";
            } else if (checkedId == R.id.chip_news) {
                currentSelectedChipTag = "news";
            } else if (checkedId == R.id.chip_culture) {
                currentSelectedChipTag = "culture";
            } else {
                currentSelectedChipTag = "all";
            }
            applyFilter();
        });
    }

    private void setupViewToggle() {
        if (ibViewToggle == null) return;
        updateToggleIcon();
        ibViewToggle.setOnClickListener(v -> {
            isGridView = !isGridView;
            updateToggleIcon();
            updateRecyclerViewLayout();
        });
    }

    private void updateToggleIcon() {
        if (ibViewToggle != null) {
            ibViewToggle.setImageResource(isGridView ? R.drawable.ic_ballot : R.drawable.ic_reoder);
        }
    }

    private void updateRecyclerViewLayout() {
        if (rvStationsGrid == null || getContext() == null) return;
        GridLayoutManager gridLayoutManager = new GridLayoutManager(requireContext(), isGridView ? 2 : 1);
        rvStationsGrid.setLayoutManager(gridLayoutManager);
        if (stationGridAdapter != null) {
            stationGridAdapter.setViewType(isGridView ? StationGridAdapter.VIEW_TYPE_GRID : StationGridAdapter.VIEW_TYPE_LIST);
        }
    }

    private void applyFilter() {
        if (stationGridAdapter == null) return;
        String query = etSearchRadios != null ? etSearchRadios.getText().toString() : "";
        int matchCount = stationGridAdapter.filter(query, currentSelectedChipTag);

        updateCountText(matchCount);
        if (lytEmptySearch != null && rvStationsGrid != null) {
            boolean isEmpty = (matchCount == 0);
            lytEmptySearch.setVisibility(isEmpty ? View.VISIBLE : View.GONE);
            rvStationsGrid.setVisibility(isEmpty ? View.GONE : View.VISIBLE);
        }
    }

    private void updateCountText(int count) {
        if (tvStationsCount != null) {
            tvStationsCount.setText(count + " " + getString(R.string.label_radio_station));
        }
    }

    private void loadRadiosGrid() {
        if (getContext() == null) return;

        ArrayList<RadioInfo> stationList = prefMgr != null ? prefMgr.getRadioList() : null;
        if (stationList == null) {
            stationList = new ArrayList<>();
        }

        // Set up initial layout manager
        GridLayoutManager gridLayoutManager = new GridLayoutManager(requireContext(), isGridView ? 2 : 1);
        rvStationsGrid.setLayoutManager(gridLayoutManager);
        rvStationsGrid.setItemAnimator(new DefaultItemAnimator());

        stationGridAdapter = new StationGridAdapter(requireContext(), stationList);
        stationGridAdapter.setViewType(isGridView ? StationGridAdapter.VIEW_TYPE_GRID : StationGridAdapter.VIEW_TYPE_LIST);
        rvStationsGrid.setAdapter(stationGridAdapter);

        updateCountText(stationList.size());

        // Wire Station Actions
        stationGridAdapter.setListener(new StationGridAdapter.OnStationActionListener() {
            @Override
            public void onStationClick(@NonNull RadioInfo station, int position) {
                // Save active station
                if (prefMgr != null) {
                    prefMgr.write(AppConstant.Firebase.STATIONS_COLLECTION, station);
                }

                // Open Station / Program Details in Single Shell
                Episode stationEpisode = new Episode();
                stationEpisode.setRadioId(station.getRadioId());
                stationEpisode.setProgramName(station.getName());
                stationEpisode.setEpDesc(station.getDesc() != null ? station.getDesc() : station.getTag());
                stationEpisode.setEpProfile(station.getLogo());
                stationEpisode.setEpStreamUrl(station.getStreamUrl());

                if (getActivity() instanceof AppNavigator) {
                    ((AppNavigator) getActivity()).openProgramDetails(stationEpisode);
                }
            }

            @Override
            public void onQuickPlayClick(@NonNull RadioInfo station, int position) {
                if (prefMgr != null) {
                    prefMgr.write(AppConstant.Firebase.STATIONS_COLLECTION, station);
                }

                if (getActivity() instanceof MainActivity) {
                    MainActivity activity = (MainActivity) getActivity();
                    String title = station.getName() + " " + (station.getChannelFreq() != null ? station.getChannelFreq() : "");
                    activity.changeStation(station.getStreamUrl(), title);
                    stationGridAdapter.setCurrentPlayingStreamUrl(station.getStreamUrl());
                }
            }
        });
    }

    @Override
    public void onDestinationClick(DestinationModel destination) {
        if (destination == null || getActivity() == null) return;
        if (getActivity() instanceof AppNavigator) {
            ((AppNavigator) getActivity()).openProgramDetails(destination.getId(), "", destination.getName());
        }
    }

    @Override
    public void onFavoriteClick(DestinationModel destination) {
        // Optional favorite action on slider banner
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        sliderHandler.removeCallbacks(sliderRunnable);
    }
}
