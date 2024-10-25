package com.sana.dev.fm.ui.fragment;


import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.viewpager2.widget.ViewPager2;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.Query;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.DestinationSliderAdapter;
import com.sana.dev.fm.adapter.RadiosAdapter;
import com.sana.dev.fm.model.DestinationModel;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.activity.DestinationDetailActivity;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.SnackBarUtility;
import com.sana.dev.fm.utils.UserGuide;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQuery;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQueryConditionCode;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

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
public class MainHomeFragment extends BaseFragment implements DestinationSliderAdapter.OnDestinationClickListener {
    private static final String TAG = MainHomeFragment.class.getSimpleName();
    // TODO: Rename parameter arguments, choose names that match
    // the fragment initialization parameters, e.g. ARG_ITEM_NUMBER
    private static final String ARG_PARAM1 = "param1";
    @BindView(R.id.child_fragment_container)
    FrameLayout cf_container;

    @BindView(R.id.recyclerView)
    RecyclerView recyclerView;

    @BindView(R.id.sliderRecyclerView)
    RecyclerView sliderRecyclerView;

    @BindView(R.id.lyt_parent_stations)
    LinearLayout lytParentStation;
    @BindView(R.id.viewPager)
    ViewPager2 viewPager;

    @BindView(R.id.indicator)
    LinearLayout indicator;

    View view;
    Context ctx;
    ArrayList<RadioInfo> stationList = new ArrayList<>();
    MaterialIntroView materialIntroView;
    private SnackBarUtility sbHelp;
    private CallBackListener callBackListener;
    private FirestoreDbUtility firestoreDbUtility;
    private DestinationSliderAdapter sliderAdapter;
    private Handler sliderHandler = new Handler();

    public MainHomeFragment() {
        // Required empty public constructor
    }


    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        view = inflater.inflate(R.layout.fragment_main_home, container, false);

        ButterKnife.bind(this, view);
        sbHelp = new SnackBarUtility(getActivity());
        materialIntroView = new MaterialIntroView(ctx);
        firestoreDbUtility = new FirestoreDbUtility();

        setupSlider();
        loadDestinations();

        loadRadios();

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

    private void loadRadios() {

        stationList = new ArrayList<>();

        recyclerView.setHasFixedSize(true);
        LinearLayoutManager layoutManager = new LinearLayoutManager(ctx, LinearLayoutManager.HORIZONTAL, true);
        recyclerView.setLayoutManager(layoutManager);

        stationList = prefMgr.getRadioList();

        if (stationList != null && stationList.size() > 0) {
            lytParentStation.setVisibility(View.VISIBLE);
//        if (isCollection(ShardDate.getInstance().getInfoList())) {
//            stationList = (ArrayList<RadioInfo>) ShardDate.getInstance().getInfoList();
            int indexToScrollTo = prefMgr.read("ScrollToPosition", 0);

            ShardDate.getInstance().setRadioInfoList(stationList);
            // Sort destinations by priority
            List<RadioInfo> sortedRadios = getSortedRadios(stationList);

            RadiosAdapter adapter = new RadiosAdapter(RadiosAdapter.VIEW_TYPE_MAIN, ctx, new ArrayList<>(sortedRadios), recyclerView, indexToScrollTo);

            if (!isRadioSelected() && !stationList.isEmpty()) {
                prefMgr.write(AppConstant.Firebase.RADIO_INFO_TABLE, stationList.get(0));
            }

            recyclerView.setAdapter(adapter);
            recyclerView.setItemAnimator(new DefaultItemAnimator());
            adapter.setOnClickListener(new RadiosAdapter.OnClickListener() {
                @Override
                public void onItemClick(View view, RadioInfo radioInfo, int i) {
                    prefMgr.write("ScrollToPosition", i);
                    prefMgr.write(AppConstant.Firebase.RADIO_INFO_TABLE, radioInfo);
                    adapter.selectTaskListItem(i);
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
            // Todo check radio is empty call it again
            lytParentStation.setVisibility(View.GONE);
        }
    }

    private void updateRecycle() {
//        Fragment childFragment = new EpChildFragment();
        Fragment childFragment = new RealTimeEpisodeFragment();
        FragmentTransaction transaction = getChildFragmentManager().beginTransaction();
        transaction.replace(R.id.child_fragment_container, childFragment).commit();
    }

    private void setupSlider() {
        sliderAdapter = new DestinationSliderAdapter(mActivity, this);

        // Set up RecyclerView with horizontal scrolling
        LinearLayoutManager layoutManager = new LinearLayoutManager(mActivity,
                LinearLayoutManager.HORIZONTAL, false);
        sliderRecyclerView.setLayoutManager(layoutManager);
        sliderRecyclerView.setAdapter(sliderAdapter);

        // Add page transformer for animation
        viewPager.setPageTransformer((page, position) -> {
            float r = 1 - Math.abs(position);
            page.setScaleY(0.85f + r * 0.15f);
        });

        // displaying selected image first
        viewPager.setCurrentItem(0);
        addBottomDots(indicator, sliderAdapter.getItemCount(), 0);

        // Register page change callback
        viewPager.registerOnPageChangeCallback(new ViewPager2.OnPageChangeCallback() {
            @Override
            public void onPageSelected(int position) {
                super.onPageSelected(position);
                addBottomDots(indicator, sliderAdapter.getItemCount(), position);

                // Reset auto-scroll timer
                sliderHandler.removeCallbacks(sliderRunnable);
                sliderHandler.postDelayed(sliderRunnable, 3000);
            }
        });
    }

    private void addDummyDestinations() {
        CollectionReference destinationsRef = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.ADVERTISEMENT_TABLE).collection(AppConstant.Firebase.ADVERTISEMENT_TABLE);  // Subcollection named "1001"

        List<DestinationModel> dummyDestinations = Arrays.asList(
                new DestinationModel(
                        "1",
                        "Yemen Mobile",
                        "Sana'a, Tahrir .St",
                        "https://tayramanafm.com/wp-content/uploads/2023/09/358454813_692864899329781_3591857878315610245_n.jpg", // Replace with actual URLs
                        "Experience the majestic beauty of Alaska's mountain ranges. Home to diverse wildlife and stunning glaciers, this destination offers unforgettable hiking and photography opportunities.",
                        3.9f,
                        599.99,
                        5,
                        1,
                        Arrays.asList("hiking", "nature", "adventure"),
                        "Asia"
                ),
                new DestinationModel(
                        "2",
                        "YKB 365",
                        "Sana'a, Jazair .St",
                        "https://tayramanafm.com/wp-content/uploads/2024/08/454352311_970723881752787_8772440098511516660_n.jpg",
                        "Discover the spiritual and natural wonder of the Himalayas. Trek through ancient paths, visit traditional villages, and witness breathtaking sunrise views over snow-capped peaks.",
                        4.0f,
                        799.99,
                        5,
                        2,
                        Arrays.asList("trekking", "culture", "spiritual"),
                        "Asia"
                ),
                new DestinationModel(
                        "3",
                        "One Cash OTC",
                        "Sana'a, 14 Oct .St",
                        "https://onecashye.com/wp-content/uploads/2024/10/WEB-BANNER-2000X882.jpg",
                        "Join a full-day guided tour from Tokyo that travels to Mt Fuji, Japan's iconic mountain. Experience traditional Japanese culture and breathtaking natural beauty.",
                        4.5f,
                        350.00,
                        5,
                        3,
                        Arrays.asList("culture", "nature", "sightseeing"),
                        "Asia"
                ),
                new DestinationModel(
                        "3",
                        "One Cash",
                        "Sana'a, 14 Oct .St",
                        "https://onecashye.com/wp-content/uploads/2021/11/home3-copyone.jpg",
                        "Join a full-day guided tour from Tokyo that travels to Mt Fuji, Japan's iconic mountain. Experience traditional Japanese culture and breathtaking natural beauty.",
                        4.8f,
                        350.00,
                        5,
                        4,
                        Arrays.asList("culture", "nature", "sightseeing"),
                        "Asia"
                )
        );

        for (DestinationModel destination : dummyDestinations) {
            destinationsRef.document(destination.getId()).set(destination);
        }
    }

    private void loadDestinations() {
//        addDummyDestinations();
        List<FirestoreQuery> firestoreQueryList = new ArrayList<>();

        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.Query_Direction_DESCENDING,
                "rating",
                Query.Direction.DESCENDING
        ));

//     db.collection("destinations")
//                .orderBy("rating", Query.Direction.DESCENDING)
//                .limit(10)
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.ADVERTISEMENT_TABLE).collection(AppConstant.Firebase.ADVERTISEMENT_TABLE);  // Subcollection named "1001"
        firestoreDbUtility.getMany(collectionReference, firestoreQueryList, new CallBack() {
            @Override
            public void onSuccess(Object object) {
//                Map<String, Object> resultMap = new Gson().fromJson(object.toString(), Map.class);
                LogUtility.w(TAG, " loadDestinations onSuccess:  " + object.toString());
                List<DestinationModel> destinationList = FirestoreDbUtility.getDataFromQuerySnapshot(object, DestinationModel.class);
//                String obj = new Gson().toJson(destinationList);
//                LogUtility.w(TAG, " loadDestinations onSuccess data:  " + obj);

                // Sort destinations by priority
                List<DestinationModel> sortedDestinations = getSortedDestinations(destinationList);

                sliderAdapter.setDestinations(sortedDestinations);

                // Start auto-scrolling
                startAutoSlide();
            }

            @Override
            public void onFailure(Object object) {
                LogUtility.e(TAG, " loadDestinations onFailure:  " + object);
            }
        });
    }

    private List<RadioInfo> getSortedRadios(List<RadioInfo> radioInfoList) {
        // Sort by priority
        Collections.sort(radioInfoList, (d1, d2) ->
                Integer.compare(d2.getPriority(), d1.getPriority()));

        return radioInfoList;
    }


    private List<DestinationModel> getSortedDestinations(List<DestinationModel> destinations) {
//        List<DestinationModel> destinations = new ArrayList<>();
        // Sort by priority
        Collections.sort(destinations, (d1, d2) ->
                Integer.compare(d2.getPriority(), d1.getPriority()));

        return destinations;
    }


    private void startAutoSlide() {
        sliderHandler.postDelayed(sliderRunnable, 3000);
    }

    private final Runnable sliderRunnable = new Runnable() {
        @Override
        public void run() {
            int currentItem = viewPager.getCurrentItem();
            int totalItems = sliderAdapter.getItemCount();
            int nextItem = (currentItem + 1) % totalItems;
            viewPager.setCurrentItem(nextItem, true);
        }
    };

    private void addBottomDots(LinearLayout layout_dots, int size, int current) {
        ImageView[] dots = new ImageView[size];

        layout_dots.removeAllViews();
        for (int i = 0; i < dots.length; i++) {
            dots[i] = new ImageView(mActivity);
            int width_height = 15;
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(new ViewGroup.LayoutParams(width_height, width_height));
            params.setMargins(10, 10, 10, 10);
            dots[i].setLayoutParams(params);
            dots[i].setImageResource(R.drawable.shape_circle_outline);
            layout_dots.addView(dots[i]);
        }

        if (dots.length > 0) {
            dots[current].setImageResource(R.drawable.shape_circle);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        updateRecycle();
        sliderHandler.postDelayed(sliderRunnable, 3000);
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
        //getActivity() is fully created in onActivityCreated and instanceOf differentiate it between different Activities
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
        // Handle destination click - navigate to details
        Intent intent = new Intent(mActivity, DestinationDetailActivity.class);
        intent.putExtra("destination_id", destination.getId());
        startActivity(intent);
    }

    @Override
    public void onFavoriteClick(DestinationModel destination) {
        // Handle favorite click - update Firestore
        String userId = FirebaseAuth.getInstance().getCurrentUser().getUid();
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.USERS_TABLE).collection(AppConstant.Firebase.USERS_TABLE);
        DocumentReference userFavorites = collectionReference
                .document(userId)
                .collection("favorites")
                .document(destination.getId());

        userFavorites.get().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                if (task.getResult().exists()) {
                    userFavorites.delete();
                } else {
                    userFavorites.set(destination);
                }
            }
        });
    }
}

