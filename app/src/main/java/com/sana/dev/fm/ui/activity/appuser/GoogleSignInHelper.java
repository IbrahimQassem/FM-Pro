package com.sana.dev.fm.ui.activity.appuser;

import android.app.Activity;
import android.app.Fragment;
import android.content.Intent;

import androidx.fragment.app.FragmentActivity;

import com.google.android.gms.auth.api.Auth;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.GoogleApiClient;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;
import com.sana.dev.fm.R;

public class GoogleSignInHelper {

    private final Activity activity;
    private FirebaseAuth mAuth;
    private GoogleApiClient mGoogleApiClient;
//    private GoogleSignInClient mGoogleSignInClient;

    private static final int RC_SIGN_IN = 9001; // Your chosen request code

    public interface SignInListener {
        void onSignInSuccess(GoogleSignInAccount account);
        void onSignInFailure(Exception e);
    }

    public GoogleSignInHelper(FragmentActivity activity) {
        this.activity = activity;

//        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
//                .requestIdToken(activity.getString(R.string.default_web_client_id))
//                .requestEmail()
//                .build();

        GoogleSignInOptions googleSignInOptions = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(activity.getString(R.string.default_web_client_id))
                .requestEmail()
                .build();

//        mGoogleSignInClient = GoogleSignIn.getClient(activity, gso);

        // Configure Google Sign-In client
        mGoogleApiClient = new GoogleApiClient.Builder(activity)
                .enableAutoManage(activity, /* OnConnectionFailedListener */ null /* Provide your implementation here */)
                .addApi(Auth.GOOGLE_SIGN_IN_API,googleSignInOptions)
                .build();

        // Get Firebase Auth instance
        mAuth = FirebaseAuth.getInstance();
    }

    public void signInWithGoogle(SignInListener listener) {
        Intent signInIntent = Auth.GoogleSignInApi.getSignInIntent(mGoogleApiClient);
//        Intent signInIntent = mGoogleSignInClient.getSignInIntent();
        activity.startActivityForResult(signInIntent, RC_SIGN_IN);
    }

    public void handleActivityResult(int requestCode, int resultCode, Intent data, SignInListener listener) {
        if (requestCode == RC_SIGN_IN) {
            try {
                Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
                GoogleSignInAccount account = task.getResult(ApiException.class);
                listener.onSignInSuccess(account);
                firebaseAuthWithGoogle(account, listener); // Handle Firebase Authentication
            } catch (Exception e) {
                listener.onSignInFailure(e);
            }
        }
    }

    private void firebaseAuthWithGoogle(GoogleSignInAccount acct, SignInListener listener) {
        AuthCredential credential = GoogleAuthProvider.getCredential(acct.getIdToken(), null);
        mAuth.signInWithCredential(credential)
                .addOnCompleteListener(activity, task -> {
                    if (task.isSuccessful()) {
                        // Sign in success, update UI with the signed-in user's information
//                        FirebaseUser user = mAuth.getCurrentUser();
                        listener.onSignInSuccess(acct); // Pass GoogleSignInAccount for further processing
                    } else {
                        // Sign in failed
                        listener.onSignInFailure(task.getException());
                    }
                });
    }
}
