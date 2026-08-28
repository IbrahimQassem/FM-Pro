package com.sana.dev.fm.ui.fragment;


import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.BounceInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.firebase.ui.firestore.FirestoreRecyclerAdapter;
import com.firebase.ui.firestore.FirestoreRecyclerOptions;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.firebase.Timestamp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.Transaction;
import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.ChatHolder;
import com.sana.dev.fm.adapter.SimpleSectionedRecyclerViewAdapter;
import com.sana.dev.fm.databinding.ItemGridBinding;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.enums.UserType;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.model.interfaces.OnItemLongClick;
import com.sana.dev.fm.ui.activity.AddEpisodeActivity;
import com.sana.dev.fm.ui.activity.CommentsActivity;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.ui.activity.ProgramDetailsActivity;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * A simple {@link Fragment} subclass.
 * Use the {@link RealTimeEpisodeFragment#newInstance} factory method to
 * create an instance of this fragment.
 */
public class RealTimeEpisodeFragment extends BaseFragment implements FirebaseAuth.AuthStateListener {
    private static final String TAG = RealTimeEpisodeFragment.class.getSimpleName();

    static {
        FirebaseFirestore.setLoggingEnabled(true);
    }

    View view;
    Context context;
    FirestoreDbUtility firestoreDbUtility;

    @BindView(R.id.rvFeed)
    RecyclerView recyclerView;
    @BindView(R.id.child_fragment_container)
    FrameLayout cf_container;

    RecyclerView.Adapter adapter;
    private FirebaseFirestore db;

    public RealTimeEpisodeFragment() {
        // Required empty public constructor
    }

    /**
     * Use this factory method to create a new instance of
     * this fragment using the provided parameters.
     *
     * @return A new instance of fragment FirestoreChatFragment.
     */
    public static RealTimeEpisodeFragment newInstance() {
        RealTimeEpisodeFragment fragment = new RealTimeEpisodeFragment();
        Bundle args = new Bundle();
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
//        if (getArguments() != null) {
//        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        context = getActivity();
        // Inflate the layout for this fragment
        view = inflater.inflate(R.layout.fragment_real_time_episode, container, false);
        // Inflate the layout for this fragment
        ButterKnife.bind(this, view);
        firestoreDbUtility = new FirestoreDbUtility();
        this.db = FirebaseFirestore.getInstance();


        init();
        return view;
    }

    @Override
    public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
        String primary = prefMgr.selectedRadio() != null ? prefMgr.selectedRadio().getName() : "";
        EmptyViewFragment emptyViewFragment = EmptyViewFragment.newInstance(context.getString(R.string.no_data_available), String.format("%s", getResources().getString(R.string.msg_no_data_for, primary)), null);
        FragmentTransaction transaction = getChildFragmentManager().beginTransaction();
        transaction.replace(R.id.child_fragment_container, emptyViewFragment).commit();
        emptyViewFragment.setOnItemClickListener(new CallBackListener() {
            @Override
            public void onCallBack() {
                if ((MainActivity) getActivity() != null)
                    ((MainActivity) getActivity()).selectTab(R.id.navigation_home);
            }
        });

        toggleView(false);
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


    private void loadEpisodes() {
//        db.collection("episodes")
//                .orderBy("timestamp", Query.Direction.DESCENDING)
//                .addSnapshotListener((value, error) -> {
//                    if (error != null) {
//                        Toast.makeText(this, "Error loading episodes: " + error.getMessage(),
//                                Toast.LENGTH_SHORT).show();
//                        return;
//                    }
//
//                    episodes.clear();
//                    for (DocumentSnapshot doc : value.getDocuments()) {
//                        Episode episode = doc.toObject(Episode.class);
//                        if (episode != null) {
//                            episode.setId(doc.getId());
//                            episodes.add(episode);
//                        }
//                    }
//                    adapter.notifyDataSetChanged();
//                });
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

        String radioId = prefMgr.selectedRadio() != null && prefMgr.selectedRadio().getRadioId() != null ? prefMgr.selectedRadio().getRadioId() : "";
        LogUtility.d(LogUtility.TAG, " radioId : " + radioId + " time is  : " + String.valueOf(System.currentTimeMillis()));

        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection()
                .document(AppConstant.Firebase.EPISODES_COLLECTION)
                .collection(AppConstant.Firebase.EPISODES_COLLECTION);
        Query episodeQuery = collectionReference;
//        LogUtility.d(LogUtility.TAG, " episodeQuery : " + episodeQuery.get());

        //    /** Get the last 50 chat messages ordered by timestamp . */
        ////    private static final Query sChatQuery =
        ////            sChatCollection.orderBy("timestamp", Query.Direction.DESCENDING).limit(50);


// Create a date object representing the desired date
//        Date specificDate = new Date(yourYear, yourMonth - 1, yourDay); // Adjust year, month (0-based), and day


        FirestoreRecyclerOptions<Episode> options =
                new FirestoreRecyclerOptions.Builder<Episode>()
                        .setQuery(episodeQuery, Episode.class)
                        .setLifecycleOwner(this)
                        .build();

        return new FirestoreRecyclerAdapter<Episode, ChatHolder>(options) {
            @NonNull
            @Override
            public ChatHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
                ItemGridBinding inflate = ItemGridBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
                return new ChatHolder(inflate);
            }

//            @Override
//            public Query onCreateQuery() {
//                return FirebaseFirestore.getInstance().collection("yourCollectionName")
//                        .whereEqualTo("disabled", false); // Filter where disabled is false
//            }

            @Override
            protected void onBindViewHolder(@NonNull ChatHolder holder, int position, @NonNull Episode model) {
//                LogUtility.d(LogUtility.TAG, "res newAdapter : " + new Gson().toJson(model));
                if (RealTimeEpisodeFragment.this.isAccountSignedIn()) {
                    model.userId = prefMgr.getUserSession().getUserId();
                }
                ChatHolder viewHolder = (ChatHolder) holder;
//                if (model != null && !model.isDisabled())
                viewHolder.bind(model, position);

//                // Check the disabled field and update visibility
//                if (model != null && model.isDisabled()) { // Assuming your MyItem class has a getter for disabled field
////                    holder.itemView.setVisibility(View.GONE);
//                } else {
////                    holder.itemView.setVisibility(View.VISIBLE);
//                }

                viewHolder.setOnLongItemClickListener(new OnItemLongClick() {
                    @Override
                    public void onItemLongClick(View view, Object obj, int position) {
                        Episode item = (Episode) obj;

                        if (RealTimeEpisodeFragment.this.isAccountSignedIn() && prefMgr.getUserSession().getUserType() == UserType.SuperADMIN)
                            showBottomSheetDialog(item, radioId);
                    }
                });

                viewHolder.setOnItemClickListener(new OnClickListener() {
                    @Override
                    public void onItemClick(View view, Object obj, int position) {
                        Episode item = (Episode) obj;
                        int[] startingLocation = new int[2];
                        switch (view.getId()) {
                            case R.id.civ_logo:
                                if (BuildConfig.FLAVOR.equals("internews") || BuildConfig.FLAVOR.equals("hudhudOfficial") || BuildConfig.FLAVOR.equals("hudhudDev")) {
                                    view.getLocationOnScreen(startingLocation);
                                    ProgramDetailsActivity.startUserProfileFromLocation(startingLocation, context, item);
                                    getActivity().overridePendingTransition(0, 0);
                                }

                                break;
                            case R.id.lyt_comment_parent:
                            case R.id.imv_comment:
                                view.getLocationOnScreen(startingLocation);
                                CommentsActivity.startActivity(context, item);
                                getActivity().overridePendingTransition(0, 0);
                                break;
                            case R.id.imv_like:
                                if (!RealTimeEpisodeFragment.this.isAccountSignedIn()) {
                                    if (context instanceof MainActivity) {
                                        ModelConfig config = new ModelConfig(-1, getString(R.string.label_note), getString(R.string.goto_login), new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                                            @Override
                                            public void onClick(View v) {
                                                startActivity(new Intent(IntentHelper.intentFormSignUp(context, false)));
                                            }
                                        }));
                                        showWarningDialog(config);
                                    }
                                } else {
                                    String currentUid = prefMgr.getUserSession() != null && prefMgr.getUserSession().getUserId() != null
                                            ? prefMgr.getUserSession().getUserId()
                                            : (FirebaseAuth.getInstance().getCurrentUser() != null ? FirebaseAuth.getInstance().getCurrentUser().getUid() : "guest_user");
                                    toggleLike((ImageView) view, item, currentUid);
                                }
                                break;
                            case R.id.lyt_share_parent:
                            case R.id.imv_share:
                                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                                shareIntent.setType("text/plain");
                                String shareText = item.getEpName();
                                if (item.getEpDesc() != null && !item.getEpDesc().isEmpty()) {
                                    shareText += "\n" + item.getEpDesc();
                                }
                                shareText += "\n" + getString(R.string.app_name);
                                shareIntent.putExtra(Intent.EXTRA_SUBJECT, item.getEpName());
                                shareIntent.putExtra(Intent.EXTRA_TEXT, shareText);
                                context.startActivity(Intent.createChooser(shareIntent, context.getString(R.string.share_with)));
                                break;
                            case R.id.bt_more:
                                if (RealTimeEpisodeFragment.this.isAccountSignedIn() && prefMgr.getUserSession().getUserType() == UserType.SuperADMIN) {
                                    showBottomSheetDialog(item, radioId);
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

                toggleView(adapter.getItemCount() == 0);
            }

            @Override
            public void onDataChanged() {
                if (getItemCount() == 0) {
                    showSeedEpisodesFallback(radioId);
                } else {
                    toggleView(false);
                }
            }

            @Override
            public void onError(@NonNull com.google.firebase.firestore.FirebaseFirestoreException e) {
                showSeedEpisodesFallback(radioId);
            }
        };
    }

    private void showSeedEpisodesFallback(String radioId) {
        if (!BuildConfig.DEBUG) {
            toggleView(true);
            return;
        }
        List<Episode> seedList = com.sana.dev.fm.data.datasource.LocalSeedEpisodeDataSource.loadSeedEpisodes(context, radioId);
        if (seedList != null && !seedList.isEmpty()) {
            recyclerView.setAdapter(new RecyclerView.Adapter<ChatHolder>() {
                @NonNull
                @Override
                public ChatHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
                    ItemGridBinding inflate = ItemGridBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
                    return new ChatHolder(inflate);
                }

                @Override
                public void onBindViewHolder(@NonNull ChatHolder holder, int position) {
                    Episode ep = seedList.get(position);
                    holder.bind(ep, position);
                    holder.setOnItemClickListener((v, obj, pos) -> {
                        int[] startingLocation = new int[2];
                        v.getLocationOnScreen(startingLocation);
                        ProgramDetailsActivity.startUserProfileFromLocation(startingLocation, context, (Episode) obj);
                    });
                }

                @Override
                public int getItemCount() {
                    return seedList.size();
                }
            });
            toggleView(false);
        } else {
            toggleView(true);
        }
    }

    private BottomSheetDialog mBottomSheetDialog;

    private void showBottomSheetDialog(Episode obj, String radioId) {
        View findViewById = view.findViewById(R.id.bottom_sheet);
        if (findViewById != null) {
            BottomSheetBehavior mBehavior = BottomSheetBehavior.from(findViewById);
            if (mBehavior.getState() == BottomSheetBehavior.STATE_EXPANDED) {
                mBehavior.setState(BottomSheetBehavior.STATE_COLLAPSED);
            }
        }

        View inflate = getLayoutInflater().inflate(R.layout.sheet_ep_options, null);

        inflate.findViewById(R.id.lyt_edit).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                AddEpisodeActivity.startActivity(context, obj);
                if (mBottomSheetDialog != null) mBottomSheetDialog.dismiss();
            }
        });

        inflate.findViewById(R.id.lyt_hide).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                ModelConfig config = new ModelConfig(R.drawable.world_map, getString(R.string.label_warning), getString(R.string.confirm_hide, obj.getEpName()), new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        obj.setDisabled(true);
                        Map<String, Object> docData = new HashMap<>();
                        docData.put("disabled", obj.isDisabled());
                        docData.put("isActive", false);

                        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection()
                                .document(AppConstant.Firebase.EPISODES_COLLECTION)
                                .collection(AppConstant.Firebase.EPISODES_COLLECTION);

                        String epDocId = obj.getEpId() != null && !obj.getEpId().isEmpty() ? obj.getEpId() : "";
                        if (!epDocId.isEmpty()) {
                            firestoreDbUtility.createOrMerge(collectionReference, epDocId, docData, new CallBack() {
                                @Override
                                public void onSuccess(Object object) {
                                }

                                @Override
                                public void onFailure(Object object) {
                                }
                            });
                        }
                    }
                }));
                showWarningDialog(config);
                if (mBottomSheetDialog != null) mBottomSheetDialog.dismiss();
            }
        });

        inflate.findViewById(R.id.lyt_delete).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                ModelConfig config = new ModelConfig(R.drawable.world_map, getString(R.string.label_warning), getString(R.string.confirm_delete, obj.getEpName()), null, new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection()
                                .document(AppConstant.Firebase.EPISODES_COLLECTION)
                                .collection(AppConstant.Firebase.EPISODES_COLLECTION);

                        String epDocId = obj.getEpId() != null && !obj.getEpId().isEmpty() ? obj.getEpId() : "";
                        if (!epDocId.isEmpty()) {
                            firestoreDbUtility.deleteDocument(collectionReference, epDocId, new CallBack() {
                                @Override
                                public void onSuccess(Object object) {
                                    showToast(getString(R.string.deleted_successfully_with_param, obj.getEpName()));
                                }

                                @Override
                                public void onFailure(Object object) {
                                    showToast(getString(R.string.error_failure));
                                }
                            });
                        }
                    }
                }));
                showWarningDialog(config);
                if (mBottomSheetDialog != null) mBottomSheetDialog.dismiss();
            }
        });

        BottomSheetDialog bottomSheetDialog = new BottomSheetDialog(context);
        this.mBottomSheetDialog = bottomSheetDialog;
        bottomSheetDialog.setContentView(inflate);
        if (Build.VERSION.SDK_INT >= 21 && this.mBottomSheetDialog.getWindow() != null) {
            this.mBottomSheetDialog.getWindow().addFlags(67108864);
        }
        this.mBottomSheetDialog.show();
        this.mBottomSheetDialog.setOnDismissListener(new DialogInterface.OnDismissListener() {
            public void onDismiss(DialogInterface dialogInterface) {
                mBottomSheetDialog = null;
            }
        });
    }

    void toggleView(boolean hide) {
        recyclerView.setVisibility(!hide ? View.VISIBLE : View.GONE);
        cf_container.setVisibility(hide ? View.VISIBLE : View.GONE);
    }

    private void toggleLike(ImageView likeButton, Episode episode, String currentUserId) {
        if (currentUserId == null || currentUserId.isEmpty()) {
            showToast(getString(R.string.goto_login));
            return;
        }

        likeButton.setEnabled(false);

        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection()
                .document(AppConstant.Firebase.EPISODES_COLLECTION)
                .collection(AppConstant.Firebase.EPISODES_COLLECTION);

        String epId = episode.getEpId() != null && !episode.getEpId().isEmpty() ? episode.getEpId() : "";
        if (epId.isEmpty()) {
            likeButton.setEnabled(true);
            return;
        }

        DocumentReference docRef = collectionReference.document(epId);

        Map<String, Boolean> likes = episode.getEpisodeLikes();
        if (likes == null) {
            likes = new HashMap<>();
        }

        int count = episode.getLikesCount();
        boolean isLiked = Boolean.TRUE.equals(likes.get(currentUserId));
        if (isLiked) {
            likes.remove(currentUserId);
            count = Math.max(0, count - 1);
        } else {
            likes.put(currentUserId, true);
            count++;
        }

        final int finalCount = count;
        final boolean finalIsLiked = !isLiked;
        final Map<String, Boolean> finalLikes = likes;

        Map<String, Object> docData = new HashMap<>();
        docData.put("episodeLikes", likes);
        docData.put("likesCount", count);

        docRef.set(docData, com.google.firebase.firestore.SetOptions.merge()).addOnSuccessListener(aVoid -> {
            likeButton.setEnabled(true);
            episode.setEpisodeLikes(finalLikes);
            episode.setLikesCount(finalCount);
            if (finalIsLiked) {
                likeButton.setImageResource(R.drawable.ic_heart_small_blue);
            } else {
                likeButton.setImageResource(R.drawable.ic_heart_outline_grey);
            }
            animateLikeButton(likeButton);
            if (adapter != null) {
                adapter.notifyDataSetChanged();
            }
        }).addOnFailureListener(e -> {
            likeButton.setEnabled(true);
            LogUtility.e(LogUtility.TAG, "failure toggleLike: " + e.getMessage());
        });
    }

    private void animateLikeButton(ImageView likeButton) {
        ObjectAnimator scaleX = ObjectAnimator.ofFloat(likeButton, "scaleX", 1f, 1.2f, 1f);
        ObjectAnimator scaleY = ObjectAnimator.ofFloat(likeButton, "scaleY", 1f, 1.2f, 1f);

        AnimatorSet animatorSet = new AnimatorSet();
        animatorSet.playTogether(scaleX, scaleY);
        animatorSet.setDuration(300);
        animatorSet.setInterpolator(new BounceInterpolator());
        animatorSet.start();
    }

}
