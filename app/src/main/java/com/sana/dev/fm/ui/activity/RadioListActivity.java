package com.sana.dev.fm.ui.activity;


import static com.sana.dev.fm.utils.FmUtilize.isCollection;

import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.EditText;

import androidx.appcompat.app.AlertDialog;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.Query;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.AdapterListDrag;
import com.sana.dev.fm.databinding.ActivityListDragBinding;
import com.sana.dev.fm.databinding.ActivityListMultiSelectionBinding;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.model.interfaces.OnItemLongClick;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.DragItemTouchHelper;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQuery;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQueryConditionCode;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class RadioListActivity extends BaseActivity {
    private static final String TAG = RadioListActivity.class.getSimpleName();

    ActivityListDragBinding binding;
    private RecyclerView recyclerView;
    private AdapterListDrag mAdapter;
    private ItemTouchHelper mItemTouchHelper;

    List<RadioInfo> items = new ArrayList<>();

    private FirestoreDbUtility firestoreDbUtility;

    private BottomSheetDialog mBottomSheetDialog;
    private BottomSheetBehavior mBehavior;

    public static void startActivity(Context context) {
        Intent intent = new Intent(context, RadioListActivity.class);
        context.startActivity(intent);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView((int) R.layout.activity_list_drag);

        binding = ActivityListDragBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);

        firestoreDbUtility = new FirestoreDbUtility();

        initToolbar();
        initComponent();
        loadRadios();
    }

    private void initToolbar() {
        binding.toolbar.tvTitle.setText(getString(R.string.label_radio_list));
        binding.toolbar.imbEvent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });
    }

    private void initComponent() {
        recyclerView = (RecyclerView) findViewById(R.id.recyclerView);
        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        recyclerView.setHasFixedSize(true);


        // Sort the list using the custom comparator
        //set data and list adapter
        mAdapter = new AdapterListDrag(this, items);
        recyclerView.setAdapter(mAdapter);

        // on item list clicked
        mAdapter.setOnClickListener(new OnClickListener() {
            @Override
            public void onItemClick(View view, Object model, int position) {
//                Toast.makeText(ctx, "sss", Toast.LENGTH_SHORT).show();
                RadioInfo item = (RadioInfo) model;
                showToast("Item " + item.getName() + " position : " + position);
//                mAdapter.notifyDataSetChanged();
                //showInfoDialog();
                // Create an AlertDialog.Builder object
                AlertDialog.Builder builder = new AlertDialog.Builder(RadioListActivity.this);
                builder.setTitle("Enter new Priority");

// Create the input field
                final EditText input = new EditText(RadioListActivity.this);
                input.setInputType(InputType.TYPE_CLASS_NUMBER);
                builder.setView(input);

// Set the positive button action
                builder.setPositiveButton("OK", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        // Get the input text when the user clicks OK
                        String userInput = input.getText().toString();
                        // Process the user input
                        RadioInfo newDate = item;
                        newDate.setPriority(Integer.parseInt(userInput));
                        changePriority(newDate);
                    }
                });

// Set the negative button action (optional)
                builder.setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        dialog.cancel();
                    }
                });

// Create and show the dialog
                AlertDialog dialog = builder.create();
                dialog.show();
            }
        });


        mAdapter.setOnLongClickListener(new OnItemLongClick() {
            @Override
            public void onItemLongClick(View view, Object model, int position) {
                RadioInfo item = (RadioInfo) model;
                // showToast("Item " + item.getName() + " position : " + position);
                String state = item.isDisabled() ? "Enable" : "Disable";
                ModelConfig config = new ModelConfig(R.drawable.ic_warning, getString(R.string.label_note), "Are you sure you want to " + state + " ? ", new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        changePriority(!item.isDisabled(), item);
                        loadRadios();
                    }
                }));
                showWarningDialog(config);
            }
        });

        mAdapter.setDragListener(new AdapterListDrag.OnStartDragListener() {
            @Override
            public void onStartDrag(RecyclerView.ViewHolder viewHolder, RadioInfo item, int position) {
                mItemTouchHelper.startDrag(viewHolder);
//                showSnackBar("Item " + position);
                showToast("Item " + item.getName() + " position : " + position);
//                mAdapter.po
            }
        });

        ItemTouchHelper.Callback callback = new DragItemTouchHelper(mAdapter);
        mItemTouchHelper = new ItemTouchHelper(callback);
        mItemTouchHelper.attachToRecyclerView(recyclerView);

    }

    private void loadRadios() {

        FirestoreDbUtility firestoreDbUtility = new FirestoreDbUtility();

        List<FirestoreQuery> firestoreQueryList = new ArrayList<>();

        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.Query_Direction_DESCENDING,
                "priority",
                Query.Direction.DESCENDING
        ));
//        firestoreQueryList.add(new FirestoreQuery(
//                FirestoreQueryConditionCode.WHERE_EQUAL_TO,
//                "disabled",
//                false
//        ));

        CollectionReference collectionRef = firestoreDbUtility.getTopLevelCollection()
                .document(AppConstant.Firebase.RADIO_INFO_TABLE).collection(AppConstant.Firebase.RADIO_INFO_TABLE);  // Subcollection named "1001"

        firestoreDbUtility.getMany(collectionRef, firestoreQueryList, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                List<RadioInfo> stationList = FirestoreDbUtility.getDataFromQuerySnapshot(object, RadioInfo.class);
                // Set sorted data to adapter:
                // Collections.sort(stationList, (item1, item2) -> Integer.compare(item2.getPriority(), item1.getPriority()));
                items.addAll(stationList);
                mAdapter.notifyDataSetChanged();
            }

            @Override
            public void onFailure(Object object) {
                LogUtility.e(TAG, " loadRadios :  " + object);
            }
        });
    }


/*
    private void showBottomSheetDialog() {

        View findViewById = findViewById(R.id.bottom_sheet);
        this.mBehavior = BottomSheetBehavior.from(findViewById);

        if (this.mBehavior.getState() == BottomSheetBehavior.STATE_EXPANDED) {
            this.mBehavior.setState(BottomSheetBehavior.STATE_COLLAPSED);
        }

        View inflate = getLayoutInflater().inflate(R.layout.main_activity_sheet_list, null);

        LinearLayout lyt_add_program = inflate.findViewById(R.id.lyt_add_program);
        LinearLayout lyt_add_episode = inflate.findViewById(R.id.lyt_add_episode);
        LinearLayout lyt_update_episode = inflate.findViewById(R.id.lyt_update_episode);
        LinearLayout lyt_update_radio = inflate.findViewById(R.id.lyt_update_radio);
        lyt_update_radio.setVisibility(View.GONE);


        if (checkPrivilege()) {
            lyt_add_program.setVisibility(View.VISIBLE);
            lyt_add_episode.setVisibility(View.VISIBLE);
            lyt_update_episode.setVisibility(View.VISIBLE);
        } else {
            lyt_add_program.setVisibility(View.GONE);
            lyt_add_episode.setVisibility(View.GONE);
            lyt_update_episode.setVisibility(View.GONE);
        }

        if ((BuildConfig.FLAVOR.equals("hudhudfm_google_play") && BuildConfig.DEBUG)) {
            lyt_update_radio.setVisibility(View.VISIBLE);
            lyt_add_program.setVisibility(View.VISIBLE);
            lyt_add_episode.setVisibility(View.VISIBLE);
            lyt_update_episode.setVisibility(View.VISIBLE);
            if (isAccountSignedIn()) {
                UserModel user = prefMgr.getUserSession();
                user.setUserType(UserType.SuperADMIN);
                prefMgr.write(FirebaseConstants.USER_INFO, (UserModel) user);
            }
        }

        inflate.findViewById(R.id.lyt_user_acc).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                checkUserLogin();
                mBottomSheetDialog.dismiss();
            }
        });
        inflate.findViewById(R.id.lyt_share).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                FmUtilize.shareApp(MainActivity.this);
                mBottomSheetDialog.dismiss();
            }
        });
        inflate.findViewById(R.id.lyt_get_rate).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                MainDialog mainDialog = new MainDialog(MainActivity.this);
                mainDialog.showDialogRateUs();
                mBottomSheetDialog.dismiss();
            }
        });
        inflate.findViewById(R.id.lyt_about_us).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
//                Context applicationContext = getApplicationContext();
//                StringBuilder stringBuilder = new StringBuilder();
//                stringBuilder.append("Make a copy '");
//                stringBuilder.append("name");
//                stringBuilder.append("' clicked");
//                Toast.makeText(applicationContext, stringBuilder.toString(), Toast.LENGTH_SHORT).show();

                MainDialog mainDialog = new MainDialog(MainActivity.this);
                mainDialog.aboutUsDialogLight();

                mBottomSheetDialog.dismiss();
            }
        });

        lyt_add_program.setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {

                if (checkPrivilege())
                    startActivity(new Intent(MainActivity.this, AddProgramActivity.class));
                mBottomSheetDialog.dismiss();
            }
        });

        lyt_add_episode.setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                AddEpisodeActivity.startActivity(MainActivity.this);
                mBottomSheetDialog.dismiss();
            }
        });

        lyt_update_episode.setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                ListMultiSelection.startActivity(MainActivity.this);
                mBottomSheetDialog.dismiss();
            }
        });


        lyt_update_radio.setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                RadioListActivity.startActivity(MainActivity.this);
                mBottomSheetDialog.dismiss();
            }
        });

        BottomSheetDialog bottomSheetDialog = new BottomSheetDialog(this);
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
*/


    private void changePriority(boolean radioState, RadioInfo model) {
//        fmStationCRUD.toggleRadioAvailability(radioState, model, new CallBack() {
//            @Override
//            public void onSuccess(Object object) {
//                showToast(object.toString());
//            }
//
//            @Override
//            public void onFailure(Object object) {
//                showToast(object.toString());
//            }
//        });
    }

    private void changePriority(RadioInfo model) {
//        fmStationCRUD.changePriority(model, new CallBack() {
//            @Override
//            public void onSuccess(Object object) {
//                showToast(object.toString());
//            }
//
//            @Override
//            public void onFailure(Object object) {
//                showToast(object.toString());
//            }
//        });
    }


}
