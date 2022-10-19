package com.sana.dev.fm.ui.activity;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.drawable.ColorDrawable;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.WindowManager.LayoutParams;
import android.view.inputmethod.InputMethodManager;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.google.android.material.snackbar.Snackbar;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.UserType;
import com.sana.dev.fm.model.interfaces.BaseView;
import com.sana.dev.fm.ui.activity.appuser.PhoneLoginActivity;
import com.sana.dev.fm.utils.Constants;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.ProgressHUD;
import com.sana.dev.fm.utils.UserGuide;
import com.sana.dev.fm.utils.network.CheckInternetConnection;
import com.sana.dev.fm.utils.network.ConnectionChangeListener;


import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * Created by  on 19.01.15.
 */
public class BaseActivity extends AppCompatActivity implements BaseView {

    private static final String TAG = BaseActivity.class.getSimpleName();

    private ProgressHUD mProgressHUD;
    public PreferencesManager prefMgr;
//    @Nullable
//    @BindView(R.id.toolbar)
//    Toolbar toolbar;
    @Nullable
    @BindView(R.id.tv_title)
    TextView txvLogo;
    protected CheckInternetConnection connectionChecker;
    UserGuide userGuide;
    NetworkCallback networkCallback;
    Dialog errorDialog;
    private MenuItem inboxMenuItem;
    private boolean connectionAvailable = true;
    private long backPressedTime;

    @Override
    public void setContentView(int layoutResID) {
        super.setContentView(layoutResID);
//        String uniqueID = UUID.randomUUID().toString();
        mProgressHUD = new ProgressHUD((Activity) this);
        bindViews();
    }

    public void setContentViewWithoutInject(int layoutResId) {
        super.setContentView(layoutResId);
    }

    protected void setupToolbar() {
//        if (toolbar != null) {
//            setSupportActionBar(toolbar);
//            toolbar.setNavigationIcon(R.drawable.ic_menu_white);
//        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
//        getMenuInflater().inflate(R.menu.menu_list_animation, menu);
//        inboxMenuItem = menu.findItem(R.id.action_tone);
//        inboxMenuItem.setActionView(R.layout.menu_item_view);
        return true;
    }

    @Override
    protected void onStart() {
        super.onStart();
        chekInternetCon();
    }

    @Override
    protected void onStop() {
        super.onStop();
        connectionChecker.removeConnectionChangeListener();
    }

    protected void bindViews() {
        ButterKnife.bind(this);
        connectionChecker = new CheckInternetConnection();
        prefMgr = new PreferencesManager(this);
        userGuide = new UserGuide(this);
        PreferencesManager.initializeInstance(this);
        setupToolbar();
    }

    void chekInternetCon() {

        connectionChecker.addConnectionChangeListener(new ConnectionChangeListener() {
            @Override
            public void onConnectionChanged(boolean isConnectionAvailable) {
                if (connectionAvailable && !isConnectionAvailable) {
//                    Toast.makeText(BaseActivity.this, "Internet connection unavailable!", Toast.LENGTH_SHORT).show();
                    connectionAvailable = false;
                } else if (!connectionAvailable && isConnectionAvailable) {
//                    Toast.makeText(BaseActivity.this, "Internet connection is back again.", Toast.LENGTH_SHORT).show();
                    connectionAvailable = true;
                }

                // Check just for MainBottomNav because the interface NetworkCallback
                if (BaseActivity.this instanceof MainActivity) {
                    networkCallback = (NetworkCallback) BaseActivity.this;
//                    if (networkCallback != null)
                    networkCallback.onNetworkChange(connectionAvailable);
                }


            }
        });
    }

//    public Toolbar getToolbar() {
//        return toolbar;
//    }

    public MenuItem getInboxMenuItem() {
        return inboxMenuItem;
    }

    public TextView getIvLogo() {
        return txvLogo;
    }


//    public void startTour(View view, String id, String text, Focus focusType, ShapeType shape) {
//        userGuide.showIntro(view, id, text, focusType, shape);
//    }

//    @Override
//    public void onUserClickedTarget(String materialIntroViewId, View viewId, View.OnClickListener listener) {
//
//        switch (materialIntroViewId) {
//            case INTRO_FOCUS_1:
//                startTour(viewId, INTRO_FOCUS_1, "من خلال هذا الزر يمكنك تشغيل البث المباشر للقناة الإذاعية التي تم تحديدها", Focus.ALL, ShapeType.CIRCLE);
//                Toast.makeText(this, materialIntroViewId, Toast.LENGTH_SHORT).show();
//                break;
//            case INTRO_FOCUS_2:
//                startTour(viewId, INTRO_FOCUS_2, "يمكنك تحديد القناة الإذاعية التي ترغب في متابعتها من خلال ضغط الكارد الخاص بالإذاعة", Focus.ALL, ShapeType.CIRCLE);
//                Toast.makeText(this, materialIntroViewId, Toast.LENGTH_SHORT).show();
//                break;
////            case MENU_ABOUT_ID_TAG:
//////                showIntro(navigation_header.findViewById(R.id.bt_account), MENU_SHARED_ID_TAG, getString(R.string.lorem_ipsum), FocusGravity.LEFT);
////
////                break;
////            case MENU_SHARED_ID_TAG:
////                Toast.makeText(MainActivity.this, "Complete!", Toast.LENGTH_SHORT).show();
////                break;
//            default:
//                break;
//        }
//
//    }

//    @Override
//    public void onUserClicked(String materialIntroViewId) {
//        switch (materialIntroViewId) {
//            case INTRO_FOCUS_1:
////                startTour(fab_radio, INTRO_FOCUS_2, "يمكنك تحديد القناة الإذاعية التي ترغب في متابعتها من خلال ضغط الكارد الخاص بالإذاعة", Focus.ALL, ShapeType.CIRCLE);
////                Toast.makeText(MainBottomNav.this, "INTRO_FOCUS_2", Toast.LENGTH_SHORT).show();
//                break;
////            case MENU_ABOUT_ID_TAG:
//////                showIntro(navigation_header.findViewById(R.id.bt_account), MENU_SHARED_ID_TAG, getString(R.string.lorem_ipsum), FocusGravity.LEFT);
////
////                break;
////            case MENU_SHARED_ID_TAG:
////                Toast.makeText(MainActivity.this, "Complete!", Toast.LENGTH_SHORT).show();
////                break;
//            default:
//                break;
//        }
//    }

    //    public boolean isConAvailable() {
//        return connectionAvailable;
//    }


    @Override
    public void startLoginActivity() {
        Intent intent = new Intent(getApplicationContext(), PhoneLoginActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
//        Intent intent = new Intent(this, VerificationHeader.class);
//        startActivityForResult(intent, VerificationHeader.LOGIN_REQUEST_CODE);
    }

    @Override
    public void startMainActivity() {
//        Intent intent = new Intent(getApplicationContext(), MainActivity.class);
//        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
//        startActivity(intent);
//        finish();
        Intent intent = BaseActivity.mainPage(getApplicationContext(), true);
        startActivity(intent);
        finish();
    }

    public static Intent mainPage(Context context, boolean isNewTask) {
        Intent intent = new Intent(context, MainActivity.class);
        if (isNewTask) {
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
        }
        return intent;
    }

    public static Intent splashPage(Context context, boolean isNewTask) {
        Intent intent = new Intent(context, SplashActivity.class);
        if (isNewTask) {
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
        }
        return intent;
    }

    public static Intent introPage(Context context, boolean isNewTask) {
        Intent intent = new Intent(context, com.sana.dev.fm.ui.activity.CardWizardLight.class);
        if (isNewTask) {
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
        }
        return intent;
    }


    @Override
    public void showProgress() {
        showProgress(R.string.please_wait);
    }

    @Override
    public void showProgress(@StringRes int message) {
        hideProgress();
        mProgressHUD.showDialogPrivate( /*(Activity) this.getApplicationContext(), */getString(R.string.please_wait), true, false, null);
    }

    @Override
    public void hideProgress() {
        if (mProgressHUD != null && mProgressHUD.isShowing()) {
            mProgressHUD.dismiss();
        }
//        ProgressHUD.getInstance(this).dismissWithFailure("");
    }

//    @Override
//    public void onDestroy() {
//        super.onDestroy();
//        if (mProgressHUD != null && mProgressHUD.isShowing()) {
//            mProgressHUD.cancel();
//        }
//    }

    @Override
    public void hideKeyboard() {
        // Check if no view has focus:
        View view = this.getCurrentFocus();
        if (view != null) {
            InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
            imm.hideSoftInputFromWindow(view.getWindowToken(), 0);
        }

    }


    @Override
    public void showSnackBar(String message) {
        Snackbar snackbar = Snackbar.make(findViewById(android.R.id.content),
                message, Snackbar.LENGTH_LONG);
        snackbar.show();
    }

    @Override
    public void showSnackBar(@StringRes int messageId) {
        Snackbar snackbar = Snackbar.make(findViewById(android.R.id.content),
                messageId, Snackbar.LENGTH_LONG);
        snackbar.show();
    }

    @Override
    public void showSnackBar(View view, @StringRes int messageId) {
        Snackbar snackbar = Snackbar.make(view, messageId, Snackbar.LENGTH_LONG);
        snackbar.show();
    }

    @Override
    public void showToast(@StringRes int messageId) {
        Toast.makeText(this, messageId, Toast.LENGTH_LONG).show();
    }

    @Override
    public void showToast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    public void showWarningDialog(int messageId) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setMessage(messageId);
        builder.setPositiveButton(R.string.label_ok, null);
        builder.show();
    }

    public void showWarningDialog(String message) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setMessage(message);
        builder.setPositiveButton(R.string.label_ok, null);
        builder.show();
    }

    @Override
    public void showNotCancelableWarningDialog(String message) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setMessage(message);
        builder.setPositiveButton(R.string.label_ok, null);
        builder.setCancelable(false);
        builder.show();
    }

    @Override
    public void showWarningDialog(int message, DialogInterface.OnClickListener listener) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setMessage(message);
        builder.setPositiveButton(R.string.label_ok, listener);
        builder.show();
    }

    @Override
    public void showWarningDialog(String message, DialogInterface.OnClickListener listener) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setMessage(message);
        builder.setPositiveButton(R.string.label_ok, listener);
        builder.setNegativeButton(R.string.label_cancel, (dialog, which) -> dialog.cancel());
        builder.show();
    }


    @Override
    public void showWarningDialog(String message, String desc) {
        final Dialog dialog = new Dialog(this);
        dialog.requestWindowFeature(1);
        dialog.setContentView(R.layout.dialog_warning);
        dialog.setCancelable(true);
        LayoutParams layoutParams = new LayoutParams();
        layoutParams.copyFrom(dialog.getWindow().getAttributes());
        layoutParams.width = -2;
        layoutParams.height = -2;
        TextView tvTitle = dialog.findViewById(R.id.tvTitle);
        TextView tvDesc = dialog.findViewById(R.id.tvSubTitle);
        tvTitle.setText(message);
        tvDesc.setText(desc);
        dialog.findViewById(R.id.bt_close).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                dialog.dismiss();
            }
        });
        dialog.show();
        dialog.getWindow().setAttributes(layoutParams);
    }

    @Override
    public void showNotCancelableWarningDialog(String message, String _desc, View.OnClickListener okListener) {
        Dialog dialog = new Dialog(this);
        dialog.requestWindowFeature(1);
        dialog.setContentView(R.layout.dialog_header_polygon);
        dialog.getWindow().setBackgroundDrawable(new ColorDrawable(0));
        dialog.setCancelable(true);
        ImageView iv_image = dialog.findViewById(R.id.iv_image);
        TextView tvTitle = dialog.findViewById(R.id.tvTitle);
        TextView tvDesc = dialog.findViewById(R.id.tvSubTitle);
        iv_image.setVisibility(View.GONE);
        tvTitle.setText(message);
        tvDesc.setText(_desc);
        dialog.findViewById(R.id.bt_positive).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                okListener.onClick(v);
                dialog.dismiss();
            }
        });
        dialog.findViewById(R.id.bt_cancel).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                dialog.dismiss();
            }
        });
        dialog.show();
    }

    @Override
    public void showNotCancelableWarningDialog(String message, String _desc, View.OnClickListener cancelCallback, View.OnClickListener okListener) {
        Dialog dialog = new Dialog(this);
        dialog.requestWindowFeature(1);
        dialog.setContentView(R.layout.dialog_header_polygon);
        dialog.getWindow().setBackgroundDrawable(new ColorDrawable(0));
        dialog.setCancelable(true);
        ImageView iv_image = dialog.findViewById(R.id.iv_image);
        TextView tvTitle = dialog.findViewById(R.id.tvTitle);
        TextView tvDesc = dialog.findViewById(R.id.tvSubTitle);
        iv_image.setVisibility(View.GONE);
        tvTitle.setText(message);
        tvDesc.setText(_desc);
        dialog.findViewById(R.id.bt_positive).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                okListener.onClick(v);
                dialog.dismiss();
            }
        });
        dialog.findViewById(R.id.bt_cancel).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                cancelCallback.onClick(view);
                dialog.dismiss();
            }
        });
        dialog.show();
    }


    public boolean hasInternetConnection() {
        return connectionAvailable;
//        return presenter.hasInternetConnection();
    }

    public boolean checkAuthorization() {
        return false;
//        return presenter.checkAuthorization();
    }

    public void attemptToExitIfRoot() {
        attemptToExitIfRoot(null);
    }

    public void attemptToExitIfRoot(@Nullable View anchorView) {
        if (isTaskRoot()) {
            if (backPressedTime + Constants.General.DOUBLE_CLICK_TO_EXIT_INTERVAL > System.currentTimeMillis()) {
                super.onBackPressed();
            } else {
                if (anchorView != null) {
                    showSnackBar(anchorView, R.string.press_once_again_to_exit);
                } else {
                    showSnackBar(R.string.press_once_again_to_exit);
                }

                backPressedTime = System.currentTimeMillis();
            }
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem menuItem) {
        switch (menuItem.getItemId()) {
            case android.R.id.home:
                onBackPressed();
        }
        return (super.onOptionsItemSelected(menuItem));
    }

//    public boolean isGooglePlayServicesAvailable(Activity activity) {
//        GoogleApiAvailability googleApiAvailability = GoogleApiAvailability.getInstance();
//        int status = googleApiAvailability.isGooglePlayServicesAvailable(activity);
//        if(status != ConnectionResult.SUCCESS) {
//            if(googleApiAvailability.isUserResolvableError(status)) {
//                googleApiAvailability.getErrorDialog(activity, status, 2404).show();
//            }
//            return false;
//        }
//        return true;
//    }


    boolean checkPrivilege() {

        if (prefMgr.getUsers() == null) {
            return false;
        } else
            return prefMgr.getUsers().getUserType() == UserType.ADMIN || prefMgr.getUsers().getUserType() == UserType.SuperADMIN;

    }

    public interface NetworkCallback {
        void onNetworkChange(boolean state);
    }

    @Override
    public boolean isAccountSignedIn() {
        return prefMgr.getUsers() != null && prefMgr.getUsers().getUserId() != null /*&& FirebaseAuth.getInstance().getCurrentUser() != null*/;
    }

    @Override
    public boolean isRadioSelected() {
        return prefMgr.selectedRadio() != null && prefMgr.selectedRadio().getRadioId() != null;
    }
}
