package com.sana.dev.fm.ui.activity.userApp;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.CollectionReference;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityEmailLoginBinding;
import com.sana.dev.fm.model.AuthMethod;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.model.enums.Gender;
import com.sana.dev.fm.model.enums.UserType;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.KProgressHUDHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQuery;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQueryConditionCode;

import java.util.ArrayList;
import java.util.List;

public class EmailLoginActivity extends BaseActivity {
    ActivityEmailLoginBinding binding;
    private FirebaseAuth mAuth;
    private KProgressHUDHelper kProgressHUDHelper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_email_login);

        binding = ActivityEmailLoginBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);

        // Initialize Firebase Auth
        mAuth = FirebaseAuth.getInstance();
        kProgressHUDHelper = new KProgressHUDHelper(this);

        binding.toolbar.imbEvent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        // Register button click listener
        binding.btEmailRegister.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (binding.etEmail.getText().toString().trim().isEmpty()) {
                    binding.etEmail.setError(getString(R.string.error_empty_field_not_allowed));
                    binding.etEmail.requestFocus();
                    return;
                } else if (binding.etPassword.getText().toString().trim().isEmpty()) {
                    binding.etPassword.setError(getString(R.string.error_empty_field_not_allowed));
                    binding.etPassword.requestFocus();
                    return;
                }

                String email = binding.etEmail.getText().toString();
                String password = binding.etPassword.getText().toString();
                registerUser(email, password);
            }
        });

        // Login button click listener
        binding.btEmailLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // validate input user here
                if (binding.etEmail.getText().toString().trim().isEmpty()) {
                    binding.etEmail.setError(getString(R.string.error_empty_field_not_allowed));
                    binding.etEmail.requestFocus();
                    return;
                } else if (binding.etPassword.getText().toString().trim().isEmpty()) {
                    binding.etPassword.setError(getString(R.string.error_empty_field_not_allowed));
                    binding.etPassword.requestFocus();
                    return;
                }

                String email = binding.etEmail.getText().toString();
                String password = binding.etPassword.getText().toString();
                loginUser(email, password);
            }
        });
    }

    private void registerUser(String email, String password) {
        mAuth.createUserWithEmailAndPassword(email, password)
                .addOnCompleteListener(this, new OnCompleteListener<AuthResult>() {
                    @Override
                    public void onComplete(@NonNull Task<AuthResult> task) {
                        if (task.isSuccessful()) {
                            // Registration success
                            FirebaseUser firebaseUser = mAuth.getCurrentUser();
                            String uid = firebaseUser.getUid();
                            String email = firebaseUser.getEmail();
                            String displayName = firebaseUser.getDisplayName();
                            String phoneNumber = firebaseUser.getPhoneNumber();
                            String photoUrl = firebaseUser.getPhotoUrl() != null ? firebaseUser.getPhotoUrl().toString() : null;

                            UserModel userModel = new UserModel(uid, displayName, email, phoneNumber, null, photoUrl, FmUtilize.getIMEIDeviceId(getBaseContext()), displayName, null, null, false, false, false, FmUtilize.deviceId(getBaseContext()), null, Gender.UNKNOWN, null, null, System.currentTimeMillis(), UserType.USER, AuthMethod.EMAIL, Tools.getFormattedDateTimeSimple(System.currentTimeMillis(), FmUtilize.englishFormat), FmUtilize.getFirebaseToken(getBaseContext()), null, new ArrayList<>(),String.valueOf(System.currentTimeMillis()));
                            userModel.setVerified(true);

                            checkUserAuth(userModel);
                        } else {
                            // Registration failed
                            showToast(getString(R.string.label_error_occurred_with_val,task.getException().getMessage()));
                        }
                    }
                });
    }

    private void loginUser(String email, String password) {
        mAuth.signInWithEmailAndPassword(email, password)
                .addOnCompleteListener(this, new OnCompleteListener<AuthResult>() {
                    @Override
                    public void onComplete(@NonNull Task<AuthResult> task) {
                        if (task.isSuccessful()) {
                            // Login success
//                            showToast(getString(R.string.login_successfully));
                            // You can also access account.getIdToken() etc.
                            FirebaseUser firebaseUser = task.getResult().getUser();
                            String uid = firebaseUser.getUid();
                            String email = firebaseUser.getEmail();
                            String displayName = firebaseUser.getDisplayName();
                            String phoneNumber = firebaseUser.getPhoneNumber();
                            String photoUrl = firebaseUser.getPhotoUrl() != null ? firebaseUser.getPhotoUrl().toString() : null;

                            UserModel userModel = new UserModel(uid, displayName, email, phoneNumber, null, photoUrl, FmUtilize.getIMEIDeviceId(getBaseContext()), displayName, null, null, false, false, false, FmUtilize.deviceId(getBaseContext()), null, Gender.UNKNOWN, null, null, System.currentTimeMillis(), UserType.USER, AuthMethod.EMAIL, Tools.getFormattedDateTimeSimple(System.currentTimeMillis(), FmUtilize.englishFormat), FmUtilize.getFirebaseToken(getBaseContext()), null, new ArrayList<>(),String.valueOf(System.currentTimeMillis()));
                            userModel.setVerified(true);

                            checkUserAuth(userModel);
                        } else {
                            // Login failed
                            showToast(getString(R.string.label_error_occurred_with_val,task.getException().getMessage()));
                        }
                    }
                });
    }

    void checkUserAuth(UserModel userModel) {
        Intent intent = IntentHelper.userProfileActivity(EmailLoginActivity.this, true);

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
                            showToast(getString(R.string.label_registration_successful));
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

//    @Override
//    protected void onStart() {
//        super.onStart();
//        // Check if user is signed in (non-null) and update UI accordingly
//        FirebaseUser currentUser = mAuth.getCurrentUser();
//        if (currentUser != null) {
//            showToast(getString(R.string.label_user_already_logged_in));
//        }
//    }
}