package com.sana.dev.fm.ui.activity;

import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.fragment.EmptyViewFragment;
import com.sana.dev.fm.utils.IntentHelper;

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
//                    showInfoDialog(config);
//                    FirebaseAuth.getInstance().signInAnonymously().addOnCompleteListener(new SignInResultNotifier(getBaseContext()));
//                    startActivity(new Intent(IntentHelper.splashActivity(getBaseContext(),true)));
                    FirebaseAuth auth = FirebaseAuth.getInstance();
                    FirebaseUser currentUser = auth.getCurrentUser();

                    if (currentUser != null) {
                        // User is already signed in
                        // Proceed with user-specific operations
                    } else {
                        // User is not signed in
                        // Proceed with sign-in logic
                        auth.signInAnonymously()
                                .addOnSuccessListener(new OnSuccessListener<AuthResult>() {
                                    @Override
                                    public void onSuccess(AuthResult authResult) {
                                        // Sign in success, update UI with the signed-in user's information
//                                        Log.d(TAG, "signInAnonymously:success");
                                        FirebaseUser user = authResult.getUser();
                                        updateUI(user);
                                    }
                                })
                                .addOnFailureListener(new OnFailureListener() {
                                    @Override
                                    public void onFailure(@NonNull Exception e) {
                                        // If sign in fails, display a message to the user.
//                                        Log.w(TAG, "signInAnonymously:failure", e);
//                            Toast.makeText(MainActivity.this, "Authentication failed.", Toast.LENGTH_SHORT).show();
                                        updateUI(null);
                                    }
                                });
                    }


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

    private void updateUI(FirebaseUser user) {
        if (user != null) {
            // User is signed in
            // Display welcome message or allow access to user-specific content
            startActivity(new Intent(IntentHelper.splashActivity(NoInternetActivity.this, false)));
        } else {
            // User is not signed in
            // Display sign-in prompt or redirect to sign-in page
            showToast(getString(R.string.label_error_occurred));
        }
    }
}