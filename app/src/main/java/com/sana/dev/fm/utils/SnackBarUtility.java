package com.sana.dev.fm.utils;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import com.google.android.material.snackbar.Snackbar;
import com.sana.dev.fm.R;

public class SnackBarUtility {

    public Activity activity;
    private SbClickListener mOnSbClickListener;

    public SnackBarUtility(Activity _activity) {
        this.activity = _activity;
    }

    public interface SbClickListener {
        void onClick(View view );
    }

    public void setOnSbClickListener(SbClickListener sbClickListener) {
        this.mOnSbClickListener = sbClickListener;
    }

    public void showIconSuccess(String text) {
        LayoutInflater inflater = (LayoutInflater) activity.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        View root = inflater.inflate(R.layout.snackbar_icon_text, null);
        Snackbar make = Snackbar.make(activity.findViewById(android.R.id.content), (CharSequence) "", 2000);
//        make.getView().setBackgroundColor(ContextCompat.getColor(activity, R.color.colorAccent));
        Snackbar.SnackbarLayout snackbarLayout = (Snackbar.SnackbarLayout) make.getView();
        snackbarLayout.setPadding(0, 0, 0, 0);
        ((TextView) root.findViewById(R.id.message)).setText(text);
        ((ImageView) root.findViewById(R.id.icon)).setImageResource(R.drawable.ic_done);
        root.findViewById(R.id.parent_view).setBackgroundColor(activity.getResources().getColor(R.color.colorPrimary));
        snackbarLayout.addView(root, 0);
        make.show();
    }


    protected void displaySnackbar(View view, String s) {
        Snackbar snack = Snackbar.make(view, s, Snackbar.LENGTH_LONG);
        View sbview = snack.getView();
        sbview.setBackgroundColor(ContextCompat.getColor(activity, R.color.colorAccent));
        TextView textView = (TextView) sbview.findViewById(android.R.id.text1);
        textView.setTextColor(activity.getResources().getColor(R.color.colorPrimary));
        snack.show();
    }


    public void deleteConfirm(String s) {
        Snackbar snack = Snackbar.make(activity.findViewById(android.R.id.content), activity.getResources().getString(R.string.delete_messages,s), Snackbar.LENGTH_LONG);
        snack .setAction("نعم", new View.OnClickListener() {
            @Override
            public void onClick(View view) {
//                Snackbar mSnackbar = Snackbar.make(view, activity.getResources().getString(R.string.delete_confirmed,   s), Snackbar.LENGTH_SHORT);
//                mSnackbar.show();
                if (mOnSbClickListener != null) {
                    mOnSbClickListener.onClick(view);
                }
            }
        });

        snack.setActionTextColor(ContextCompat.getColor(activity, R.color.colorAccent));
//        sbView.setBackgroundColor(ContextCompat.getColor(activity, R.color.colorPrimary));
        snack.show();
    }


    public Snackbar showSnackBar( String txt,int duration) { // Create the Snackbar
        Snackbar snackbar = Snackbar.make(activity.findViewById(android.R.id.content), txt, duration);
        // 15 is margin from all the sides for snackbar
        int marginFromSides = 15;

        float height = 100;

        //inflate view
        View snackView = activity.getLayoutInflater().inflate(R.layout.snackbar_icon_text, null);

        // White background
        snackbar.getView().setBackgroundColor(Color.WHITE);
        // for rounded edges
        snackbar.getView().setBackground(activity.getResources().getDrawable(R.drawable.round_edges));

        Snackbar.SnackbarLayout snackBarView = (Snackbar.SnackbarLayout) snackbar.getView();
        FrameLayout.LayoutParams parentParams = (FrameLayout.LayoutParams) snackBarView.getLayoutParams();
        parentParams.setMargins(marginFromSides, 0, marginFromSides, marginFromSides);
        parentParams.height = (int) height;
        parentParams.width = FrameLayout.LayoutParams.MATCH_PARENT;
        snackBarView.setLayoutParams(parentParams);

        snackBarView.addView(snackView, 0);
        return snackbar;

//        final Snackbar snackbar =  sbHelp.showSnackBar(obj.getpName(),Snackbar.LENGTH_LONG);
//        snackbar.show();
//        View view = snackbar.getView();
//        TextView tv = (TextView) view.findViewById(R.id.message);
//        tv.setOnClickListener(new View.OnClickListener() {
//            @Override
//            public void onClick(View v) {
//                snackbar.dismiss();
//            }
//        });
    }

}
