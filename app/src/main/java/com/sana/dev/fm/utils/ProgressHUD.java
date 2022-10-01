package com.sana.dev.fm.utils;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.content.DialogInterface;
import android.graphics.Color;
import android.graphics.drawable.AnimationDrawable;
import android.graphics.drawable.ColorDrawable;
import android.os.AsyncTask;
import android.os.SystemClock;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.TextView;

import com.sana.dev.fm.FmApplication;
import com.sana.dev.fm.R;

public class ProgressHUD extends Dialog {
    Context context;

    static ProgressHUD instance;
    View view;


    public ProgressHUD(Context context) {
        super(context);
        this.requestWindowFeature(Window.FEATURE_NO_TITLE);

        this.setCanceledOnTouchOutside(false);
        this.context = context;
        view = getLayoutInflater().inflate(R.layout.progress_hud, null);

        this.setContentView(view);
    }


    public ProgressHUD(Context context, int theme) {
        super(context, theme);
        this.context = context;
    }

    public static ProgressHUD getInstance(Context context) {
        if (instance == null) {
            instance = new ProgressHUD(context);
        }
        return instance;
    }

    public void onWindowFocusChanged(boolean hasFocus) {
        ImageView imageView = (ImageView) findViewById(R.id.spinnerImageView);
        AnimationDrawable spinner = (AnimationDrawable) imageView.getBackground();
        spinner.start();
    }

    public void setMessage(CharSequence message) {
        if (message != null && message.length() > 0) {
            findViewById(R.id.message).setVisibility(View.VISIBLE);
            TextView txt = (TextView) findViewById(R.id.message);
            txt.setText(message);
            txt.invalidate();
        }
    }

    @Override
    public void show() {
        try {
            if (!((Activity) context).isFinishing()) {
                getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
                WindowManager.LayoutParams lp = new WindowManager.LayoutParams();
                lp.copyFrom(getWindow().getAttributes());
                lp.width = WindowManager.LayoutParams.MATCH_PARENT;
                lp.height = WindowManager.LayoutParams.MATCH_PARENT;
                getWindow().setAttributes(lp);
                super.show();
            } else {
                instance = null;
            }
        } catch (Exception e) {
            Log.e("ZProgressHUD : ", e.getMessage());
        }
    }

    public static ProgressHUD showDialog(CharSequence message, boolean indeterminate, boolean cancelable,
                                         OnCancelListener cancelListener) {
//        ProgressHUD dialog = new ProgressHUD(context, R.style.ProgressD);
        ProgressHUD dialog = ProgressHUD.getInstance(FmApplication.getInstance()/*nstance.context*/);
        dialog.showDialogPrivate(message, indeterminate, cancelable, cancelListener);
        return dialog;
    }

    public ProgressHUD showDialogPrivate(CharSequence message, boolean indeterminate, boolean cancelable,
                                         OnCancelListener cancelListener) {
        ProgressHUD dialog = new ProgressHUD(context, R.style.ProgressD);
        dialog.setTitle("");
        dialog.setContentView(R.layout.progress_hud);
        if (message == null || message.length() == 0) {
            dialog.findViewById(R.id.message).setVisibility(View.GONE);
        } else {
            TextView txt = (TextView) dialog.findViewById(R.id.message);
            txt.setText(message);
        }
        dialog.setCancelable(cancelable);
        if (cancelListener != null)
            dialog.setOnCancelListener(cancelListener);
        dialog.getWindow().getAttributes().gravity = Gravity.CENTER;
        WindowManager.LayoutParams lp = dialog.getWindow().getAttributes();
        lp.dimAmount = 0.2f;
        dialog.getWindow().setAttributes(lp);
        //dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_BLUR_BEHIND);
        dialog.show();
        return dialog;
    }


    public void dismissWithFailure(String message) {
        dismissHUD();
    }

    protected void dismissHUD() {
        if (isShowing()) {
            AsyncTask<String, Integer, Long> task = new AsyncTask<String, Integer, Long>() {

                @Override
                protected Long doInBackground(String... params) {
                    SystemClock.sleep(3000);
                    return null;
                }

                @Override
                protected void onPostExecute(Long result) {
                    super.onPostExecute(result);
                    dismiss();
                    reset();
                }
            };
            task.execute();
        }

    }

    protected void reset() {
//        tvMessage.setText(context.getString(R.string.loading));
    }
}

//        	mProgressHUD = ProgressHUD.show(ProgressHUDDemo.this,"Connecting", true,true,this);
//publishProgress("Connecting");
//				Thread.sleep(2000);
//                        publishProgress("Downloading");
//                        Thread.sleep(5000);