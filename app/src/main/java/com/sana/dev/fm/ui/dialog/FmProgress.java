//package com.sana.dev.fm.ui.dialog;
//
//
//import android.app.Activity;
//import android.app.Dialog;
//import android.content.Context;
//import android.content.DialogInterface;
//import android.graphics.Canvas;
//import android.graphics.Color;
//import android.graphics.drawable.ColorDrawable;
//import android.os.Bundle;
//import android.os.Handler;
//import android.util.AttributeSet;
//import android.view.Gravity;
//import android.view.View;
//import android.view.ViewGroup;
//import android.view.Window;
//import android.view.WindowManager;
//import android.widget.FrameLayout;
//import android.widget.ImageView;
//import android.widget.LinearLayout;
//import android.widget.TextView;
//
//import com.sana.dev.fm.R;
//
//public class FmProgress {
//
//    public enum Style {
//        SPIN_INDETERMINATE/*, PIE_DETERMINATE, ANNULAR_DETERMINATE, BAR_DETERMINATE*/
//    }
//
//    // To avoid redundant APIs, make the HUD as a wrapper class around a Dialog
//    private ProgressDialog mProgressDialog;
//    private float mDimAmount;
//    private int mWindowColor;
//    private float mCornerRadius;
//    private Context mContext;
//
//    private int mAnimateSpeed;
//
//    private int mMaxProgress;
//    private boolean mIsAutoDismiss;
//
//    private int mGraceTimeMs;
//    private Handler mGraceTimer;
//    private boolean mFinished;
//
//    public FmProgress(Context context) {
//        mContext = context;
//        mProgressDialog = new ProgressDialog(context);
//        mDimAmount = 0;
//        //noinspection deprecation
//        mWindowColor = context.getResources().getColor(R.color.kprogresshud_default_color);
//        mAnimateSpeed = 1;
//        mCornerRadius = 10;
//        mIsAutoDismiss = true;
//        mGraceTimeMs = 0;
//        mFinished = false;
//
////        setStyle(Style.SPIN_INDETERMINATE);
//    }
//
//    /**
//     * Create a new HUD. Have the same effect as the constructor.
//     * For convenient only.
//     * @param context Activity context that the HUD bound to
//     * @return An unique HUD instance
//     */
//    public static FmProgress create(Context context) {
//        return new FmProgress(context);
//    }
//
//    /**
//     * Create a new HUD. specify the HUD style (if you use a custom view, you need {@code FmProgress.create(Context context)}).
//     *
//     * @param context Activity context that the HUD bound to
//     * @param style One of the FmProgress.Style values
//     * @return An unique HUD instance
//     */
//    public static FmProgress create(Context context, Style style) {
//        return new FmProgress(context).setStyle(style);
//    }
//
//    /**
//     * Specify the HUD style (not needed if you use a custom view)
//     * @param style One of the KProgressHUD.Style values
//     * @return Current HUD
//     */
//    public FmProgress setStyle(Style style) {
//        View view = null;
//        switch (style) {
//            case SPIN_INDETERMINATE:
//                view = new SpinView(mContext);
//                break;
//            // No custom view style here, because view will be added later
//        }
//        mProgressDialog.setView(view);
//        return this;
//    }
//
//    /**
//     * Specify the dim area around the HUD, like in Dialog
//     * @param dimAmount May take value from 0 to 1. Default to 0 (no dimming)
//     * @return Current HUD
//     */
//    public FmProgress setDimAmount(float dimAmount) {
//        if (dimAmount >= 0 && dimAmount <= 1) {
//            mDimAmount = dimAmount;
//        }
//        return this;
//    }
//
//    /**
//     * Set HUD size. If not the HUD view will use WRAP_CONTENT instead
//     * @param width in dp
//     * @param height in dp
//     * @return Current HUD
//     */
//    public FmProgress setSize(int width, int height) {
//        mProgressDialog.setSize(width, height);
//        return this;
//    }
//
//    /**
//     * @deprecated  As of release 1.1.0, replaced by {@link #setBackgroundColor(int)}
//     * @param color ARGB color
//     * @return Current HUD
//     */
//    @Deprecated
//    public FmProgress setWindowColor(int color) {
//        mWindowColor = color;
//        return this;
//    }
//
//    /**
//     * Specify the HUD background color
//     * @param color ARGB color
//     * @return Current HUD
//     */
//    public FmProgress setBackgroundColor(int color) {
//        mWindowColor = color;
//        return this;
//    }
//
//    /**
//     * Specify corner radius of the HUD (default is 10)
//     * @param radius Corner radius in dp
//     * @return Current HUD
//     */
//    public FmProgress setCornerRadius(float radius) {
//        mCornerRadius = radius;
//        return this;
//    }
//
//    /**
//     * Change animation speed relative to default. Used with indeterminate style
//     * @param scale Default is 1. If you want double the speed, set the param at 2.
//     * @return Current HUD
//     */
//    public FmProgress setAnimationSpeed(int scale) {
//        mAnimateSpeed = scale;
//        return this;
//    }
//
//    /**
//     * Optional label to be displayed.
//     * @return Current HUD
//     */
//    public FmProgress setLabel(String label) {
//        mProgressDialog.setLabel(label);
//        return this;
//    }
//
//    /**
//     * Optional label to be displayed
//     * @return Current HUD
//     */
//    public FmProgress setLabel(String label, int color) {
//        mProgressDialog.setLabel(label, color);
//        return this;
//    }
//
//
//
//
//
//    /**
//     * Max value for use in one of the determinate styles
//     * @return Current HUD
//     */
//    public FmProgress setMaxProgress(int maxProgress) {
//        mMaxProgress = maxProgress;
//        return this;
//    }
//
//    /**
//     * Set current progress. Only have effect when use with a determinate style, or a custom
//     * view which implements Determinate interface.
//     */
//    public void setProgress(int progress) {
//        mProgressDialog.setProgress(progress);
//    }
//
//    /**
//     * Provide a custom view to be displayed.
//     * @param view Must not be null
//     * @return Current HUD
//     */
//    public FmProgress setCustomView(View view) {
//        if (view != null) {
//            mProgressDialog.setView(view);
//        } else {
//            throw new RuntimeException("Custom view must not be null!");
//        }
//        return this;
//    }
//
//    /**
//     * Specify whether this HUD can be cancelled by using back button (default is false)
//     *
//     * Setting a cancelable to true with this method will set a null callback,
//     * clearing any callback previously set with
//     * {@link #setCancellable(DialogInterface.OnCancelListener)}
//     *
//     * @return Current HUD
//     */
//    public FmProgress setCancellable(boolean isCancellable) {
//        mProgressDialog.setCancelable(isCancellable);
//        mProgressDialog.setOnCancelListener(null);
//        return this;
//    }
//
//    /**
//     * Specify a callback to run when using the back button (default is null)
//     *
//     * @param listener The code that will run if the user presses the back
//     * button. If you pass null, the dialog won't be cancellable, just like
//     * if you had called {@link #setCancellable(boolean)} passing false.
//     *
//     * @return Current HUD
//     */
//    public FmProgress setCancellable(DialogInterface.OnCancelListener listener) {
//        mProgressDialog.setCancelable(null != listener);
//        mProgressDialog.setOnCancelListener(listener);
//        return this;
//    }
//
//    /**
//     * Specify whether this HUD closes itself if progress reaches max. Default is true.
//     * @return Current HUD
//     */
//    public FmProgress setAutoDismiss(boolean isAutoDismiss) {
//        mIsAutoDismiss = isAutoDismiss;
//        return this;
//    }
//
//    /**
//     * Grace period is the time (in milliseconds) that the invoked method may be run without
//     * showing the HUD. If the task finishes before the grace time runs out, the HUD will
//     * not be shown at all.
//     * This may be used to prevent HUD display for very short tasks.
//     * Defaults to 0 (no grace time).
//     * @param graceTimeMs Grace time in milliseconds
//     * @return Current HUD
//     */
//    public FmProgress setGraceTime(int graceTimeMs) {
//        mGraceTimeMs = graceTimeMs;
//        return this;
//    }
//
//    public FmProgress show() {
//        if (!isShowing()) {
//            mFinished = false;
//            if (mGraceTimeMs == 0) {
//                mProgressDialog.show();
//            } else {
//                mGraceTimer = new Handler();
//                mGraceTimer.postDelayed(new Runnable() {
//                    @Override
//                    public void run() {
//                        if (mProgressDialog != null && !mFinished) {
//                            mProgressDialog.show();
//                        }
//                    }
//                }, mGraceTimeMs);
//            }
//        }
//        return this;
//    }
//
//    public boolean isShowing() {
//        return mProgressDialog != null && mProgressDialog.isShowing();
//    }
//
//    public void dismiss() {
//        mFinished = true;
//        if (mContext != null && mProgressDialog != null && mProgressDialog.isShowing()) {
//            mProgressDialog.dismiss();
//        }
//        if (mGraceTimer != null) {
//            mGraceTimer.removeCallbacksAndMessages(null);
//            mGraceTimer = null;
//        }
//    }
//
//    private class ProgressDialog extends Dialog {
//
//        private View mView;
//        private TextView mLabelText;
//        private String mLabel;
//        private LinearLayout mCustomViewContainer;
//        private int mWidth, mHeight;
//        private int mLabelColor = Color.WHITE;
//        private int mDetailColor = Color.WHITE;
//
//        public ProgressDialog(Context context) {
//            super(context);
//        }
//
//        @Override
//        protected void onCreate(Bundle savedInstanceState) {
//            super.onCreate(savedInstanceState);
//            requestWindowFeature(Window.FEATURE_NO_TITLE);
//            setContentView(R.layout.progress_hud);
//
//            Window window = getWindow();
//            window.setBackgroundDrawable(new ColorDrawable(0));
//            window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
//            WindowManager.LayoutParams layoutParams = window.getAttributes();
//            layoutParams.dimAmount = mDimAmount;
//            layoutParams.gravity = Gravity.CENTER;
//            window.setAttributes(layoutParams);
//
//            setCanceledOnTouchOutside(false);
//
//            initViews();
//        }
//
//        private void initViews() {
////            mBackgroundLayout = (BackgroundLayout) findViewById(R.id.background);
////            mBackgroundLayout.setBaseColor(mWindowColor);
////            mBackgroundLayout.setCornerRadius(mCornerRadius);
//            if (mWidth != 0) {
//                updateBackgroundSize();
//            }
//
//            mCustomViewContainer = (LinearLayout) findViewById(R.id.lyn_parent);
//            addViewToFrame(mView);
//
//
//            mLabelText = (TextView) findViewById(R.id.message);
//            setLabel(mLabel, mLabelColor);
//        }
//
//        private void addViewToFrame(View view) {
//            if (view == null) return;
//            int wrapParam = ViewGroup.LayoutParams.WRAP_CONTENT;
//            ViewGroup.LayoutParams params = new ViewGroup.LayoutParams(wrapParam, wrapParam);
//            mCustomViewContainer.addView(view, params);
//        }
//
//        private void updateBackgroundSize() {
////            ViewGroup.LayoutParams params = mBackgroundLayout.getLayoutParams();
////            params.width = Helper.dpToPixel(mWidth, getContext());
////            params.height = Helper.dpToPixel(mHeight, getContext());
////            mBackgroundLayout.setLayoutParams(params);
//        }
//
//        public void setProgress(int progress) {
//            if (mIsAutoDismiss && progress >= mMaxProgress) {
//                dismiss();
//            }
//        }
//
//        public void setView(View view) {
//            if (view != null) {
//                mView = view;
//                if (isShowing()) {
//                    mCustomViewContainer.removeAllViews();
//                    addViewToFrame(view);
//                }
//            }
//        }
//
//        public void setLabel(String label) {
//            mLabel = label;
//            if (mLabelText != null) {
//                if (label != null) {
//                    mLabelText.setText(label);
//                    mLabelText.setVisibility(View.VISIBLE);
//                } else {
//                    mLabelText.setVisibility(View.GONE);
//                }
//            }
//        }
//
//
//        public void setLabel(String label, int color) {
//            mLabel = label;
//            mLabelColor = color;
//            if (mLabelText != null) {
//                if (label != null) {
//                    mLabelText.setText(label);
//                    mLabelText.setTextColor(color);
//                    mLabelText.setVisibility(View.VISIBLE);
//                } else {
//                    mLabelText.setVisibility(View.GONE);
//                }
//            }
//        }
//
//
//        public void setSize(int width, int height) {
//            mWidth = width;
//            mHeight = height;
//        }
//    }
//
//
//    class SpinView extends androidx.appcompat.widget.AppCompatImageView implements Indeterminate {
//
//        private float mRotateDegrees;
//        private int mFrameTime;
//        private boolean mNeedToUpdateView;
//        private Runnable mUpdateViewRunnable;
//
//        public SpinView(Context context) {
//            super(context);
//            init();
//        }
//
//        public SpinView(Context context, AttributeSet attrs) {
//            super(context, attrs);
//            init();
//        }
//
//        private void init() {
//            setImageResource(R.drawable.spinner);
//            mFrameTime = 1000 / 12;
//            mUpdateViewRunnable = new Runnable() {
//                @Override
//                public void run() {
//                    mRotateDegrees += 30;
//                    mRotateDegrees = mRotateDegrees < 360 ? mRotateDegrees : mRotateDegrees - 360;
//                    invalidate();
//                    if (mNeedToUpdateView) {
//                        postDelayed(this, mFrameTime);
//                    }
//                }
//            };
//        }
//
//        @Override
//        public void setAnimationSpeed(float scale) {
//            mFrameTime = (int) (1000 / 12 / scale);
//        }
//
//        @Override
//        protected void onDraw(Canvas canvas) {
//            canvas.rotate(mRotateDegrees, getWidth() / 2, getHeight() / 2);
//            super.onDraw(canvas);
//        }
//
//        @Override
//        protected void onAttachedToWindow() {
//            super.onAttachedToWindow();
//            mNeedToUpdateView = true;
//            post(mUpdateViewRunnable);
//        }
//
//        @Override
//        protected void onDetachedFromWindow() {
//            mNeedToUpdateView = false;
//            super.onDetachedFromWindow();
//        }
//    }
//
//    public interface Indeterminate {
//        void setAnimationSpeed(float scale);
//    }
//}