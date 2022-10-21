package com.sana.dev.fm.ui.activity;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;

import android.os.Bundle;
import android.view.View;

import com.sana.dev.fm.R;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.fragment.EmptyViewFragment;

public class NoInternetActivity extends BaseActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_no_internet);

        EmptyViewFragment emptyViewFragment = EmptyViewFragment.newInstance(getString(R.string.label_no_internet), getString(R.string.check_internet_connection),getString(R.string.label_try_again));
        getSupportFragmentManager().beginTransaction()
                .replace(R.id.main_container, emptyViewFragment, emptyViewFragment.getClass().getSimpleName()).addToBackStack(null).commit();

        emptyViewFragment.setOnItemClickListener(new CallBackListener() {
            @Override
            public void onCallBack() {
                if (hasInternetConnection()){
                    showWarningDialog(R.drawable.ic_cloud_off,getString(R.string.label_warinig),"internet is : " + hasInternetConnection(),null,null);

                }else {
                    showWarningDialog(R.drawable.ic_cloud_off,getString(R.string.label_warinig),"internet is : " + hasInternetConnection(),null,null);
                }
            }
        });
    }
}