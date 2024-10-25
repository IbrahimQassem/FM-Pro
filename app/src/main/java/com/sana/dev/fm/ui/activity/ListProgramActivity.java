package com.sana.dev.fm.ui.activity;


import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.Toast;

import androidx.appcompat.view.ActionMode;
import androidx.appcompat.view.ActionMode.Callback;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.firebase.firestore.CollectionReference;
import com.google.gson.Gson;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.AdapterListProgram;
import com.sana.dev.fm.databinding.ActivityListProgramBinding;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.model.interfaces.OnItemLongClick;
import com.sana.dev.fm.ui.view.LineItemDecoration;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQuery;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQueryConditionCode;

import java.util.ArrayList;
import java.util.List;

public class ListProgramActivity extends BaseActivity {
    private static final String TAG = ListProgramActivity.class.getSimpleName();
    ActivityListProgramBinding binding;
    private ActionMode actionMode;
    private ActionModeCallback actionModeCallback;
    private AdapterListProgram mAdapter;
    private RecyclerView recyclerView;
    private ArrayList<RadioProgram> itemList = new ArrayList<>();
    private FirestoreDbUtility firestoreDbUtility;

    public static void startActivity(Context context, RadioProgram episode) {
        Intent intent = new Intent(context, ListProgramActivity.class);
        String obj = (new Gson().toJson(episode));
        intent.putExtra("radioProgram", obj);
        context.startActivity(intent);
    }

    public static void startActivity(Context context) {
        Intent intent = new Intent(context, ListProgramActivity.class);
        context.startActivity(intent);
    }

    /* Access modifiers changed, original: protected */
    public void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        setContentView((int) R.layout.activity_list_program);

        binding = ActivityListProgramBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);

        firestoreDbUtility = new FirestoreDbUtility();


        initToolbar();


        RadioInfo radioInfo = prefMgr.selectedRadio();
        if (radioInfo != null && radioInfo.getRadioId() != null) {
            initComponent(radioInfo.getRadioId());
        }

    }


    private void initToolbar() {
        binding.toolbar.tvTitle.setText(getString(R.string.update_program));
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

        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.RADIO_PROGRAM_TABLE, radioId).document(AppConstant.Firebase.RADIO_PROGRAM_TABLE).collection(AppConstant.Firebase.RADIO_PROGRAM_TABLE);

//        CollectionReference collectionRefOld = DATABASE.collection(AppConstant.Firebase.RADIO_PROGRAM_TABLE).document(radioId).collection(AppConstant.Firebase.RADIO_PROGRAM_TABLE);
//        FirestoreCollectionTransferHelper transferHelper = new FirestoreCollectionTransferHelper(firestoreDbUtility);

        firestoreDbUtility.getMany(collectionReference, firestoreQueryList, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                List<RadioProgram> radioProgramList = FirestoreDbUtility.getDataFromQuerySnapshot(object, RadioProgram.class);
//                transferHelper.processCollection(collectionReference, radioProgramList);

                itemList = new ArrayList<>(radioProgramList);
                AdapterListProgram adapterListInbox = new AdapterListProgram(ListProgramActivity.this, itemList);
//        AdapterListProgram adapterListInbox = new AdapterListProgram(this, DataGenerator.getEpisodeData(this));
                mAdapter = adapterListInbox;
                recyclerView.setAdapter(adapterListInbox);
                mAdapter.setOnClickListener(new OnClickListener() {
                    @Override
                    public void onItemClick(View view, Object obj, int position) {
                        RadioProgram item = (RadioProgram) obj;
                        if (mAdapter.getSelectedItemCount() > 0) {
                            enableActionMode(position);
                            return;
                        }
                        RadioProgram _item = mAdapter.getItem(position);
                        Context applicationContext = getApplicationContext();
                        StringBuilder stringBuilder = new StringBuilder();
                        stringBuilder.append(" : " + getString(R.string.label_edit));
                        stringBuilder.append(_item.getPrName());

                        AddProgramActivity.startActivity(ListProgramActivity.this, _item);

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
                });
                mAdapter.setOnLongClickListener(new OnItemLongClick() {
                    @Override
                    public void onItemLongClick(View view, Object obj, int position) {
                        RadioProgram item = (RadioProgram) obj;
                        enableActionMode(position);
                    }
                });

                actionModeCallback = new ActionModeCallback(ListProgramActivity.this, null);

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

        /* synthetic */ ActionModeCallback(ListProgramActivity listMultiSelection, String anonymousClass1) {
            this();
        }

        public boolean onPrepareActionMode(ActionMode actionMode, Menu menu) {
            return false;
        }

        public boolean onCreateActionMode(ActionMode actionMode, Menu menu) {
            Tools.setSystemBarColor(ListProgramActivity.this, R.color.blue_grey_700);
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
            Tools.setSystemBarColor(ListProgramActivity.this, R.color.red_600);
        }
    }
}
