package com.sana.dev.fm.ui.activity;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.android.material.snackbar.Snackbar;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.UserType;
import com.sana.dev.fm.model.interfaces.BaseView;
import com.sana.dev.fm.ui.dialog.FmGeneralDialog;
import com.sana.dev.fm.utils.Constants;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.MyContextWrapper;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.ProgressHUD;
import com.sana.dev.fm.utils.SnackBarUtility;
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

    @Nullable
    @BindView(R.id.tv_title)
    TextView txvLogo;

    @Nullable
    @BindView(R.id.imb_event)
    ImageButton imb_event;

    private MenuItem inboxMenuItem;

    SnackBarUtility sbHelp;

    protected CheckInternetConnection connectionChecker;
    UserGuide userGuide;
    protected NetworkCallback networkCallback;
    private boolean connectionAvailable = true;
    private long backPressedTime;



    @Override
    public void setContentView(int layoutResID) {
        super.setContentView(layoutResID);
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
        PreferencesManager.initializeInstance(this);
        connectionChecker = new CheckInternetConnection();
        prefMgr = PreferencesManager.getInstance();
        userGuide = new UserGuide(this);
        setupToolbar();
    }

    void chekInternetCon() {
        connectionChecker.addConnectionChangeListener(new ConnectionChangeListener() {
            @Override
            public void onConnectionChanged(boolean isConnectionAvailable) {
                if (connectionAvailable && !isConnectionAvailable) {
                    connectionAvailable = false;
//                    showSnackBar("Internet is : "+connectionAvailable);
                } else if (!connectionAvailable && isConnectionAvailable) {
                    connectionAvailable = true;
//                    showSnackBar("Internet is : "+connectionAvailable);
                }

                // Check just for MainBottomNav because the interface NetworkCallback
                if (BaseActivity.this instanceof MainActivity) {
                    networkCallback = (NetworkCallback) BaseActivity.this;
                    networkCallback.onNetworkChange(connectionAvailable);
                }
            }
        });
    }

    public boolean hasInternetConnection() {
        return connectionAvailable;
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

    public ImageButton getToolbarArrow() {
        return imb_event;
    }


/*
    public void startTour(View view, String id, String text, Focus focusType, ShapeType shape) {
        userGuide.showIntro(view, id, text, focusType, shape);
    }

    @Override
    public void onUserClickedTarget(String materialIntroViewId, View viewId, View.OnClickListener listener) {

        switch (materialIntroViewId) {
            case INTRO_FOCUS_1:
                startTour(viewId, INTRO_FOCUS_1, "من خلال هذا الزر يمكنك تشغيل البث المباشر للقناة الإذاعية التي تم تحديدها", Focus.ALL, ShapeType.CIRCLE);
                Toast.makeText(this, materialIntroViewId, Toast.LENGTH_SHORT).show();
                break;
            case INTRO_FOCUS_2:
                startTour(viewId, INTRO_FOCUS_2, "يمكنك تحديد القناة الإذاعية التي ترغب في متابعتها من خلال ضغط الكارد الخاص بالإذاعة", Focus.ALL, ShapeType.CIRCLE);
                Toast.makeText(this, materialIntroViewId, Toast.LENGTH_SHORT).show();
                break;
//            case MENU_ABOUT_ID_TAG:
////                showIntro(navigation_header.findViewById(R.id.bt_account), MENU_SHARED_ID_TAG, getString(R.string.lorem_ipsum), FocusGravity.LEFT);
//
//                break;
//            case MENU_SHARED_ID_TAG:
//                Toast.makeText(MainActivity.this, "Complete!", Toast.LENGTH_SHORT).show();
//                break;
            default:
                break;
        }

    }
*/

    @Override
    public void startMainActivity() {
        Intent intent = IntentHelper.mainActivity(getApplicationContext(), true);
        startActivity(intent);
    }


    @Override
    public void showProgress(String message) {
        hideProgress();
        mProgressHUD.showDialogPrivate( /*(Activity) this.getApplicationContext(), */message, true, false, null);
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
//        Snackbar snackbar = Snackbar.make(findViewById(android.R.id.content),message, Snackbar.LENGTH_LONG);
//        snackbar.show();
        sbHelp = new SnackBarUtility(this);
        sbHelp.showSnackBar(message, 3000);
    }


    @Override
    public void showSnackBar(View view, @StringRes int messageId) {
        Snackbar snackbar = Snackbar.make(view, messageId, Snackbar.LENGTH_LONG);
        snackbar.show();
    }


    @Override
    public void showToast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }


    @Override
    public void showWarningDialog(ModelConfig config) {
        config.setViewType(FmGeneralDialog.VIEW_WARNING);
        config.setCancellable(true);
        FmGeneralDialog dialogWarning = new FmGeneralDialog(this, config);
        dialogWarning.show();
    }


    @Override
    public void showInfoDialog(ModelConfig config) {
        config.setViewType(FmGeneralDialog.VIEW_INFO);
        config.setCancellable(true);
        FmGeneralDialog dialogWarning = new FmGeneralDialog(this, config);
        dialogWarning.show();
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
                    showSnackBar(getString(R.string.press_once_again_to_exit));
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

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(MyContextWrapper.wrap(newBase, PreferencesManager.getInstance().getPrefLange()));
    }

    @Override
    public void finish() {
        super.finish();
        overridePendingTransition(R.anim.slide_in, R.anim.slide_out);
    }

    @Override
    protected void onResume() {
        super.onResume();
//        checkIfFirebaseAuth();
    }

    protected FirebaseAuth mAuth;
    protected FirebaseUser currentUser;
    private void checkIfFirebaseAuth() {

        mAuth = FirebaseAuth.getInstance();
        mAuth.setLanguageCode(PreferencesManager.getInstance().getPrefLange());
        currentUser = mAuth.getCurrentUser();
        currentUser.reload().addOnCompleteListener(new OnCompleteListener<Void>() {
            @Override
            public void onComplete(@NonNull Task<Void> task) {
                if (task.isSuccessful()) {
                    //User still exists and credentials are valid
                    Log.d(LogUtility.TAG, "User still exists : " + task.isSuccessful());

                } else {
                    //User has been disabled, deleted or login credentials are no longer valid,
                    //so send them to Login screen
                    Log.d(LogUtility.TAG, "User has been disabled, deleted : " + task.getException());
                    startActivity(new Intent(IntentHelper.introActivity(BaseActivity.this, true)));
                }
            }
        });
    }
}

//        2022-10-22 18:51:50.357 20745-20745/com.sana.dev.fm D/main_log: readAllRadioByEvent error: {"code":"PERMISSION_DENIED","cause":{"fillInStackTrace":true,"status":{"code":"PERMISSION_DENIED","description":"Missing or insufficient permissions."},"detailMessage":"PERMISSION_DENIED: Missing or insufficient permissions.","stackTrace":[]},"detailMessage":"PERMISSION_DENIED: Missing or insufficient permissions.","stackTrace":[]}
