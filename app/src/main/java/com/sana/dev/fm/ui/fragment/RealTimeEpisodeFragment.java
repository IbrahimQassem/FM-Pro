package com.sana.dev.fm.ui.fragment;


import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.firebase.ui.firestore.FirestoreRecyclerAdapter;
import com.firebase.ui.firestore.FirestoreRecyclerOptions;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.firestore.FirebaseFirestore;
import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.ChatHolder;
import com.sana.dev.fm.adapter.SimpleSectionedRecyclerViewAdapter;
import com.sana.dev.fm.databinding.ItemGridBinding;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.UserType;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.activity.CommentsActivity;
import com.sana.dev.fm.ui.activity.AddEpisodeActivity;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.ui.activity.ProgramDetailsActivity;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.FmEpisodeCRUDImpl;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * A simple {@link Fragment} subclass.
 * Use the {@link RealTimeEpisodeFragment#newInstance} factory method to
 * create an instance of this fragment.
 */
public class RealTimeEpisodeFragment extends BaseFragment implements FirebaseAuth.AuthStateListener {

    // TODO: Rename parameter arguments, choose names that match
    // the fragment initialization parameters, e.g. ARG_ITEM_NUMBER
    private static final String ARG_PARAM1 = "param1";
    private static final String ARG_PARAM2 = "param2";

    // TODO: Rename and change types of parameters
    private String mParam1;
    private String mParam2;

    private static final String TAG = RealTimeEpisodeFragment.class.getSimpleName();

//    private static final CollectionReference sChatCollection =
//            FirebaseFirestore.getInstance().collection("chats");

    /** Get the last 50 chat messages ordered by timestamp . */
//    private static final Query sChatQuery =
//            sChatCollection.orderBy("timestamp", Query.Direction.DESCENDING).limit(50);

    static {
        FirebaseFirestore.setLoggingEnabled(true);
    }

    View view;
    Context context;
    FmEpisodeCRUDImpl ePiRepo;

    @BindView(R.id.rvFeed)
    RecyclerView recyclerView;
    @BindView(R.id.child_fragment_container)
    FrameLayout cf_container;

    RecyclerView.Adapter adapter;

    public RealTimeEpisodeFragment() {
        // Required empty public constructor
    }

    /**
     * Use this factory method to create a new instance of
     * this fragment using the provided parameters.
     *
     * @param param1 Parameter 1.
     * @param param2 Parameter 2.
     * @return A new instance of fragment FirestoreChatFragment.
     */
    // TODO: Rename and change types and number of parameters
    public static RealTimeEpisodeFragment newInstance(String param1, String param2) {
        RealTimeEpisodeFragment fragment = new RealTimeEpisodeFragment();
        Bundle args = new Bundle();
        args.putString(ARG_PARAM1, param1);
        args.putString(ARG_PARAM2, param2);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            mParam1 = getArguments().getString(ARG_PARAM1);
            mParam2 = getArguments().getString(ARG_PARAM2);
        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        context = getActivity();
        // Inflate the layout for this fragment
        view = inflater.inflate(R.layout.fragment_real_time_episode, container, false);
        // Inflate the layout for this fragment
        ButterKnife.bind(this, view);
        ePiRepo = new FmEpisodeCRUDImpl((MainActivity) context, FirebaseConstants.EPISODE_TABLE);

        init();
        return view;
    }

    @Override
    public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
        String primary = prefMgr.selectedRadio() != null ? prefMgr.selectedRadio().getName() : "";
        EmptyViewFragment emptyViewFragment = EmptyViewFragment.newInstance(context.getString(R.string.no_data_available), String.format(" %s", getResources().getString(R.string.empty_ep, primary)), null);
        FragmentTransaction transaction = getChildFragmentManager().beginTransaction();
        transaction.replace(R.id.child_fragment_container, emptyViewFragment).commit();
        emptyViewFragment.setOnItemClickListener(new CallBackListener() {
            @Override
            public void onCallBack() {
                if ((MainActivity) getActivity() != null)
                    ((MainActivity) getActivity()).selectTab(R.id.navigation_home);
            }
        });
    }

    void init() {

        LinearLayoutManager manager = new LinearLayoutManager(context);
        manager.setReverseLayout(true);
        manager.setStackFromEnd(true);

//        recyclerView.setHasFixedSize(true);
        recyclerView.setLayoutManager(manager);

        recyclerView.addOnLayoutChangeListener(new View.OnLayoutChangeListener() {
            @Override
            public void onLayoutChange(View view, int left, int top, int right, int bottom,
                                       int oldLeft, int oldTop, int oldRight, int oldBottom) {
                if (bottom < oldBottom) {
                    recyclerView.postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            recyclerView.smoothScrollToPosition(0);
                        }
                    }, 100);
                }
            }
        });


    }

    @Override
    public void onStart() {
        super.onStart();
        if (isRadioSelected()) {
            attachRecyclerViewAdapter();
        }
        FirebaseAuth.getInstance().addAuthStateListener(this);
    }

    @Override
    public void onStop() {
        super.onStop();
        FirebaseAuth.getInstance().removeAuthStateListener(this);
    }

    @Override
    public void onAuthStateChanged(@NonNull FirebaseAuth auth) {

//        if (isRadioSelected()) {
//            attachRecyclerViewAdapter();
//        } else {
////            Toast.makeText(context, R.string.not_allowd, Toast.LENGTH_SHORT).show();
//            auth.signInAnonymously().addOnCompleteListener(new SignInResultNotifier(context));
//        }
    }


    private void attachRecyclerViewAdapter() {
//        final RecyclerView.Adapter adapter = newAdapter();
        adapter = newAdapter();

        //This is the code to provide a sectioned list
        List<SimpleSectionedRecyclerViewAdapter.Section> sections =
                new ArrayList<SimpleSectionedRecyclerViewAdapter.Section>();

        //Sections
//        sections.add(new SimpleSectionedRecyclerViewAdapter.Section(0,"Section 1"));
//        sections.add(new SimpleSectionedRecyclerViewAdapter.Section(5,"Section 2"));
//        sections.add(new SimpleSectionedRecyclerViewAdapter.Section(12,"Section 3"));
//        sections.add(new SimpleSectionedRecyclerViewAdapter.Section(14,"Section 4"));
//        sections.add(new SimpleSectionedRecyclerViewAdapter.Section(20,"Section 5"));

        //Add your adapter to the sectionAdapter
        SimpleSectionedRecyclerViewAdapter.Section[] dummy = new SimpleSectionedRecyclerViewAdapter.Section[sections.size()];
        SimpleSectionedRecyclerViewAdapter mSectionedAdapter = new
                SimpleSectionedRecyclerViewAdapter(context, R.layout.layout_section, R.id.section_text, adapter);
        mSectionedAdapter.setSections(sections.toArray(dummy));

        recyclerView.setAdapter(mSectionedAdapter);
    }


    @NonNull
    private RecyclerView.Adapter newAdapter() {

        String radioId = prefMgr.selectedRadio().getRadioId();
        LogUtility.d(LogUtility.TAG, " radioId : " + radioId + " time is  : " + String.valueOf(System.currentTimeMillis()));

        FirestoreRecyclerOptions<Episode> options =
                new FirestoreRecyclerOptions.Builder<Episode>()
                        .setQuery(ePiRepo.createSimpleQueries(radioId), Episode.class)
                        .setLifecycleOwner(this)
                        .build();

        return new FirestoreRecyclerAdapter<Episode, ChatHolder>(options) {
            @NonNull
            @Override
            public ChatHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
                ItemGridBinding inflate = ItemGridBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
                return new ChatHolder(inflate);
            }

            @Override
            protected void onBindViewHolder(@NonNull ChatHolder holder, int position, @NonNull Episode model) {
//                LogUtility.d(LogUtility.TAG, "res newAdapter : " + new Gson().toJson(model));

                if (RealTimeEpisodeFragment.this.isAccountSignedIn()) {
                    model.userId = prefMgr.getUserSession().getUserId();
                }
                ChatHolder viewHolder = (ChatHolder) holder;

                if (model != null && !model.isStopped())
                    viewHolder.bind(model, position);

                viewHolder.setOnLongItemClickListener(new ChatHolder.OnLongItemClickListener() {
                    @Override
                    public void onLongItemClick(View view, Episode obj, int position) {
                        if (RealTimeEpisodeFragment.this.isAccountSignedIn() && prefMgr.getUserSession().getUserType() == UserType.SuperADMIN)
                            showBottomSheetDialog(obj, position);
                    }
                });

                viewHolder.setOnItemClickListener(new ChatHolder.OnItemClickListener() {
                    @Override
                    public void onItemClick(View view, Episode obj, int position) {
                        int[] startingLocation = new int[2];
                        switch (view.getId()) {
                            case R.id.civ_logo:
                                if (BuildConfig.FLAVOR.equals("internews") || BuildConfig.FLAVOR.equals("hudhud") || (BuildConfig.FLAVOR.equals("hudhudfm_google_play") && BuildConfig.DEBUG)) {
                                    view.getLocationOnScreen(startingLocation);
                                    ProgramDetailsActivity.startUserProfileFromLocation(startingLocation, context, obj);
                                    getActivity().overridePendingTransition(0, 0);
                                }

                                break;
                            case R.id.lyt_comment_parent:
                            case R.id.imv_comment:
                                view.getLocationOnScreen(startingLocation);
                                CommentsActivity.startActivity(context, obj);
                                getActivity().overridePendingTransition(0, 0);
                                break;
                            case R.id.imv_like:
                                if (!RealTimeEpisodeFragment.this.isAccountSignedIn()) {
                                    if (context instanceof MainActivity) {
                                        ModelConfig config = new ModelConfig(-1, getString(R.string.label_note), getString(R.string.goto_login), new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                                            @Override
                                            public void onClick(View v) {
                                                startActivity(new Intent(IntentHelper.phoneLoginActivity(context, false)));
                                            }
                                        }));
                                        showWarningDialog(config);
                                    }
                                } else {
                                    boolean isLik = !model.isLiked;
                                    HashMap<String, Boolean> likeMap = new HashMap<>();
                                    likeMap.put(prefMgr.getUserSession().getUserId(), isLik);
                                    model.setEpisodeLikes(likeMap);
                                    ePiRepo.updateLike( model, new CallBack() {
                                        @Override
                                        public void onSuccess(Object object) {
                                        }

                                        @Override
                                        public void onError(Object object) {
                                            LogUtility.e("Error like", object.toString());
                                        }
                                    });
                                }
                                break;
                            case R.id.bt_toggle:
//                                recyclerView.notifySubtreeAccessibilityStateChanged();
                                adapter.notifyDataSetChanged();
//                                Toast.makeText(context, "bt_toggle", Toast.LENGTH_SHORT).show();
                                break;
                        }
                    }
                });

            }

            @Override
            public void onDataChanged() {
                // If there are no chat messages, show a view that invites the user to add a message.
                cf_container.setVisibility(getItemCount() == 0 ? View.VISIBLE : View.GONE);
            }
        };
    }

    private BottomSheetDialog mBottomSheetDialog;

    private void showBottomSheetDialog(Episode obj, int position) {
        View findViewById = view.findViewById(R.id.bottom_sheet);
        View bottom_sheet = findViewById;
        BottomSheetBehavior mBehavior = BottomSheetBehavior.from(findViewById);

        if (mBehavior.getState() == BottomSheetBehavior.STATE_EXPANDED) {
            mBehavior.setState(BottomSheetBehavior.STATE_COLLAPSED);
        }

        View inflate = getLayoutInflater().inflate(R.layout.sheet_ep_options, null);


        inflate.findViewById(R.id.lyt_edit).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                StringBuilder stringBuilder = new StringBuilder();
                stringBuilder.append(context.getString(R.string.label_edit) + " : ");
                stringBuilder.append(obj.getEpName());

                AddEpisodeActivity.startActivity(context, obj);
                mBottomSheetDialog.dismiss();
            }
        });


        inflate.findViewById(R.id.lyt_hide).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                ModelConfig config = new ModelConfig(R.drawable.world_map, getString(R.string.label_warning), getString(R.string.confirm_hide, obj.getEpName()), new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        obj.setStopped(true);
                        ePiRepo.updateEpisodeState(obj, new CallBack() {
                            @Override
                            public void onSuccess(Object object) {
                                showToast(getString(R.string.done_successfully));
                            }

                            @Override
                            public void onError(Object object) {
                                showToast(getString(R.string.error_failure));
                            }
                        });
                    }
                }));
                showWarningDialog(config);
                mBottomSheetDialog.dismiss();
            }
        });

        inflate.findViewById(R.id.lyt_delete).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                ModelConfig config = new ModelConfig(R.drawable.world_map, getString(R.string.label_warning), getString(R.string.confirm_delete, obj.getEpName()), null, new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        ePiRepo.delete(obj, new CallBack() {
                            @Override
                            public void onSuccess(Object object) {
                                showToast(getString(R.string.deleted_successfully_with_param, obj.getEpName()));
                            }

                            @Override
                            public void onError(Object object) {
                                showToast(getString(R.string.error_failure));
                            }
                        });
                    }
                }));
                showWarningDialog(config);
                mBottomSheetDialog.dismiss();
            }
        });


        BottomSheetDialog bottomSheetDialog = new BottomSheetDialog(context);
        this.mBottomSheetDialog = bottomSheetDialog;
        bottomSheetDialog.setContentView(inflate);
        if (Build.VERSION.SDK_INT >= 21) {
            this.mBottomSheetDialog.getWindow().addFlags(67108864);
        }
        this.mBottomSheetDialog.show();
        this.mBottomSheetDialog.setOnDismissListener(new DialogInterface.OnDismissListener() {
            public void onDismiss(DialogInterface dialogInterface) {
                mBottomSheetDialog = null;
            }
        });

        inflate.findViewById(R.id.lyt_make_close).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                bottomSheetDialog.dismiss();
            }
        });
    }


}