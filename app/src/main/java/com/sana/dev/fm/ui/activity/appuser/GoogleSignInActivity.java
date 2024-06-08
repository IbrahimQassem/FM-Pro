package com.sana.dev.fm.ui.activity.appuser;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;
import com.google.firebase.auth.UserInfo;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityGoogleSignInBinding;
import com.sana.dev.fm.databinding.ActivityLoginByBinding;
import com.sana.dev.fm.model.AuthMethod;
import com.sana.dev.fm.model.Gender;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.model.UserType;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;

import java.util.ArrayList;
import java.util.List;

public class GoogleSignInActivity extends BaseActivity {
    private static final String TAG = LogUtility.tag(GoogleSignInActivity.class);//"GoogleActivity";
    private static final int RC_SIGN_IN = 9001;

    // [START declare_auth]
    private FirebaseAuth mAuth;
    // [END declare_auth]

    private GoogleSignInClient mGoogleSignInClient;
    ActivityGoogleSignInBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_google_sign_in);

        binding = ActivityGoogleSignInBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);

        // [START config_signin]
        // Configure Google Sign In
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(getString(R.string.default_web_client_id))
                .requestEmail()
                .build();

        mGoogleSignInClient = GoogleSignIn.getClient(this, gso);
        // [END config_signin]

        // [START initialize_auth]
        // Initialize Firebase Auth
        mAuth = FirebaseAuth.getInstance();
        // [END initialize_auth]

        binding.btClick.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                signIn();
            }
        });
    }

    // [START on_start_check_user]
    @Override
    public void onStart() {
        super.onStart();
        // Check if user is signed in (non-null) and update UI accordingly.
        FirebaseUser currentUser = mAuth.getCurrentUser();
        updateUI(currentUser);
    }
    // [END on_start_check_user]

    // [START onactivityresult]
    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        // Result returned from launching the Intent from GoogleSignInApi.getSignInIntent(...);
        if (requestCode == RC_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                // Google Sign In was successful, authenticate with Firebase
                GoogleSignInAccount account = task.getResult(ApiException.class);
                Log.d(TAG, "firebaseAuthWithGoogle:" + account.getId());
                firebaseAuthWithGoogle(account.getIdToken());
            } catch (Exception e) {
                // Google Sign In failed, update UI appropriately
                e.printStackTrace();
                Log.e(TAG, "Google sign in failed: " + e.getMessage());
            }
        }
    }
    // [END onactivityresult]

    // [START auth_with_google]
    private void firebaseAuthWithGoogle(String idToken) {
        AuthCredential credential = GoogleAuthProvider.getCredential(idToken, null);
        mAuth.signInWithCredential(credential)
                .addOnCompleteListener(this, new OnCompleteListener<AuthResult>() {
                    @Override
                    public void onComplete(@NonNull Task<AuthResult> task) {
                        if (task.isSuccessful()) {
                            // Sign in success, update UI with the signed-in user's information
                            Log.d(TAG, "signInWithCredential:success");
                            FirebaseUser user = mAuth.getCurrentUser();
                            updateUI(user);
                        } else {
                            // If sign in fails, display a message to the user.
                            Log.w(TAG, "signInWithCredential:failure", task.getException());
                            updateUI(null);
                        }
                    }
                });
    }
    // [END auth_with_google]

    // [START signin]
    private void signIn() {
        Intent signInIntent = mGoogleSignInClient.getSignInIntent();
        startActivityForResult(signInIntent, RC_SIGN_IN);
    }
    // [END signin]

    private void updateUI(FirebaseUser user) {
        try {
            if (user != null) {
//                Log.d(TAG, "FirebaseUser: " + new Gson().toJson(user));

                String uid = user.getUid();
                String email = user.getEmail();
                String displayName = user.getDisplayName();
                String phoneNumber = user.getPhoneNumber();
//                String getPhotoUrl = user.getPhotoUrl();

                UserModel userModel = new UserModel(uid, displayName, email, phoneNumber, null, null, FmUtilize.getIMEIDeviceId(getBaseContext()), displayName, null, null, false, false, false, FmUtilize.deviceId(getBaseContext()), null, Gender.UNKNOWN, null, null, System.currentTimeMillis(), UserType.USER,  AuthMethod.GOOGLE, Tools.getFormattedDateTimeSimple(System.currentTimeMillis(), FmUtilize.englishFormat), FmUtilize.getFirebaseToken(getBaseContext()), null, new ArrayList<>());

                binding.tvTitle.setText(userModel.toString());

                List<UserInfo> providerData = (List<UserInfo>) user.getProviderData();

                for (UserInfo userInfo : providerData) {
                    String providerId = userInfo.getProviderId();
                    userModel.setOtherDate(providerId);

                    if (providerId.equals("facebook.com")) {
                        // User signed in using Facebook
//                        checkUserAuth(userModel);
                    } else if (providerId.equals("google.com")) {
                        // User signed in using Google
                    } else if (providerId.equals("password")) {
                        // User signed in using email and password
                    } else if (providerId.equals("firebase")) {
                        // User signed in using firebase
                    } else {
                        // Unknown provider
                    }
                }

            }
        } catch (Exception e) {
            LogUtility.e(LogUtility.tag(GoogleSignInActivity.class), e.toString());
        }
    }

}