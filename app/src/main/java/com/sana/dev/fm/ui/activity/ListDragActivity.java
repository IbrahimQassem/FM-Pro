package com.sana.dev.fm.ui.activity;


import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.AdapterListDrag;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.utils.DragItemTouchHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;
import com.sana.dev.fm.utils.my_firebase.FmStationCRUDImpl;

import java.util.Collections;
import java.util.List;

public class ListDragActivity extends BaseActivity {

    private static final String TAG = ListDragActivity.class.getSimpleName();

    private RecyclerView recyclerView;
    private AdapterListDrag mAdapter;
    private ItemTouchHelper mItemTouchHelper;

    private FmStationCRUDImpl fmStationCRUD;

    public static void startActivity(Context context) {
        Intent intent = new Intent(context, ListDragActivity.class);
        context.startActivity(intent);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView((int) R.layout.activity_list_drag);

        fmStationCRUD = new FmStationCRUDImpl(this, FirebaseConstants.RADIO_INFO_TABLE);

        initToolbar();
        initComponent();
    }

    private void initToolbar() {
        getIvLogo().setText(getString(R.string.label_radio_list));
        getToolbarArrow().setOnClickListener(new View.OnClickListener() {
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

        List<RadioInfo> items = ShardDate.getInstance().getRadioInfoList();
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
                AlertDialog.Builder builder = new AlertDialog.Builder(ListDragActivity.this);
                builder.setTitle("Enter new Priority");

// Create the input field
                final EditText input = new EditText(ListDragActivity.this);
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

    private void changePriority(RadioInfo model) {
        fmStationCRUD.update("priority", model, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                showToast(object.toString());
            }

            @Override
            public void onError(Object object) {
                LogUtility.e("Error priority", object.toString());
                showToast(object.toString());
            }
        });
    }


}
