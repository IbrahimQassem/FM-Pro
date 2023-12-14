package com.sana.dev.fm.ui.activity.appuser;

import static android.view.View.VISIBLE;
import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.USERS_TABLE;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;

import androidx.annotation.NonNull;

import com.facebook.AccessToken;
import com.facebook.CallbackManager;
import com.facebook.FacebookCallback;
import com.facebook.FacebookException;
import com.facebook.login.LoginManager;
import com.facebook.login.LoginResult;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FacebookAuthProvider;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.UserInfo;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityLoginByBinding;
import com.sana.dev.fm.model.AppRemoteConfig;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.Gender;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.model.UserType;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;
import com.sana.dev.fm.utils.my_firebase.FmUserCRUDImpl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class LoginByActivity extends BaseActivity {
    private static final String TAG = "LoginByActivity";

    // [START declare_auth]
    private FirebaseAuth mAuth;
    // [END declare_auth]

    private CallbackManager mCallbackManager;
    private static final String EMAIL = "email";

    ActivityLoginByBinding binding;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
//        setContentView(R.layout.activity_login_by);
        setContentView((int) R.layout.activity_login_by);

        binding = ActivityLoginByBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);

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
    }

    private void initToolbar() {
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
            showToast(getString(R.string.unkon_error_please_try_again_later));
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
        AppRemoteConfig remoteConfig = PreferencesManager.getInstance().getAppRemoteConfig();
        if (remoteConfig != null) {
            // Todo check
//            binding.loginButtonFacebook.setVisibility(remoteConfig.isFacebookEnable() ? VISIBLE : View.GONE);
            binding.btFacebookLogin.setVisibility(remoteConfig.isAuthFacebookEnable() ? VISIBLE : View.GONE);
            binding.btMobileLogin.setVisibility(remoteConfig.isAuthSmsEnable() ? VISIBLE : View.GONE);
        }
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
                            FirebaseUser user = task.getResult().getUser();
                            String uid = user.getUid();
                            String email = user.getEmail();
                            String displayName = user.getDisplayName();
                            String phoneNumber = user.getPhoneNumber();
                            String photoUrl = user.getPhotoUrl() != null ? user.getPhotoUrl().toString() : "";

                            UserModel userModel = new UserModel(uid, displayName, email, phoneNumber, null, photoUrl, FmUtilize.getIMEIDeviceId(getBaseContext()), displayName, null, null, false, false, false, FmUtilize.deviceId(getBaseContext()), null, Gender.UNKNOWN, null, null, System.currentTimeMillis(), UserType.USER, Tools.getFormattedDateTimeSimple(System.currentTimeMillis(), FmUtilize.englishFormat), FmUtilize.getFirebaseToken(getBaseContext()), null, new ArrayList<>());
                            userModel.setVerified(true);
                            prefMgr.setUserSession(userModel);
                            showToast(getString(R.string.login_successfully));

                            updateUI(user);
                        } else {
                            Log.w(TAG, "signInWithCredential:failure", task.getException());
                            LogUtility.e(LogUtility.tag(VerificationPhone.class), task.getException().getLocalizedMessage());
                            ModelConfig config = new ModelConfig(R.drawable.ic_warning, getString(R.string.label_error_occurred), task.getException().getLocalizedMessage(), new ButtonConfig(getString(R.string.label_cancel)), null);
                            showWarningDialog(config);
                        }
                    }
                });
    }
    // [END auth_with_facebook]

    private void updateUI(FirebaseUser user) {
        try {
            if (user != null) {
//                Log.d(TAG, "FirebaseUser: " + new Gson().toJson(user));

                String uid = user.getUid();
                String email = user.getEmail();
                String displayName = user.getDisplayName();
                String phoneNumber = user.getPhoneNumber();
//                String getPhotoUrl = user.getPhotoUrl();

                UserModel userModel = new UserModel(uid, displayName, email, phoneNumber, null, null, FmUtilize.getIMEIDeviceId(getBaseContext()), displayName, null, null, false, false, false, FmUtilize.deviceId(getBaseContext()), null, Gender.UNKNOWN, null, null, System.currentTimeMillis(), UserType.USER, Tools.getFormattedDateTimeSimple(System.currentTimeMillis(), FmUtilize.englishFormat), FmUtilize.getFirebaseToken(getBaseContext()), null, new ArrayList<>());

                List<UserInfo> providerData = (List<UserInfo>) user.getProviderData();

                for (UserInfo userInfo : providerData) {
                    String providerId = userInfo.getProviderId();
                    userModel.setOtherDate(providerId);

                    if (providerId.equals("facebook.com")) {
                        // User signed in using Facebook
                        checkUserAuth(userModel);
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
            LogUtility.e(LogUtility.tag(LoginByActivity.class), e.toString());
        }
    }

    //FirebaseUser
    void checkUserAuth(UserModel userModel) {
        Intent intent = IntentHelper.userProfileActivity(LoginByActivity.this, true);
        FmUserCRUDImpl fmRepo = new FmUserCRUDImpl(this, USERS_TABLE);
        fmRepo.queryAllByFbEmail(userModel.getEmail(), null, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                LogUtility.d(LogUtility.TAG, "onSuccess : " + object);
                UserModel _userModel = (UserModel) object;
                // cause user logged with auth
                _userModel.setVerified(true);
                prefMgr.setUserSession(_userModel);
                showToast(getString(R.string.login_successfully));
                startActivity(intent);
            }

            @Override
            public void onError(Object object) {
                LogUtility.e(LogUtility.TAG, "onError : " + object);
                if (object == null) {
                    // create new user
                    fmRepo.create(userModel.getUserId(), userModel, new CallBack() {
                        @Override
                        public void onSuccess(Object object) {
                            prefMgr.setUserSession((UserModel) object);
                            showToast(getString(R.string.login_successfully));
                            startActivity(intent);
                        }

                        @Override
                        public void onError(Object object) {
                            LogUtility.e(LogUtility.TAG, "onError : " + object);
                            showToast(object.toString());
                        }
                    });
                }
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
