package com.sana.dev.fm.ui.activity.appuser;

import static android.view.View.VISIBLE;

import android.content.Intent;
import android.os.Bundle;
import android.text.method.LinkMovementMethod;
import android.util.Log;
import android.view.View;
import android.widget.TextView;
import android.text.Html;
import android.text.SpannableString;
import android.text.SpannableStringBuilder;
import android.text.style.ClickableSpan;
import android.text.Spanned;

import androidx.annotation.NonNull;

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
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityLoginByBinding;
import com.sana.dev.fm.model.AuthMethod;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.Gender;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.model.UserType;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQuery;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQueryConditionCode;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;


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
        Log.d(TAG, "User signed in with Google: " + account.getEmail());
        // You can also access account.getIdToken() etc.
        FirebaseUser firebaseUser = FirebaseAuth.getInstance().getCurrentUser();
        String uid = firebaseUser.getUid();
        String email = firebaseUser.getEmail();
        String displayName = firebaseUser.getDisplayName();
        String phoneNumber = firebaseUser.getPhoneNumber();
        String photoUrl = firebaseUser.getPhotoUrl() != null ? firebaseUser.getPhotoUrl().toString() : "";

        UserModel userModel = new UserModel(uid, displayName, email, phoneNumber, null, photoUrl, FmUtilize.getIMEIDeviceId(getBaseContext()), displayName, null, null, false, false, false, FmUtilize.deviceId(getBaseContext()), null, Gender.UNKNOWN, null, null, System.currentTimeMillis(), UserType.USER, AuthMethod.GOOGLE, Tools.getFormattedDateTimeSimple(System.currentTimeMillis(), FmUtilize.englishFormat), FmUtilize.getFirebaseToken(getBaseContext()), null, new ArrayList<>());
        userModel.setVerified(true);
        prefMgr.setUserSession(userModel);
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
        binding.toolbar.imbEvent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });
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

//    private void loginWithFacebook() {
//        // Create login request
//        LoginManager.getInstance().logInWithReadPermissions(this, Arrays.asList("public_profile", EMAIL));
//
////       binding.loginButtonFacebook.setReadPermissions(EMAIL, "public_profile");
//        binding.loginButtonFacebook.registerCallback(mCallbackManager, facebookCallback);
//        // [END initialize_fblogin]
//
//    }

/*
    private void handleFacebookLoginResult(LoginResult loginResult) {
        if (loginResult != null) {
            // Access token received
            AccessToken accessToken = loginResult.getAccessToken();

            // Retrieve user information
            // Retrieve user information
            GraphRequest request = GraphRequest.newMeRequest(accessToken, new GraphRequest.GraphJSONObjectCallback() {
                @Override
                public void onCompleted(@Nullable JSONObject jsonObject, @Nullable GraphResponse graphResponse) {
                    if (graphResponse.getJSONObject() != null) {
                        try {
                            JSONObject userData = graphResponse.getJSONObject();

                            // Extract user information
                            String name = userData.getString("name");
                            String email = userData.getString("email");

                            // Handle user information
                            Log.d(TAG, "User name: " + name);
                            Log.d(TAG, "User email: " + email);
                        } catch (JSONException e) {
                            e.printStackTrace();
                        }
                    } else {
                        Log.e(TAG, "Error retrieving user information");
                    }
                }
            });
            Bundle parameters = new Bundle();
            parameters.putString("fields", "id,name,email");
            request.setParameters(parameters);
            request.executeAsync();
        }
    }
*/

    private void initRemoteConfig() {

//        if (/*BuildConfig.FLAVOR.equals("hudhudfm_google_play") && */!BuildConfig.DEBUG) {
        boolean isAuthFacebookEnable = remoteConfig != null && remoteConfig.isAuthFacebookEnable();
        boolean isAuthSmsEnable = remoteConfig != null && remoteConfig.isAuthSmsEnable();
        boolean isAuthEmailEnable = remoteConfig != null && remoteConfig.isAuthEmailEnable();
        boolean isAuthGoogleEnable = remoteConfig != null && remoteConfig.isAuthGoogleEnable();

        //            binding.loginButtonFacebook.setVisibility(remoteConfig.isFacebookEnable() ? VISIBLE : View.GONE);
        binding.btFacebookLogin.setVisibility(isAuthFacebookEnable ? VISIBLE : View.GONE);
        binding.btGoogleLogin.setVisibility(isAuthGoogleEnable ? VISIBLE : View.GONE);
        binding.btEmailLogin.setVisibility(isAuthEmailEnable ? VISIBLE : View.GONE);
        binding.btMobileLogin.setVisibility(isAuthSmsEnable ? VISIBLE : View.GONE);
//        }


        TextView textView = binding.tvContent;
//        remoteConfig.setTermsReference(getString(R.string.terms_reference));
//        String textWithLinks = "By using this App, you agree to the <a href=\"" + remoteConfig.getTermsReference() + "\">Terms-Conditions &amp; Privacy-Policy</a>.";
//        String textWithLinks = "باستخدام هذا التطبيق، فإنك توافق على <a href=\"" + remoteConfig.getTermsReference() + "\">الشروط و الأحكام &amp; سياسة الخصوصية</a>.";
        String textWithLinks = "بالضغط على زر التسجيل، فإنك توافق على <a href=\"" + remoteConfig.getTermsReference() + "\">الشروط و الأحكام &amp; سياسة الخصوصية</a>.";
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
        Log.d(TAG, "handleFacebookAccessToken:" + token);

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

                            UserModel userModel = new UserModel(uid, displayName, email, phoneNumber, null, photoUrl, FmUtilize.getIMEIDeviceId(getBaseContext()), displayName, null, null, false, false, false, FmUtilize.deviceId(getBaseContext()), null, Gender.UNKNOWN, null, null, System.currentTimeMillis(), UserType.USER, AuthMethod.FACEBOOK, Tools.getFormattedDateTimeSimple(System.currentTimeMillis(), FmUtilize.englishFormat), FmUtilize.getFirebaseToken(getBaseContext()), null, new ArrayList<>());
                            userModel.setVerified(true);
                            prefMgr.setUserSession(userModel);
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
//                Log.d(TAG, "FirebaseUser: " + new Gson().toJson(user));

//                String uid = firebaseUser.getUid();
//                String email = firebaseUser.getEmail();
//                String displayName = firebaseUser.getDisplayName();
//                String phoneNumber = firebaseUser.getPhoneNumber();
////                String getPhotoUrl = user.getPhotoUrl();
//
//                UserModel userModel = new UserModel(uid, displayName, email, phoneNumber, null, null, FmUtilize.getIMEIDeviceId(getBaseContext()), displayName, null, null, false, false, false, FmUtilize.deviceId(getBaseContext()), null, Gender.UNKNOWN, null, null, System.currentTimeMillis(), UserType.USER, Tools.getFormattedDateTimeSimple(System.currentTimeMillis(), FmUtilize.englishFormat), FmUtilize.getFirebaseToken(getBaseContext()), null, new ArrayList<>());

                List<UserInfo> providerData = (List<UserInfo>) firebaseUser.getProviderData();

                for (UserInfo userInfo : providerData) {
                    String providerId = userInfo.getProviderId();
                    userModel.setOtherData(providerId);

                    if (providerId.equals("facebook.com")) {
                        // User signed in using Facebook
                        userModel.setAuthMethod(AuthMethod.FACEBOOK);
                        userModel.setVerified(true);
                        checkUserAuth(userModel);
                    } else if (providerId.equals("google.com")) {
                        // User signed in using Google
                        userModel.setAuthMethod(AuthMethod.GOOGLE);
                        userModel.setVerified(true);
                        checkUserAuth(userModel);
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
            LogUtility.e(LogUtility.tag(LoginByActivity.class), e.toString());
        }
    }

    //FirebaseUser
    void checkUserAuth(UserModel userModel) {
        Intent intent = IntentHelper.userProfileActivity(LoginByActivity.this, true);

        FirestoreDbUtility firestoreDbUtility = new FirestoreDbUtility();
        List<FirestoreQuery> firestoreQueryList = new ArrayList<>();
        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.WHERE_EQUAL_TO,
                "email",
                userModel.getEmail()
        ));

//        firestoreQueryList.add(new FirestoreQuery(
//                FirestoreQueryConditionCode.WHERE_EQUAL_TO,
//                "disabled",
//                false
//        ));
        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.USERS_TABLE, AppConstant.Firebase.USERS_TABLE);
        firestoreDbUtility.getMany(collectionReference, firestoreQueryList, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                LogUtility.d(LogUtility.TAG, "Success checkUserAuth: " + object);

                List<UserModel> userModelList = FirestoreDbUtility.getDataFromQuerySnapshot(object, UserModel.class);

                if (userModelList != null && userModelList.size() > 0) {
                    UserModel user = userModelList.get(0);
                    // cause user logged with auth
                    prefMgr.setUserSession(user);
                    showToast(getString(R.string.login_successfully));
                    startActivity(intent);
                } else {
                    firestoreDbUtility.createOrMerge(collectionReference, userModel.userId, userModel, new CallBack() {
                        @Override
                        public void onSuccess(Object object) {
                            prefMgr.setUserSession(userModel);
                            showToast(getString(R.string.login_successfully));
                            startActivity(intent);
                        }

                        @Override
                        public void onFailure(Object object) {
                            LogUtility.e(LogUtility.TAG, "onError : " + object);
                            showToast(getString(R.string.label_error_occurred_with_val, object.toString()));
                        }
                    });
                }
            }

            @Override
            public void onFailure(Object object) {
                LogUtility.d(LogUtility.TAG, "Failure checkUserAuth: " + object);
                showToast(getString(R.string.label_error_occurred_with_val, object));
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
