package com.sana.dev.fm.ui.activity;

import android.content.Intent;
import android.os.Bundle;

import com.sana.dev.fm.R;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.fragment.EmptyViewFragment;
import com.sana.dev.fm.utils.IntentHelper;

/**
 * Shown when the app launches with no internet.
 * On retry, redirects to SplashActivity which owns the auth flow.
 */
public class NoInternetActivity extends BaseActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_no_internet);

        EmptyViewFragment emptyViewFragment = EmptyViewFragment.newInstance(getString(R.string.label_error_occurred), "", getString(R.string.label_try_again));
        getSupportFragmentManager().beginTransaction()
                .replace(R.id.main_container, emptyViewFragment, emptyViewFragment.getClass().getSimpleName()).addToBackStack(null).commit();

        emptyViewFragment.setOnItemClickListener(new CallBackListener() {
            @Override
            public void onCallBack() {
                if (hasInternetConnection()) {
                    // Delegate auth to SplashActivity which owns the startup flow
                    startActivity(new Intent(IntentHelper.splashActivity(NoInternetActivity.this, false)));
                    finish();
                } else {
                    showToast(getString(R.string.label_no_internet));
                }
            }
        });
    }
}