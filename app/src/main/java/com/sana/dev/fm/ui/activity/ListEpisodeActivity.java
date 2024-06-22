package com.sana.dev.fm.ui.activity;


import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.Toast;

import androidx.appcompat.view.ActionMode;
import androidx.appcompat.view.ActionMode.Callback;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.firebase.firestore.CollectionReference;
import com.google.gson.Gson;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.AdapterListInbox;
import com.sana.dev.fm.databinding.ActivityListEpisodeBinding;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.ui.view.LineItemDecoration;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQuery;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQueryConditionCode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ListEpisodeActivity extends BaseActivity {
    private static final String TAG = ListEpisodeActivity.class.getSimpleName();
    ActivityListEpisodeBinding binding;
    private ActionMode actionMode;
    private ActionModeCallback actionModeCallback;
    private AdapterListInbox mAdapter;
    private RecyclerView recyclerView;
    private ArrayList<Episode> episodeList = new ArrayList<>();
    private FirestoreDbUtility firestoreDbUtility;

    public static void startActivity(Context context, Episode episode) {
        Intent intent = new Intent(context, ListEpisodeActivity.class);
        String obj = (new Gson().toJson(episode));
        intent.putExtra("episode", obj);
        context.startActivity(intent);
    }

    public static void startActivity(Context context) {
        Intent intent = new Intent(context, ListEpisodeActivity.class);
        context.startActivity(intent);
    }

    /* Access modifiers changed, original: protected */
    public void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        setContentView((int) R.layout.activity_list_episode);

        binding = ActivityListEpisodeBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);

        firestoreDbUtility = new FirestoreDbUtility();


        initToolbar();

        String s = getIntent().getStringExtra("episode");
        if (s != null) {

        }

        RadioInfo radioInfo = prefMgr.selectedRadio();
        if (radioInfo != null && radioInfo.getRadioId() != null) {
            initComponent(radioInfo.getRadioId());
        }

    }


    private void initToolbar() {
        binding.toolbar.tvTitle.setText(getString(R.string.update_episode));
        binding.toolbar.imbEvent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });
    }


    private void initComponent(String radioId) {


        RecyclerView recyclerView = (RecyclerView) findViewById(R.id.recyclerView);
        this.recyclerView = recyclerView;
        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        this.recyclerView.addItemDecoration(new LineItemDecoration(this, 1));
        this.recyclerView.setHasFixedSize(true);

        List<FirestoreQuery> firestoreQueryList = new ArrayList<>();
        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.WHERE_EQUAL_TO,
                "radioId",
                radioId
        ));

//        firestoreQueryList.add(new FirestoreQuery(
//                FirestoreQueryConditionCode.WHERE_EQUAL_TO,
//                "disabled",
//                false
//        ));

        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);

//        CollectionReference collectionRefOld = DATABASE.collection(AppConstant.Firebase.EPISODE_TABLE).document(radioId).collection(AppConstant.Firebase.EPISODE_TABLE);  // Subcollection named "1001"
//        FirestoreCollectionTransferHelper transferHelper = new FirestoreCollectionTransferHelper(firestoreDbUtility);

        firestoreDbUtility.getMany(collectionReference, firestoreQueryList, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                List<Episode> episodes = FirestoreDbUtility.getDataFromQuerySnapshot(object, Episode.class);
//                transferHelper.processCollection(collectionReference,episodes);
                episodeList = new ArrayList<>(episodes);
                AdapterListInbox adapterListInbox = new AdapterListInbox(ListEpisodeActivity.this, episodeList);
//        AdapterListInbox adapterListInbox = new AdapterListInbox(this, DataGenerator.getEpisodeData(this));
                mAdapter = adapterListInbox;
                recyclerView.setAdapter(adapterListInbox);
                mAdapter.setOnClickListener(new AdapterListInbox.OnClickListener() {
                    public void onItemClick(View view, Episode episode, int i) {
                        if (mAdapter.getSelectedItemCount() > 0) {
                            enableActionMode(i);
                            return;
                        }
                        Episode item = mAdapter.getItem(i);
                        Context applicationContext = getApplicationContext();
                        StringBuilder stringBuilder = new StringBuilder();
                        stringBuilder.append(" : "+getString(R.string.label_edit));
                        stringBuilder.append(item.getEpName());

                        AddEpisodeActivity.startActivity(ListEpisodeActivity.this, episode);

//                if (view.getId() == R.id.date) {
////                    EpisodeAddStepperVertical
////                    showWarningDialog(stringBuilder.toString(), new DialogInterface.OnClickListener() {
////                        @Override
////                        public void onClick(DialogInterface dialog, int which) {
////                            Toast.makeText(applicationContext, stringBuilder.toString(), Toast.LENGTH_SHORT).show();
////
////                        }
////                    });
//                }
                    }

                    public void onItemLongClick(View view, Episode episode, int i) {
//                        enableActionMode(i);
                        showBottomSheetDialog(episode,radioId);
                    }
                });
                actionModeCallback = new ActionModeCallback(ListEpisodeActivity.this, null);

            }

            @Override
            public void onFailure(Object object) {
                LogUtility.e(TAG, " loadDailyEpisode :  " + object);
            }
        });
    }

    private void enableActionMode(int i) {
        if (this.actionMode == null) {
            this.actionMode = startSupportActionMode(this.actionModeCallback);
        }
        toggleSelection(i);
    }

    private void toggleSelection(int i) {
        this.mAdapter.toggleSelection(i);
        i = this.mAdapter.getSelectedItemCount();
        if (i == 0) {
            this.actionMode.finish();
            return;
        }
        this.actionMode.setTitle(String.valueOf(i));
        this.actionMode.invalidate();
    }

    private void deleteInboxes() {
        List selectedItems = this.mAdapter.getSelectedItems();
        for (int size = selectedItems.size() - 1; size >= 0; size--) {
            this.mAdapter.removeData(((Integer) selectedItems.get(size)).intValue());
        }
        this.mAdapter.notifyDataSetChanged();
    }

//    public boolean onCreateOptionsMenu(Menu menu) {
//        getMenuInflater().inflate(R.menu.menu_publish, menu);
//        return true;
//    }

    public boolean onOptionsItemSelected(MenuItem menuItem) {
        if (menuItem.getItemId() == 16908332) {
            finish();
        } else {
            Toast.makeText(getApplicationContext(), menuItem.getTitle(), Toast.LENGTH_SHORT).show();
        }
        return super.onOptionsItemSelected(menuItem);
    }

    private class ActionModeCallback implements Callback {
        private ActionModeCallback() {
        }

        /* synthetic */ ActionModeCallback(ListEpisodeActivity listEpisodeActivity, String anonymousClass1) {
            this();
        }

        public boolean onPrepareActionMode(ActionMode actionMode, Menu menu) {
            return false;
        }

        public boolean onCreateActionMode(ActionMode actionMode, Menu menu) {
            Tools.setSystemBarColor(ListEpisodeActivity.this, R.color.blue_grey_700);
            actionMode.getMenuInflater().inflate(R.menu.menu_delete, menu);
            return true;
        }

        public boolean onActionItemClicked(ActionMode actionMode, MenuItem menuItem) {
            if (menuItem.getItemId() != R.id.action_delete) {
                return false;
            }
            deleteInboxes();
            actionMode.finish();
            return true;
        }

        public void onDestroyActionMode(ActionMode actionMode) {
            mAdapter.clearSelections();
            actionMode = null;
            Tools.setSystemBarColor(ListEpisodeActivity.this, R.color.red_600);
        }
    }

    private BottomSheetDialog mBottomSheetDialog;

    private void showBottomSheetDialog(Episode obj, String radioId) {
        View findViewById = findViewById(R.id.bottom_sheet);
        View bottom_sheet = findViewById;
        BottomSheetBehavior mBehavior = BottomSheetBehavior.from(findViewById);

        if (mBehavior.getState() == BottomSheetBehavior.STATE_EXPANDED) {
            mBehavior.setState(BottomSheetBehavior.STATE_COLLAPSED);
        }

        View inflate = getLayoutInflater().inflate(R.layout.sheet_ep_options, null);


        inflate.findViewById(R.id.lyt_edit).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                StringBuilder stringBuilder = new StringBuilder();
                stringBuilder.append(getString(R.string.label_edit) + " : ");
                stringBuilder.append(obj.getEpName());

                AddEpisodeActivity.startActivity(ListEpisodeActivity.this, obj);
                mBottomSheetDialog.dismiss();
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

                        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);

                        firestoreDbUtility.createOrMerge(collectionReference, obj.getEpId(), docData, new CallBack() {
                            @Override
                            public void onSuccess(Object object) {
//                                            showToast(getString(R.string.done_successfully));
                            }

                            @Override
                            public void onFailure(Object object) {
//                                            showToast(getString(R.string.label_error_occurred_with_val,object));
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
                        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);
                        firestoreDbUtility.deleteDocument(collectionReference, obj.getEpId(), new CallBack() {
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
                }));
                showWarningDialog(config);
                mBottomSheetDialog.dismiss();
            }
        });


        BottomSheetDialog bottomSheetDialog = new BottomSheetDialog(ListEpisodeActivity.this);
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
