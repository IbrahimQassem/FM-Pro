package com.sana.dev.fm.ui.activity.appuser;

import static com.sana.dev.fm.model.Users.getToken;
import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.USERS_TABLE;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Toast;

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
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.Gender;
import com.sana.dev.fm.model.UserType;
import com.sana.dev.fm.model.Users;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.UsersRepositoryImpl;
import com.sana.dev.fm.utils.my_firebase.notification.FMCConstants;

import java.util.concurrent.TimeUnit;

public class VerificationPhone extends BaseActivity {

    private String verificationId;
    private FirebaseAuth mAuth;

    //    ProgressBar progressBar;
    TextInputEditText editText;
    AppCompatButton buttonSignIn;
    String phoneNumber = "";
    //    SharedPreferences prefs;
    PreferencesManager prefMgr;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_verification_phone);
        Tools.setSystemBarColor(this, R.color.grey_20);

        mAuth = FirebaseAuth.getInstance();

//        progressBar = findViewById(R.id.progressbar);
        editText = findViewById(R.id.editTextCode);
        buttonSignIn = findViewById(R.id.buttonSignIn);

        phoneNumber = getIntent().getStringExtra("phoneNumber");
        sendVerificationCode(phoneNumber);

        // save phone number
//        prefs = getApplicationContext().getSharedPreferences("USER_PREF",
//                Context.MODE_PRIVATE);
        prefMgr = new PreferencesManager(this);

//        SharedPreferences.Editor editor = prefs.edit();
        prefMgr.write("mobile", phoneNumber);

        buttonSignIn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {

                String code = editText.getText().toString().trim();
                if (code.isEmpty() || code.length() < 6) {
                    editText.setError("أدخل رمز التحقق");
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
//            Toast.makeText(getApplicationContext(), e.getMessage(), Toast.LENGTH_SHORT).show();
        }

    }

    private void signInWithCredential(PhoneAuthCredential credential) {
        showProgress();
        mAuth.signInWithCredential(credential)
                .addOnCompleteListener(new OnCompleteListener<AuthResult>() {
                    @Override
                    public void onComplete(@NonNull Task<AuthResult> task) {
                        hideProgress();
                        if (task.isSuccessful()) {

                            FirebaseUser user = task.getResult().getUser();
                            user.updatePhoneNumber(credential);
//                            Users.initNewUser(user, VerificationPhone.this);

                            chekUserAuth(user);

//
                        } else {
                            showToast(task.getException().getLocalizedMessage());
                        }
                    }
                });
    }

    void chekUserAuth(FirebaseUser user) {
        Intent intent = new Intent(VerificationPhone.this, UserProfileActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);

        UsersRepositoryImpl fmRepo = new UsersRepositoryImpl(this, USERS_TABLE);
        fmRepo.isUserExists(phoneNumber, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                LogUtility.d(LogUtility.TAG, "onSuccess : " + object);

                Users _userModel = (Users) object;
                prefMgr.write(FMCConstants.USER_INFO, _userModel);
                showToast(getString(R.string.login_successfully));
                startActivity(intent);
            }

            @Override
            public void onError(Object object) {
                LogUtility.d(LogUtility.TAG, "onError : " + object);
//                SuperADMIN
                if (object == null) {
                    // create new user
                    String uid = user.getUid();
                    String name = user.getDisplayName();
//                String email = user.getEmail();
//                   String mobile = TextUtils.isEmpty(user.getPhoneNumber()) ? user.getPhoneNumber() : prefMng.read(FMCConstants.USER_MOBILE,"");
//                    Users obUser =  new Users(uid, name, phoneNumber,prefMgr.read(FMCConstants.USER_IMAGE_Profile,"empty"), getToken(VerificationPhone.this), Gender.UNKNOWN, new Date(),null,null,null,null);
                    Users obUser = new Users(uid, name, null, phoneNumber, null, prefMgr.read(FMCConstants.USER_IMAGE_Profile, "empty"), getToken(VerificationPhone.this), null, null, null, false, false, false, FmUtilize.deviceId(VerificationPhone.this), null, Gender.UNKNOWN, null, null, System.currentTimeMillis(), UserType.USER);

                    fmRepo.createUpdateUser(uid, obUser, new CallBack() {
                        @Override
                        public void onSuccess(Object object) {
                            Users _userModel = (Users) object;
                            prefMgr.write(FMCConstants.USER_INFO, _userModel);
                            showToast(getString(R.string.login_successfully));
                            startActivity(intent);
                        }

                        @Override
                        public void onError(Object object) {
                            LogUtility.d(LogUtility.TAG, "onError : " + object);
                            showToast(object.toString());
                        }
                    });
                }
            }
        });

    }

    private void sendVerificationCode(String phoneNumber) {
        //        progressBar.setVisibility(View.VISIBLE);
//        PhoneAuthProvider.getInstance().verifyPhoneNumber(
//                phoneNumber,
//                120,
//                TimeUnit.SECONDS,
//                (VerificationPhone) ContextCompat.getMainExecutor(VerificationPhone.this),
//                mCallBack
//        );
        PhoneAuthOptions options =
                PhoneAuthOptions.newBuilder(mAuth)
                        .setPhoneNumber(phoneNumber)       // Phone number to verify
                        .setTimeout(120L, TimeUnit.SECONDS) // Timeout and unit
                        .setActivity(this)                 // Activity (for callback binding)
                        .setCallbacks(mCallBack)          // OnVerificationStateChangedCallbacks
                        .build();
        PhoneAuthProvider.verifyPhoneNumber(options);

//        progressBar.setVisibility(View.GONE);
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
            Toast.makeText(VerificationPhone.this, e.getMessage(), Toast.LENGTH_LONG).show();
//            progressBar.setVisibility(View.GONE);
            hideProgress();
        }
    };


}