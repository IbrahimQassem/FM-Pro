package com.sana.dev.fm.ui.activity.appuser;

import static android.view.View.VISIBLE;

import android.content.Intent;
import android.os.Bundle;
import android.text.method.LinkMovementMethod;
import android.util.Log;
import android.view.View;
import android.widget.TextView;
import android.text.Html;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.facebook.AccessToken;
import com.facebook.CallbackManager;
import com.facebook.FacebookCallback;
import com.facebook.FacebookException;
import com.facebook.login.LoginManager;
import com.facebook.login.LoginResult;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FacebookAuthProvider;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.UserInfo;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityLoginByBinding;
import com.sana.dev.fm.data.mapper.UserMapper;
import com.sana.dev.fm.model.AuthMethod;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.enums.Gender;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.model.enums.UserType;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;


public class LoginByActivity extends BaseActivity implements GoogleSignInHelper.SignInListener {
    private static final String TAG = LogUtility.tag(LoginByActivity.class);

    // [START declare_auth]
    private FirebaseAuth mAuth;
    // [END declare_auth]
    private CallbackManager mCallbackManager;
    private static final String EMAIL = "email";
    ActivityLoginByBinding binding;
    private GoogleSignInHelper helper;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
//        setContentView(R.layout.activity_login_by);
        setContentView((int) R.layout.activity_login_by);

        binding = ActivityLoginByBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);
        helper = new GoogleSignInHelper(this);

        initToolbar();


//        loginWithFacebook();
        // [START initialize_auth]
        // Initialize Firebase Auth
        mAuth = FirebaseAuth.getInstance();
        // [END initialize_auth]

        // [START initialize_fblogin]
        // Initialize Facebook Login button
        mCallbackManager = CallbackManager.Factory.create();

        LoginManager.getInstance().registerCallback(mCallbackManager, facebookCallback);

        initRemoteConfig();

        binding.btMobileLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
//                FirebaseUser currentUser = mAuth.getCurrentUser();
//                updateUI(currentUser);
                Intent intent = IntentHelper.phoneLoginActivity(LoginByActivity.this, false);
                startActivity(intent);
            }
        });

        binding.btFacebookLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                // user_ruvmbeq_one@tfbnw.net / Test123456
                LoginManager.getInstance().logInWithReadPermissions(LoginByActivity.this, Arrays.asList("public_profile", EMAIL));
            }
        });


        // Button click listener for Google Sign-in
        binding.btGoogleLogin.setOnClickListener(v -> helper.signInWithGoogle(this));


        //        binding.btEmailLogin.setOnClickListener(new View.OnClickListener() {
//            @Override
//            public void onClick(View view) {
//                Intent intent = new Intent(LoginByActivity.this, GoogleSignInActivity.class);
//                startActivity(intent);
//            }
//        });

    }

    void logOut() {
//        mAuth.getCurrentUser().linkWithCredential();
    }
    //-----------------------------------------------------

    @Override
    public void onSignInSuccess(GoogleSignInAccount account) {
        // Handle successful sign-in with Google account details
        // You can also access account.getIdToken() etc.
        FirebaseUser firebaseUser = FirebaseAuth.getInstance().getCurrentUser();
        String uid = firebaseUser.getUid();
        String email = firebaseUser.getEmail();
        String displayName = firebaseUser.getDisplayName();
        String phoneNumber = firebaseUser.getPhoneNumber();
        String photoUrl = firebaseUser.getPhotoUrl() != null ? firebaseUser.getPhotoUrl().toString() : "";

        UserModel userModel = new UserModel(uid, displayName, email, phoneNumber, photoUrl, null, displayName, null, null, false, false, false, null, null, Gender.UNKNOWN, null, null, System.currentTimeMillis(), UserType.USER, AuthMethod.GOOGLE, Tools.getFormattedDateTimeSimple(System.currentTimeMillis(), FmUtilize.englishFormat), null, null, new ArrayList<>());
        userModel.setVerified(true);
//        showToast(getString(R.string.login_successfully));

        updateUI(firebaseUser, userModel);
//        showToast("User signed in with Google: " + account.getEmail());
//        showToast(getString(R.string.done_successfully));
//        showToast("User signed in with Google: "+ account.getEmail() + "\n : "+firebaseUser.getEmail());
    }

    @Override
    public void onSignInFailure(Exception e) {
        // Handle sign-in failure
        Log.w(TAG, "Sign in failed", e);
//        showToast("Sign in failed : " + e.toString());
        showToast(getString(R.string.label_error_occurred_with_val, e.getLocalizedMessage()));
    }

    private void initToolbar() {
        binding.toolbar.tvTitle.setText(getString(R.string.label_login));
        binding.toolbar.tvTitle.setTextColor(ContextCompat.getColor(this, R.color.md_theme_onSurface));
        binding.toolbar.appBarLayout.setBackgroundColor(ContextCompat.getColor(this, R.color.md_theme_surface));
        binding.toolbar.imbEvent.setColorFilter(ContextCompat.getColor(this, R.color.md_theme_onSurface));
        binding.toolbar.imbEvent.setOnClickListener(v -> finish());
        Tools.setSystemBarColor(this, R.color.md_theme_surface);
        Tools.setSystemBarLight(this);
    }


    FacebookCallback<LoginResult> facebookCallback = new FacebookCallback<LoginResult>() {
        @Override
        public void onSuccess(LoginResult loginResult) {
            Log.d(TAG, "facebook:onSuccess:" + loginResult);
//            showToast("facebook:onSuccess:" + loginResult);
//            showToast(getString(R.string.login_successfully));
            handleFacebookAccessToken(loginResult.getAccessToken());
        }

        @Override
        public void onCancel() {
            Log.d(TAG, "facebook:onCancel");
            showToast(getString(R.string.label_cancel));
        }

        @Override
        public void onError(FacebookException error) {
            Log.d(TAG, "facebook:onError", error);
//            showToast(error.getMessage());
            showToast(getString(R.string.label_error_occurred_with_val, error.getLocalizedMessage()));
        }
    };

    private void initRemoteConfig() {
        boolean isAuthFacebookEnable = remoteConfig == null || remoteConfig.isAuthFacebookEnable();
        boolean isAuthSmsEnable = remoteConfig != null && remoteConfig.isAuthSmsEnable();
        boolean isAuthEmailEnable = remoteConfig != null && remoteConfig.isAuthEmailEnable();
        boolean isAuthGoogleEnable = remoteConfig == null || remoteConfig.isAuthGoogleEnable();

        binding.btFacebookLogin.setVisibility(VISIBLE);
        binding.btGoogleLogin.setVisibility(isAuthGoogleEnable ? VISIBLE : View.GONE);
        binding.btEmailLogin.setVisibility(isAuthEmailEnable ? VISIBLE : View.GONE);
        binding.btMobileLogin.setVisibility(isAuthSmsEnable ? VISIBLE : View.GONE);

        TextView textView = binding.tvContent;
        String termsRef = remoteConfig != null && remoteConfig.getTermsReference() != null ? remoteConfig.getTermsReference() : "https://hudhudfm.com/terms";
        String textWithLinks = "بالضغط على زر التسجيل، فإنك توافق على <a href=\"" + termsRef + "\">الشروط و الأحكام &amp; سياسة الخصوصية</a>.";
        textView.setText(Html.fromHtml(textWithLinks));
        textView.setMovementMethod(LinkMovementMethod.getInstance());
    }


    // [START on_start_check_user]
    @Override
    public void onStart() {
        super.onStart();
        // Check if user is signed in (non-null) and update UI accordingly.
//        FirebaseUser currentUser = mAuth.getCurrentUser();
//        updateUI(currentUser);
    }
    // [END on_start_check_user]

    // [START on_activity_result]
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        helper.handleActivityResult(requestCode, resultCode, data, this);

        // Pass the activity result back to the Facebook SDK
        mCallbackManager.onActivityResult(requestCode, resultCode, data);
    }
    // [END on_activity_result]

    // [START auth_with_facebook]
    private void handleFacebookAccessToken(AccessToken token) {
        Log.d(TAG, "Signing in with Facebook credential");

        AuthCredential credential = FacebookAuthProvider.getCredential(token.getToken());
        mAuth.signInWithCredential(credential)
                .addOnCompleteListener(this, new OnCompleteListener<AuthResult>() {
                    @Override
                    public void onComplete(@NonNull Task<AuthResult> task) {
//                        if (task.isSuccessful()) {
//                            // Sign in success, update UI with the signed-in user's information
//                            Log.d(TAG, "signInWithCredential:success");
//                            FirebaseUser user = mAuth.getCurrentUser();
//                            updateUI(user);
//                        } else {
//                            // If sign in fails, display a message to the user.
//                            Log.w(TAG, "signInWithCredential:failure", task.getException());
//                            Toast.makeText(LoginByActivity.this, "Authentication failed.",
//                                    Toast.LENGTH_SHORT).show();
//                            updateUI(null);
//                        }
//                        hideProgress();
                        if (task.isSuccessful()) {
                            Log.d(TAG, "signInWithCredential:success");
                            FirebaseUser firebaseUser = task.getResult().getUser();
                            String uid = firebaseUser.getUid();
                            String email = firebaseUser.getEmail();
                            String displayName = firebaseUser.getDisplayName();
                            String phoneNumber = firebaseUser.getPhoneNumber();
                            String photoUrl = firebaseUser.getPhotoUrl() != null ? firebaseUser.getPhotoUrl().toString() : "";

                            UserModel userModel = new UserModel(uid, displayName, email, phoneNumber, photoUrl, null, displayName, null, null, false, false, false, null, null, Gender.UNKNOWN, null, null, System.currentTimeMillis(), UserType.USER, AuthMethod.FACEBOOK, Tools.getFormattedDateTimeSimple(System.currentTimeMillis(), FmUtilize.englishFormat), null, null, new ArrayList<>());
                            userModel.setVerified(true);
//                            showToast(getString(R.string.login_successfully));

                            updateUI(firebaseUser, userModel);
                        } else {
                            Log.w(TAG, "signInWithCredential:failure", task.getException());
                            LogUtility.e(LogUtility.tag(VerificationPhone.class), task.getException().getLocalizedMessage());
                            ModelConfig config = new ModelConfig(R.drawable.ic_warning, getString(R.string.label_error_occurred_with_val, task.getException().getLocalizedMessage()), task.getException().getLocalizedMessage(), new ButtonConfig(getString(R.string.label_cancel)), null);
                            showWarningDialog(config);
                        }
                    }
                });
    }
    // [END auth_with_facebook]

    private void updateUI(FirebaseUser firebaseUser, UserModel userModel) {
        try {
            if (firebaseUser != null && userModel != null) {
                List<UserInfo> providerData = (List<UserInfo>) firebaseUser.getProviderData();
                boolean handled = false;

                if (providerData != null) {
                    for (UserInfo userInfo : providerData) {
                        String providerId = userInfo.getProviderId();
                        userModel.setOtherData(providerId);

                        if ("facebook.com".equals(providerId)) {
                            userModel.setAuthMethod(AuthMethod.FACEBOOK);
                            userModel.setVerified(true);
                            checkUserAuth(userModel);
                            handled = true;
                            break;
                        } else if ("google.com".equals(providerId)) {
                            userModel.setAuthMethod(AuthMethod.GOOGLE);
                            userModel.setVerified(true);
                            checkUserAuth(userModel);
                            handled = true;
                            break;
                        }
                    }
                }

                if (!handled) {
                    checkUserAuth(userModel);
                }
            }
        } catch (Exception e) {
            LogUtility.e(TAG, "Failed to map authenticated user profile: " + e.getMessage());
        }
    }

    //FirebaseUser
    void checkUserAuth(UserModel userModel) {
        Intent intent = IntentHelper.userProfileActivity(LoginByActivity.this, true);

        FirestoreDbUtility firestoreDbUtility = new FirestoreDbUtility();
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection()
                .document(AppConstant.Firebase.USERS_COLLECTION)
                .collection(AppConstant.Firebase.USERS_COLLECTION);
        firestoreDbUtility.getOne(collectionReference, userModel.userId, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                DocumentSnapshot document = (DocumentSnapshot) object;
                if (document != null && document.exists()) {
                    UserModel user = null;
                    try {
                        user = document.toObject(UserModel.class);
                    } catch (Exception e) {
                        LogUtility.e(TAG, "Error deserializing user profile: " + e.getMessage());
                    }
                    if (user == null) {
                        user = userModel;
                    }
                    if (user.getUserId() == null || user.getUserId().isEmpty()) {
                        user.setUserId(document.getId());
                    }
                    if (user.getName() == null || user.getName().isEmpty()) {
                        user.setName(userModel.getName());
                    }
                    if (user.getPhotoUrl() == null || user.getPhotoUrl().isEmpty()) {
                        user.setPhotoUrl(userModel.getPhotoUrl());
                    }
                    // cause user logged with auth
                    prefMgr.setUserSession(user);
                    showToast(getString(R.string.login_successfully));
                    startActivity(intent);
                } else {
                    Map<String, Object> canonicalUserData = UserMapper.toCanonicalFirestoreMap(userModel, true);
                    firestoreDbUtility.createOrMerge(collectionReference, userModel.userId, canonicalUserData, new CallBack() {
                        @Override
                        public void onSuccess(Object object) {
                            prefMgr.setUserSession(userModel);
                            showToast(getString(R.string.login_successfully));
                            startActivity(intent);
                        }

                        @Override
                        public void onFailure(Object object) {
                            LogUtility.e(TAG, "User profile creation failed");
                            showToast(getString(R.string.unkon_error_please_try_again_later));
                        }
                    });
                }
            }

            @Override
            public void onFailure(Object object) {
                LogUtility.e(TAG, "User profile lookup failed");
                showToast(getString(R.string.unkon_error_please_try_again_later));
            }
        });
    }


/*
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_face_book);

        CallbackManager callbackManager = CallbackManager.Factory.create();




        LoginButton loginButton = (LoginButton) findViewById(R.id.login_button);
        loginButton.setReadPermissions(Arrays.asList(EMAIL));
        // If you are using in a fragment, call loginButton.setFragment(this);

        // Callback registration
        loginButton.registerCallback(callbackManager, facebookCallback);


        callbackManager = CallbackManager.Factory.create();

        LoginManager.getInstance().registerCallback(facebookCallback);


        AccessToken accessToken = AccessToken.getCurrentAccessToken();
        boolean isLoggedIn = accessToken != null && !accessToken.isExpired();


        LoginManager.getInstance().logInWithReadPermissions(this, Arrays.asList("public_profile"));


        LoginManager.getInstance().retrieveLoginStatus(this, new LoginStatusCallback() {
            @Override
            public void onCompleted(AccessToken accessToken) {
                // User was previously logged in, can log them in directly here.
                // If this callback is called, a popup notification appears that says
                // "Logged in as <User Name>"
            }
            @Override
            public void onFailure() {
                // No access token could be retrieved for the user
            }
            @Override
            public void onError(Exception exception) {
                // An error occurred
            }
        });


    }
*/

}
