package com.sana.dev.fm.ui.activity;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import com.google.firebase.auth.FirebaseAuth;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.fragment.EmptyViewFragment;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.SignInResultNotifier;

public class NoInternetActivity extends BaseActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_no_internet);

        EmptyViewFragment emptyViewFragment = EmptyViewFragment.newInstance(getString(R.string.label_no_internet), getString(R.string.check_internet_connection), getString(R.string.label_try_again));
        getSupportFragmentManager().beginTransaction()
                .replace(R.id.main_container, emptyViewFragment, emptyViewFragment.getClass().getSimpleName()).addToBackStack(null).commit();



        emptyViewFragment.setOnItemClickListener(new CallBackListener() {
            @Override
            public void onCallBack() {
                if (hasInternetConnection()) {
//                    showInfoDialog(config);
                    FirebaseAuth.getInstance().signInAnonymously().addOnCompleteListener(new SignInResultNotifier(NoInternetActivity.this));
                    startActivity(new Intent(IntentHelper.splashActivity(NoInternetActivity.this,true)));
                } else {
                /*    ModelConfig config = new ModelConfig(-1, getString(R.string.label_warning),  "internet is : " + hasInternetConnection(),  new ButtonConfig(getString(R.string.label_cancel), new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            showToast("No");
                        }
                    }), new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            showToast("Yes");
                        }
                    }));
                    config.getBtnConfirm().setOnClickListener(new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            showInfoDialog(config);
                        }
                    });
                    showWarningDialog(config);*/
                    showToast(getString(R.string.label_no_internet));
                }
            }
        });
    }
}