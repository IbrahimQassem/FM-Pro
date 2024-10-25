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

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.Query;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.DestinationSliderAdapter;
import com.sana.dev.fm.adapter.RadiosAdapter;
import com.sana.dev.fm.model.DestinationModel;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.interfaces.CallBackListener;
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

//    @BindView(R.id.sliderRecyclerView)
//    RecyclerView sliderRecyclerView;

    @BindView(R.id.lyt_parent_stations)
    LinearLayout lytParentStation;
    @BindView(R.id.viewPager)
    ViewPager2 viewPager;

    @BindView(R.id.dotsLayout)
    LinearLayout dotsLayout;

    View view;
    Context ctx;
    MaterialIntroView materialIntroView;
    private SnackBarUtility sbHelp;
    private CallBackListener callBackListener;
    private FirestoreDbUtility firestoreDbUtility;
    private DestinationSliderAdapter sliderAdapter;
    private List<DestinationModel> destinationList = new ArrayList<>();
    private Handler sliderHandler = new Handler();
    private TextView[] dots;
    final private long delayMillis = 30000;


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

        // Initialize your destinations list
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


        recyclerView.setHasFixedSize(true);
        LinearLayoutManager layoutManager = new LinearLayoutManager(ctx, LinearLayoutManager.HORIZONTAL, true);
        recyclerView.setLayoutManager(layoutManager);

        ArrayList<RadioInfo> stationList = prefMgr.getRadioList();

        if (stationList != null && stationList.size() > 0) {
            lytParentStation.setVisibility(View.VISIBLE);
            int indexToScrollTo = prefMgr.read("ScrollToPosition", 0);

            RadiosAdapter radiosAdapter = new RadiosAdapter(RadiosAdapter.VIEW_TYPE_MAIN, ctx, stationList, recyclerView, indexToScrollTo);

            if (!isRadioSelected() && !stationList.isEmpty()) {
                prefMgr.write(AppConstant.Firebase.RADIO_INFO_TABLE, stationList.get(0));
            }

            recyclerView.setAdapter(radiosAdapter);
            recyclerView.setItemAnimator(new DefaultItemAnimator());
            radiosAdapter.setOnClickListener(new RadiosAdapter.OnClickListener() {
                @Override
                public void onItemClick(View view, RadioInfo radioInfo, int i) {
                    prefMgr.write("ScrollToPosition", i);
                    prefMgr.write(AppConstant.Firebase.RADIO_INFO_TABLE, radioInfo);
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
        // Auto slide setup
        sliderAdapter = new DestinationSliderAdapter(mActivity, this);
        viewPager.setAdapter(sliderAdapter);
        viewPager.registerOnPageChangeCallback(new ViewPager2.OnPageChangeCallback() {
            @Override
            public void onPageSelected(int position) {
                super.onPageSelected(position);
                sliderHandler.removeCallbacks(sliderRunnable);
                sliderHandler.postDelayed(sliderRunnable, delayMillis); // Slide every 3 seconds
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
        for (int i = 0; i < dots.length; i++) {
            dots[i].setTextColor(ContextCompat.getColor(mActivity,
                    i == position ? android.R.color.white : android.R.color.darker_gray));
        }
    }

    private void addDummyDestinations() {
        CollectionReference destinationsRef = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.ADVERTISEMENT_TABLE).collection(AppConstant.Firebase.ADVERTISEMENT_TABLE);

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

//     db.collection("destinations").orderBy("rating", Query.Direction.DESCENDING).limit(10)
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.ADVERTISEMENT_TABLE).collection(AppConstant.Firebase.ADVERTISEMENT_TABLE);
        firestoreDbUtility.getMany(collectionReference, firestoreQueryList, new CallBack() {
            @Override
            public void onSuccess(Object object) {
//                Map<String, Object> resultMap = new Gson().fromJson(object.toString(), Map.class);
                LogUtility.w(TAG, " loadDestinations onSuccess:  " + object.toString());
                destinationList = FirestoreDbUtility.getDataFromQuerySnapshot(object, DestinationModel.class);
//                String obj = new Gson().toJson(destinationList);
//                LogUtility.w(TAG, " loadDestinations onSuccess data:  " + obj);
                // Sort destinations by priority
                List<DestinationModel> sortedDestinations = getSortedDestinations(destinationList);
                sliderAdapter.setDestinations(sortedDestinations);

                setupDots();
            }

            @Override
            public void onFailure(Object object) {
                LogUtility.e(TAG, " loadDestinations onFailure:  " + object);
            }
        });
    }



    private List<DestinationModel> getSortedDestinations(List<DestinationModel> destinations) {
        // Sort by priority
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
//        // Handle destination click - navigate to details
//        Intent intent = new Intent(mActivity, DestinationDetailActivity.class);
//        intent.putExtra("destination_id", destination.getId());
//        startActivity(intent);
    }

    @Override
    public void onFavoriteClick(DestinationModel destination) {
/*        // Handle favorite click - update Firestore
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
        });*/
    }
}

