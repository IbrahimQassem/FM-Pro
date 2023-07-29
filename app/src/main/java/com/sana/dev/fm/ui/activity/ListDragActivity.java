package com.sana.dev.fm.ui.activity;


import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.AdapterListDrag;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.utils.DragItemTouchHelper;

import java.util.List;

public class ListDragActivity extends BaseActivity {

    private static final String TAG = ListDragActivity.class.getSimpleName();

    private RecyclerView recyclerView;
    private AdapterListDrag mAdapter;
    private ItemTouchHelper mItemTouchHelper;

    public static void startActivity(Context context) {
        Intent intent = new Intent(context, ListDragActivity.class);
        context.startActivity(intent);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView((int) R.layout.activity_list_drag);


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

        //set data and list adapter
        mAdapter = new AdapterListDrag(this, items);
        recyclerView.setAdapter(mAdapter);

        // on item list clicked
        mAdapter.setOnItemClickListener(new AdapterListDrag.OnItemClickListener() {
            @Override
            public void onItemClick(View view, RadioInfo obj, int position) {
                showSnackBar("Item " + obj.getName() + " clicked");
            }
        });

        mAdapter.setDragListener(new AdapterListDrag.OnStartDragListener() {
            @Override
            public void onStartDrag(RecyclerView.ViewHolder viewHolder, RadioInfo obj, int position) {
                mItemTouchHelper.startDrag(viewHolder);
                showSnackBar("Item " + position );
            }
        });

        ItemTouchHelper.Callback callback = new DragItemTouchHelper(mAdapter);
        mItemTouchHelper = new ItemTouchHelper(callback);
        mItemTouchHelper.attachToRecyclerView(recyclerView);
    }



}
