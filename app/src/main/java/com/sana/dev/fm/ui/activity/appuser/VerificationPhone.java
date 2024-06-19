package com.sana.dev.fm.ui.activity.appuser;


import static com.sana.dev.fm.utils.AppConstant.Firebase.USERS_TABLE;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.annotation.NonNull;
import androidx.appcompat.widget.AppCompatButton;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.android.material.textfield.TextInputEditText;
import com.google.firebase.FirebaseException;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.PhoneAuthCredential;
import com.google.firebase.auth.PhoneAuthOptions;
import com.google.firebase.auth.PhoneAuthProvider;
import com.google.firebase.firestore.CollectionReference;
import com.sana.dev.fm.R;
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
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.FmUserCRUDImpl;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQuery;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQueryConditionCode;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class VerificationPhone extends BaseActivity {
    private String verificationId;
    private FirebaseAuth mAuth;
    TextInputEditText editText;
    AppCompatButton buttonSignIn;
    String phoneNumber = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_verification_phone);
        Tools.setSystemBarColor(this, R.color.grey_20);

        mAuth = FirebaseAuth.getInstance();
        prefMgr = PreferencesManager.getInstance();

//        progressBar = findViewById(R.id.progressbar);
        editText = findViewById(R.id.editTextCode);
        buttonSignIn = findViewById(R.id.buttonSignIn);

        phoneNumber = getIntent().getStringExtra(AppConstant.General.CONST_MOBILE);
        if (phoneNumber != null)
            sendVerificationCode(phoneNumber);


        buttonSignIn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {

                String code = editText.getText().toString().trim();
                if (code.isEmpty() || code.length() < 6) {
                    editText.setError(getString(R.string.label_verifying_code));
                    editText.requestFocus();
                    return;
                }
                hideKeyboard();
                verifyCode(code);
            }
        });

    }

    private void verifyCode(String code) {
        try {
            PhoneAuthCredential credential = PhoneAuthProvider.getCredential(verificationId, code);
            signInWithCredential(credential);
        } catch (Exception e) {
            LogUtility.e(LogUtility.tag(VerificationPhone.class), e.toString());
            ModelConfig config = new ModelConfig(R.drawable.ic_warning, getString(R.string.label_error_occurred), e.getLocalizedMessage(), new ButtonConfig(getString(R.string.label_cancel)), null);
            showWarningDialog(config);
        }
    }



    private void signInWithCredential(PhoneAuthCredential credential) {
        if (!isFinishing())
            showProgress("");
        mAuth.signInWithCredential(credential)
                .addOnCompleteListener(new OnCompleteListener<AuthResult>() {
                    @Override
                    public void onComplete(@NonNull Task<AuthResult> task) {
                        hideProgress();
                        if (task.isSuccessful()) {
                            FirebaseUser user = task.getResult().getUser();
                            user.updatePhoneNumber(credential);
                            checkUserAuth(user);
                        } else {
//                            showToast(task.getException().getLocalizedMessage());
                            LogUtility.e(LogUtility.tag(VerificationPhone.class), task.getException().getLocalizedMessage());
                            ModelConfig config = new ModelConfig(R.drawable.ic_warning, getString(R.string.label_error_occurred), task.getException().getLocalizedMessage(), new ButtonConfig(getString(R.string.label_cancel)), null);
                            showWarningDialog(config);
                        }
                    }
                });
    }

    void checkUserAuth(FirebaseUser firebaseUser) {
        Intent intent = IntentHelper.userProfileActivity(VerificationPhone.this, true);

        FirestoreDbUtility firestoreDbUtility = new FirestoreDbUtility();
        List<FirestoreQuery> firestoreQueryList = new ArrayList<>();
        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.WHERE_EQUAL_TO,
                "mobile",
                phoneNumber
        ));


        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.USERS_TABLE, AppConstant.Firebase.USERS_TABLE);
        firestoreDbUtility.getMany(collectionReference, firestoreQueryList, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                LogUtility.d(LogUtility.TAG, "Success checkUserAuth: " + object);

                List<UserModel> userModelList = FirestoreDbUtility.getDataFromQuerySnapshot(object, UserModel.class);

                if (userModelList != null && userModelList.size() > 0) {
                    UserModel user = userModelList.get(0);
                    // cause user logged with auth
                    user.setVerified(true);
                    user.setAuthMethod(AuthMethod.SMS);
                    prefMgr.setUserSession(user);
                    showToast(getString(R.string.login_successfully));
                    startActivity(intent);
                } else {
                    String uid = firebaseUser.getUid();
                    String name = firebaseUser.getDisplayName();
                    UserModel obUser = new UserModel(uid, name, null, phoneNumber, null, null, FmUtilize.getIMEIDeviceId(VerificationPhone.this), null, null, null, true, false, false, FmUtilize.deviceId(VerificationPhone.this), null, Gender.UNKNOWN, null, null, System.currentTimeMillis(), UserType.USER, AuthMethod.SMS,  Tools.getFormattedDateTimeSimple(System.currentTimeMillis(), FmUtilize.englishFormat), FmUtilize.getFirebaseToken(VerificationPhone.this), null, new ArrayList<>());

                    firestoreDbUtility.createOrMerge(collectionReference, obUser.userId, obUser, new CallBack() {
                        @Override
                        public void onSuccess(Object object) {
                            prefMgr.setUserSession(obUser);
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
                showToast(getString(R.string.label_error_occurred_with_val,object));
            }
        });
    }


    private void sendVerificationCode(String phoneNumber) {

        try {
/*        PhoneAuthProvider.getInstance().verifyPhoneNumber(
                phoneNumber,
                120,
                TimeUnit.SECONDS,
                (VerificationPhone) ContextCompat.getMainExecutor(VerificationPhone.this),
                mCallBack
        );*/
            PhoneAuthOptions options =
                    PhoneAuthOptions.newBuilder(mAuth)
                            .setPhoneNumber(phoneNumber)       // Phone number to verify
                            .setTimeout(120L, TimeUnit.SECONDS) // Timeout and unit
                            .setActivity(this)                 // Activity (for callback binding)
                            .setCallbacks(mCallBack)          // OnVerificationStateChangedCallbacks
                            .build();
            PhoneAuthProvider.verifyPhoneNumber(options);
        } catch (Throwable e) {
            // Todo fixme
            //handle carefully
            LogUtility.e(LogUtility.tag(VerificationPhone.class), e.toString());
            ModelConfig config = new ModelConfig(R.drawable.ic_warning, getString(R.string.label_error_occurred), e.getLocalizedMessage(), new ButtonConfig(getString(R.string.label_cancel)), null);
            showWarningDialog(config);
        }
    }


    private PhoneAuthProvider.OnVerificationStateChangedCallbacks
            mCallBack = new PhoneAuthProvider.OnVerificationStateChangedCallbacks() {

        @Override
        public void onCodeSent(String s, PhoneAuthProvider.ForceResendingToken forceResendingToken) {
            super.onCodeSent(s, forceResendingToken);
            verificationId = s;
        }

        @Override
        public void onVerificationCompleted(PhoneAuthCredential phoneAuthCredential) {
            String code = phoneAuthCredential.getSmsCode();
            if (code != null) {
                editText.setText(code);
                verifyCode(code);
            }
        }

        @Override
        public void onVerificationFailed(FirebaseException e) {
            LogUtility.e(LogUtility.tag(VerificationPhone.class), e.toString());
            ModelConfig config = new ModelConfig(R.drawable.ic_warning, getString(R.string.label_error_occurred), e.getLocalizedMessage(), new ButtonConfig(getString(R.string.label_cancel)), null);
            showWarningDialog(config);
            hideProgress();
        }
    };


}