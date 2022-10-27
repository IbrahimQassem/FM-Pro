package com.sana.dev.fm.ui.activity;



import static com.sana.dev.fm.utils.FmUtilize.isCollection;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.Toast;

import androidx.appcompat.view.ActionMode;
import androidx.appcompat.view.ActionMode.Callback;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.gson.Gson;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.AdapterListInbox;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.ui.view.LineItemDecoration;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.FmEpisodeCRUDImpl;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;


import java.util.ArrayList;
import java.util.List;

public class ListMultiSelection extends BaseActivity {

    private static final String TAG = ListMultiSelection.class.getSimpleName();

    private ActionMode actionMode;
    private ActionModeCallback actionModeCallback;
    private AdapterListInbox mAdapter;
    private View parent_view;
    private RecyclerView recyclerView;
    private Toolbar toolbar;
    private ArrayList<Episode> episodeList = new ArrayList<>();
    private FmEpisodeCRUDImpl ePiRepo;

    public static void startActivity(Context context, Episode episode) {
        Intent intent = new Intent(context, ListMultiSelection.class);
        String obj = (new Gson().toJson(episode));
        intent.putExtra("episode", obj);
        context.startActivity(intent);
    }

    public static void startActivity(Context context) {
        Intent intent = new Intent(context, ListMultiSelection.class);
        context.startActivity(intent);
    }

    /* Access modifiers changed, original: protected */
    public void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        setContentView((int) R.layout.activity_list_multi_selection);
        this.parent_view = findViewById(R.id.lyt_parent);

        ePiRepo = new FmEpisodeCRUDImpl(this, FirebaseConstants.EPISODE_TABLE);


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
        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        this.toolbar = toolbar;
        toolbar.setNavigationIcon((int) R.drawable.ic_arrow_back_white_24dp);
        setSupportActionBar(this.toolbar);
        getSupportActionBar().setTitle((CharSequence) getString(R.string.main_program_for));
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
//        Tools.setSystemBarColor(this, R.color.colorPrimary);
        Tools.setSystemBarColor(this);


    }

    private void initComponent(String radioId) {


        RecyclerView recyclerView = (RecyclerView) findViewById(R.id.recyclerView);
        this.recyclerView = recyclerView;
        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        this.recyclerView.addItemDecoration(new LineItemDecoration(this, 1));
        this.recyclerView.setHasFixedSize(true);


        ePiRepo.queryAllBy(radioId,null, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                if (isCollection(object)) {
                    episodeList = (ArrayList<Episode>) object;
                    AdapterListInbox adapterListInbox = new AdapterListInbox(ListMultiSelection.this, episodeList);
//        AdapterListInbox adapterListInbox = new AdapterListInbox(this, DataGenerator.getEpisodeData(this));
                    mAdapter = adapterListInbox;
                    recyclerView.setAdapter(adapterListInbox);
                    mAdapter.setOnClickListener(new AdapterListInbox.OnClickListener() {
                        public void onItemClick(View view, Episode episode, int i) {
                            if (ListMultiSelection.this.mAdapter.getSelectedItemCount() > 0) {
                                ListMultiSelection.this.enableActionMode(i);
                                return;
                            }
                            Episode item = ListMultiSelection.this.mAdapter.getItem(i);
                            Context applicationContext = ListMultiSelection.this.getApplicationContext();
                            StringBuilder stringBuilder = new StringBuilder();
                            stringBuilder.append("تعديل : ");
                            stringBuilder.append(item.getEpName());

                            AddEpisodeActivity.startActivity(ListMultiSelection.this, episode);

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
                            ListMultiSelection.this.enableActionMode(i);
                        }
                    });
                    actionModeCallback = new ActionModeCallback(ListMultiSelection.this, null);

                }
//                LogUtility.e(TAG, "reaDailyEpisodeByRadioId: " + object);

            }

            @Override
            public void onError(Object object) {
                LogUtility.e(TAG, "reaDailyEpisodeByRadioId: " + object);
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

        /* synthetic */ ActionModeCallback(ListMultiSelection listMultiSelection, String anonymousClass1) {
            this();
        }

        public boolean onPrepareActionMode(ActionMode actionMode, Menu menu) {
            return false;
        }

        public boolean onCreateActionMode(ActionMode actionMode, Menu menu) {
            Tools.setSystemBarColor(ListMultiSelection.this, R.color.blue_grey_700);
            actionMode.getMenuInflater().inflate(R.menu.menu_delete, menu);
            return true;
        }

        public boolean onActionItemClicked(ActionMode actionMode, MenuItem menuItem) {
            if (menuItem.getItemId() != R.id.action_delete) {
                return false;
            }
            ListMultiSelection.this.deleteInboxes();
            actionMode.finish();
            return true;
        }

        public void onDestroyActionMode(ActionMode actionMode) {
            ListMultiSelection.this.mAdapter.clearSelections();
            ListMultiSelection.this.actionMode = null;
            Tools.setSystemBarColor(ListMultiSelection.this, R.color.red_600);
        }
    }
}
