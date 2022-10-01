package com.sana.dev.fm.ui.activity.appuser;


import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.FB_FM_FOLDER_PATH;
import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.USERS_TABLE;
import static com.sana.dev.fm.model.Users.getToken;


import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.telephony.PhoneNumberFormattingTextWatcher;
import android.text.TextUtils;
import android.text.method.PasswordTransformationMethod;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.widget.AppCompatRadioButton;
import androidx.appcompat.widget.Toolbar;
import androidx.core.content.ContextCompat;

import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.OnPausedListener;
import com.google.firebase.storage.OnProgressListener;
import com.google.firebase.storage.StorageMetadata;
import com.google.firebase.storage.StorageReference;
import com.google.firebase.storage.UploadTask;
import com.mikhaellopez.circularimageview.CircularImageView;
import com.sana.dev.fm.R;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.ui.activity.SplashActivity;
import com.sana.dev.fm.utils.AESCrypt;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.ProgressHUD;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.UsersRepositoryImpl;
import com.sana.dev.fm.utils.my_firebase.notification.FMCConstants;
import com.sana.dev.fm.model.Gender;
import com.sana.dev.fm.model.Users;

import com.yalantis.ucrop.UCrop;

import java.io.File;

import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnClick;


public class UserProfileActivity extends BaseActivity {
    private static final int PICK_IMAGE =100 ;

    private final String TAG = UserProfileActivity.class.getSimpleName();

    private final int STATE_INITIALIZED = 1;
    private final int STATE_CODE_SENT = 2;
    private final int STATE_VERIFY_FAILED = 3;
    private final int STATE_VERIFY_SUCCESS = 4;
    private final int STATE_SIGNIN_FAILED = 5;
    private final int STATE_SIGNIN_SUCCESS = 6;

    //    @BindView(R.id.civ_profile)
//    CircularImageView civ_profile;
    @BindView(R.id.img_profile)
    CircularImageView img_profile;

    @BindView(R.id.tv_label_user_name)
    TextView tv_label_user_name;
    @BindView(R.id.tv_label_user_desc)
    TextView tv_label_user_desc;

    @BindView(R.id.et_full_name)
    EditText et_full_name;
    @BindView(R.id.et_email)
    EditText et_email;
    @BindView(R.id.et_mobile)
    EditText et_mobile;
    @BindView(R.id.et_password)
    EditText et_password;

    @BindView(R.id.ib_pass)
    ImageButton ib_pass;

    @BindView(R.id.rg_gender)
    RadioGroup rg_gender;
    @BindView(R.id.radio_male)
    AppCompatRadioButton radio_male;
    @BindView(R.id.radio_female)
    AppCompatRadioButton radio_female;


    @BindView(R.id.btn_save)
    Button btn_save;
    private FirebaseAuth mAuth;
    private String userId, name, email, mobile, password, XphotoUrl, token, nickNme, bio, tag, deviceId, stopNote, country, city;

    private Gender gender = Gender.UNKNOWN;

    //    private Uri imageUri = null;
    private Users _userModel;
    UsersRepositoryImpl fmRepo;

    public static void startActivity(Context context) {
        Intent intent = new Intent(context, UserProfileActivity.class);
        context.startActivity(intent);
    }

    /* Access modifiers changed, original: protected */
    public void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        setContentView((int) R.layout.activity_user_profile);
        ButterKnife.bind(this);
        this.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN);

        fmRepo = new UsersRepositoryImpl(UserProfileActivity.this, USERS_TABLE);

        mAuth = FirebaseAuth.getInstance();
        mAuth.setLanguageCode("ar");
        // [END initialize_auth]
        prefMgr = new PreferencesManager(this);

        initToolbar();
        init();

    }

    private void init() {
        hideKeyboard();

//        int color = getResources().getColor(R.color.fab_color_shadow);
//        ColorFilter cf = new PorterDuffColorFilter(color, PorterDuff.Mode.MULTIPLY);
//        img_profile.setColorFilter(cf);

//        userId = name = email = mobile = password = photoUrl = token = nickNme = bio = tag = deviceId = stopNote = country = city = "";

//        int color = getResources().getColor(R.color.grey_10);
//        ColorFilter cf = new PorterDuffColorFilter(color, PorterDuff.Mode.MULTIPLY);
//        civ_profile.setColorFilter(cf);

        et_mobile.addTextChangedListener(new PhoneNumberFormattingTextWatcher());
//        disableEditText(et_mobile);
        findViewById(R.id.rtl_img_parent).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                onImageSelect(view);
            }
        });

        rg_gender.setOnCheckedChangeListener(new RadioGroup.OnCheckedChangeListener() {
            public void onCheckedChanged(RadioGroup group, int checkedId) {
                switch (checkedId) {
                    case R.id.radio_male:
                        // do operations specific to this selection
                        gender = Gender.MALE;
                        break;
                    case R.id.radio_female:
                        // do operations specific to this selection
                        gender = Gender.FEMALE;
                        break;
                }
            }
        });

        FirebaseUser currentUser = mAuth.getCurrentUser();
        updateUI(STATE_VERIFY_SUCCESS, currentUser);
//        disableEditText(et_mobile);
        et_mobile.setFocusable(false);
        et_mobile.setClickable(true);

        et_mobile.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showToast("لا يمكن تعديل رقم الموبايل");
            }
        });

//        et_mobile.setOnTouchListener(new View.OnTouchListener() {
//            @Override
//            public boolean onTouch(View v, MotionEvent event) {
//                Toast.makeText(getApplicationContext(),"Component is disabled", Toast.LENGTH_SHORT).show();
//                return false;
//            }
//        });

        et_password.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                try {
//                    String plainText = "123456";
//                    String encryptedTest =
                    Toast.makeText(UserProfileActivity.this, "" + AESCrypt.decrypt(_userModel.getPassword()), Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });


        //assign the image in code (or you can do this in your layout xml with the src attribute)
        ib_pass.setImageDrawable(ContextCompat.getDrawable(this, R.drawable.ic_visibility_off));

//set the click listener
        ib_pass.setOnClickListener(new View.OnClickListener() {

            public void onClick(View button) {
                try {
                    //Set the button's appearance
                    button.setSelected(!button.isSelected());

                    if (button.isSelected()) {
                        //Handle selected state change
                        ib_pass.setImageDrawable(ContextCompat.getDrawable(UserProfileActivity.this, R.drawable.ic_visibility));
//                        et_password.setText(AESCrypt.decrypt(_userModel.getPassword()));
                        et_password.setTransformationMethod(null);
                    } else {
                        //Handle de-select state change
                        ib_pass.setImageDrawable(ContextCompat.getDrawable(UserProfileActivity.this, R.drawable.ic_visibility_off));
//                        et_password.setText(AESCrypt.encrypt(_userModel.getPassword()));
                        et_password.setTransformationMethod(new PasswordTransformationMethod());
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }


            }

        });

    }

    private void disableEditText(EditText editText) {
        editText.setFocusable(false);
        editText.setEnabled(false);
        editText.setCursorVisible(true);
        editText.setKeyListener(null);
//        editText.setBackgroundColor(Color.TRANSPARENT);
    }


    public void onClear() {
        /* Clears all selected radio buttons to default */
        RadioButton rb = (RadioButton) rg_gender.findViewById(rg_gender.getCheckedRadioButtonId());
        Toast.makeText(UserProfileActivity.this, rb.getText(), Toast.LENGTH_SHORT).show();

    }


    public void onImageSelect(View view) {
        Intent intent = new Intent();
        intent.setType("image/*");
        intent.setAction(Intent.ACTION_GET_CONTENT);
        startActivityForResult(Intent.createChooser(intent, getString(R.string.click_to_change_image)), PICK_IMAGE);
    }


    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_IMAGE) {
            if (resultCode == RESULT_OK) {
                Uri uriImg = data.getData();
                //start crop activity
                UCrop.Options options = new UCrop.Options();
                options.setCompressionFormat(Bitmap.CompressFormat.PNG);
                options.setCompressionQuality(100);
                options.setShowCropGrid(true);

                UCrop.of(uriImg, Uri.fromFile(new File(getCacheDir(), String.format(getResources().getString(R.string.image_desc), FmUtilize.random()))))
                        .withAspectRatio(1, 1)
                        .withOptions(options)
                        .start(this);

            }
        }
        if (requestCode == UCrop.REQUEST_CROP) {
            if (resultCode == RESULT_OK) {
                Uri uriImg = UCrop.getOutput(data);
//                ivUserProfile.setImageURI(imageUri);
                Tools.displayUserProfile(UserProfileActivity.this, img_profile, String.valueOf(uriImg));
                // Todo upload image
                uploadUserProfile(uriImg);

            } else if (resultCode == UCrop.RESULT_ERROR) {
                Log.e(TAG, "Crop error:" + UCrop.getError(data).getMessage());
            }
        }
    }


    private void initToolbar() {
//        setSupportActionBar((Toolbar) findViewById(R.id.toolbar));
//        getSupportActionBar().setTitle(null);
//        ((Toolbar) findViewById(R.id.toolbar)).setNavigationIcon(R.drawable.ic_arrow_back_white_24dp);
//        getSupportActionBar().setDisplayHomeAsUpEnabled(false);
//        Tools.setSystemBarColor(this, R.color.white); // red_A400
//        Tools.setSystemBarLight(this);
        setSupportActionBar((Toolbar) findViewById(R.id.toolbar));
        getSupportActionBar().setTitle(null);
        ((Toolbar) findViewById(R.id.toolbar)).setNavigationIcon(R.drawable.ic_arrow_back);
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        Tools.setSystemBarColor(this, R.color.colorPrimary);
    }

    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_notif_setting, menu);
        Tools.changeMenuIconColor(menu, getResources().getColor(R.color.colorPrimary));

        return true;
    }

    public boolean onOptionsItemSelected(MenuItem menuItem) {
        switch (menuItem.getItemId()) {
            case android.R.id.home:
                finish();
                break;
            case R.id.action_pick_image:
                onImageSelect(img_profile);
                break;
            case R.id.action_close:
                signOut();
                Toast.makeText(getApplicationContext(), menuItem.getTitle(), Toast.LENGTH_LONG).show();
                break;
        }
        return super.onOptionsItemSelected(menuItem);
    }

    // [START on_start_check_user]
    @Override
    public void onStart() {
        super.onStart();
        // Check if user is signed in (non-null) and update UI accordingly.
        FirebaseUser currentUser = mAuth.getCurrentUser();
        if (currentUser == null) {
//            showToast(getString(R.string.most_login));
            startLoginActivity();
            finish();
        } else {
//            chekUserAuth();
            if (prefMgr.getUsers() != null)
                _userModel = prefMgr.getUsers();
        }
    }
    // [END on_start_check_user]


    private void signOut() {
        mAuth.signOut();
        prefMgr.remove(FMCConstants.USER_INFO);
        prefMgr.remove(FMCConstants.USER_MOBILE);
        prefMgr.remove(FMCConstants.USER_IMAGE_Profile);
        Intent intent = splashPage(this, true);
        startActivity(intent);
        finish();
        showToast("تم تسجيل الخروج");
        updateUI(STATE_INITIALIZED);
    }

    private void updateUI(int uiState) {
        updateUI(uiState, mAuth.getCurrentUser());
    }

    private void updateUI(FirebaseUser user) {
        if (user != null) {
            updateUI(STATE_SIGNIN_SUCCESS, user);
        } else {
            updateUI(STATE_INITIALIZED);
        }
    }


    private void updateUI(int uiState, FirebaseUser user) {
        switch (uiState) {
            case STATE_INITIALIZED:
                // Initialized state, show only the phone number field and start button
//                enableViews(mStartButton, mPhoneNumberField);
//                disableViews(mVerifyButton, mResendButton, mVerificationField);
//                mDetailText.setText(null);
                break;
            case STATE_CODE_SENT:
                // Code sent state, show the verification field, the
//                enableViews(mVerifyButton, mResendButton, mPhoneNumberField, mVerificationField);
//                disableViews(mStartButton);
//                mDetailText.setText("status_code_sent");
                break;
            case STATE_VERIFY_FAILED:
                // Verification has failed, show all options
//                enableViews(mStartButton, mVerifyButton, mResendButton, mPhoneNumberField,
//                        mVerificationField);
//                mDetailText.setText("status_verification_failed");
                break;
            case STATE_VERIFY_SUCCESS:
                // Verification has succeeded, proceed to firebase sign in
//                disableViews(mStartButton, mVerifyButton, mResendButton, mPhoneNumberField,
//                        mVerificationField);
//                mDetailText.setText("status_verification_succeeded");
//                String phone = prefMgr.read(FMCConstants.USER_MOBILE, "");
//                Log.d(TAG, "mobile is " + phone);
//                et_mobile.setText(phone);

                break;
            case STATE_SIGNIN_FAILED:
                // No-op, handled by sign-in check
//                mDetailText.setText("status_sign_in_failed");
                break;
            case STATE_SIGNIN_SUCCESS:
                // Np-op, handled by sign-in check

                break;
        }

        if (user == null) {
            // Signed out
//            mPhoneNumberViews.setVisibility(View.VISIBLE);
//            mSignedInViews.setVisibility(View.GONE);
//
//            mStatusText.setText("signed_out");
        } else {
            // Signed in
//            mPhoneNumberViews.setVisibility(View.GONE);
//            mSignedInViews.setVisibility(View.VISIBLE);
//
//            enableViews(mPhoneNumberField, mVerificationField);
//            mPhoneNumberField.setText(null);
//            mVerificationField.setText(null);
//
//            mStatusText.setText("signed_in");
//            mDetailText.setText(getString(R.string.firebase_status_fmt, user.getUid()));


            if (prefMgr.getUsers() == null) {
//                Toast.makeText(this, getString(R.string.moust_login), Toast.LENGTH_SHORT).show();
                return;
            } else {
                _userModel = prefMgr.getUsers();
            }


            tv_label_user_name.setText(_userModel.getName());
            et_mobile.setText(_userModel.getMobile());
            tv_label_user_desc.setText(_userModel.getBio());
//            tv_label_user_desc.setText(user.getUid());
            et_full_name.setText(_userModel.getName());
            et_email.setText(_userModel.getEmail());

            try {
                et_password.setText(AESCrypt.decrypt(_userModel.getPassword()));
            } catch (Exception e) {
                e.printStackTrace();
            }
            gender = _userModel.getGender() != null ? _userModel.getGender() : Gender.UNKNOWN;
            if (Gender.FEMALE.equalsName(gender.getText()))
                radio_female.setChecked(true);
            else
                radio_male.setChecked(true);
//            rg_gender.check(radio_male.getId());


            Tools.displayUserProfile(this, img_profile, _userModel.getPhotoUrl());
//            photoUrl = _userModel.getPhotoUrl();
//            imageUri=Uri.parse(photoUrl);
        }
    }

    @OnClick(R.id.btn_save)
    public void onFabClick() {
        saveUserData();
    }

    private void saveUserData() {
        valedateInput();


        Users oldUser = prefMgr.getUsers();

        String _oName = oldUser.getName() != null ? oldUser.getName() : "";
        String _oPhoto = oldUser.getPhotoUrl() != null ? oldUser.getPhotoUrl() : "";
        String _imgUrl = prefMgr.read(FMCConstants.USER_IMAGE_Profile, "empty");
        if (_oPhoto.equals(_imgUrl) && _oName.equals(name) && oldUser.getGender().equals(gender)) {
            startMainActivity();
            return;
        } else {
            Users user = prefMgr.getUsers();
            user.setName(name);
            user.setPhotoUrl(_imgUrl);
            user.setGender(gender);
            user.setDeviceToken(getToken(this));
//            updateUser(user);
//            updateUser(new Users(name, _imgUrl, gender, getToken(this)));
            fmRepo.createUpdateUser(_userModel.getUserId(), user, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    prefMgr.write(FMCConstants.USER_INFO, (Users) object);
                    showToast(R.string.save_succefully);
                    startMainActivity();
                }

                @Override
                public void onError(Object object) {
                    Log.d(TAG, "onError : " + object);
                    showToast("حدث خطأ, يرجى المحاولة لاحقا");
                }
            });
        }

    }

    private void valedateInput() {

        name = et_full_name.getText().toString().trim();
        email = "";// et_email.getText().toString().trim();
        mobile = et_mobile.getText().toString().trim();
        password = "";//et_password.getText().toString().trim();

        if (TextUtils.isEmpty(name)) {
            showSnackBar(String.format(" %s", getResources().getString(R.string.field_is_required, et_full_name.getHint())));
            et_full_name.requestFocus();
            return;
        }

//        if (TextUtils.isEmpty(email)) {
//            showSnackBar(String.format(" %s", getResources().getString(R.string.field_is_required, et_email.getHint())));
//            et_email.requestFocus();
//            return;
//        }

        if (TextUtils.isEmpty(mobile)) {
            showSnackBar(String.format(" %s", getResources().getString(R.string.field_is_required, et_mobile.getHint())));
            et_mobile.requestFocus();
            return;
        }

//        if (TextUtils.isEmpty(password)) {
//            showSnackBar(String.format(" %s", getResources().getString(R.string.field_is_required, et_password.getHint())));
//            et_password.requestFocus();
//            return;
//        }

        if (rg_gender.getCheckedRadioButtonId() == -1) {
            // no radio buttons  checked
            showSnackBar(String.format(" %s", getResources().getString(R.string.field_is_required, getResources().getString(R.string.gender))));
            return;
        }

////        if (!imageUri.equals(Uri.parse(photoUrl))) {
//        if (imageUri != null) {
//            uploadUserProfile();
//        } else {
//            updateUser(photoUrl);
//        }


    }

    private void uploadUserProfile(Uri uriImage) {
//        if (imageUri != null) {
        ProgressHUD mProgressHUD = ProgressHUD.showDialog( "حفظ صورة البروفايل", true, false, null);
        mProgressHUD.setMessage("جاري حفظ صورة البروفايل ...");
        mProgressHUD.show();

        // Create file metadata including the content type
        StorageMetadata metadata = new StorageMetadata.Builder()
                .setContentType("image/jpg")
                .build();
        final StorageReference ref = FirebaseStorage.getInstance().getReference().child(FB_FM_FOLDER_PATH).child(USERS_TABLE).child(mAuth.getUid() + ".jpg");

        // Upload file and metadata to the path 'images/mountains.jpg'
        UploadTask uploadTask = ref.putFile(uriImage, metadata);

        // Listen for state changes, errors, and completion of the upload.
        uploadTask.addOnProgressListener(new OnProgressListener<UploadTask.TaskSnapshot>() {
            @Override
            public void onProgress(UploadTask.TaskSnapshot taskSnapshot) {
                double progress = (100.0 * taskSnapshot.getBytesTransferred()) / taskSnapshot.getTotalByteCount();
//                    Log.d(TAG, "Upload is " + progress + "% done");
                mProgressHUD.setCanceledOnTouchOutside(false);
                mProgressHUD.setMessage(" يرجى الإنتظار " + " % " + (int) progress);

            }
        }).addOnPausedListener(new OnPausedListener<UploadTask.TaskSnapshot>() {
            @Override
            public void onPaused(UploadTask.TaskSnapshot taskSnapshot) {
                Log.d(TAG, "Upload is paused");
            }
        }).addOnFailureListener(new OnFailureListener() {
            @Override
            public void onFailure(@NonNull Exception exception) {
                // Handle unsuccessful uploads
                showToast("نعتذر لم يتم الحفظ !" + exception.toString());
                mProgressHUD.dismiss();
            }
        }).addOnSuccessListener(new OnSuccessListener<UploadTask.TaskSnapshot>() {
            @Override
            public void onSuccess(UploadTask.TaskSnapshot taskSnapshot) {
                // Handle successful uploads on complete
                if (taskSnapshot.getMetadata() != null) {
                    if (taskSnapshot.getMetadata().getReference() != null) {
                        Task<Uri> result = taskSnapshot.getStorage().getDownloadUrl();
                        result.addOnSuccessListener(new OnSuccessListener<Uri>() {
                            @Override
                            public void onSuccess(Uri uri) {
                                String downloadUri = uri.toString();
//                                    showSnackBar(downloadUri);
                                prefMgr.write(FMCConstants.USER_IMAGE_Profile, downloadUri);

//                                ------------------------------------
                                Users user = prefMgr.getUsers();
                                user.setPhotoUrl(downloadUri);
                                updateUser(user);
                            }
                        });
                    }
                }
                mProgressHUD.dismiss();

            }
        });

//        }
//        else {
//            showSnackBar("يجب إضافة صورة البروفايل");
//            img_profile.startAnimation(AnimationUtils.loadAnimation(this, R.anim.shake_error));
//        }
    }


    void updateUser(Users model) {
        // Check if user is signed in (non-null) and update UI accordingly.
//        FirebaseUser currentUser = mAuth.getCurrentUser();
//        if (currentUser == null) {
//            Toast.makeText(this, getString(R.string.most_login), Toast.LENGTH_SHORT).show();
//            return;
//        }
        fmRepo.createUpdateUser(_userModel.getUserId(), model, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                prefMgr.write(FMCConstants.USER_INFO, (Users) object);
            }

            @Override
            public void onError(Object object) {
                Log.d(TAG, "onError : " + object);
            }
        });

    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
        goToMain();
    }

    private void goToMain() {
        Intent intent = BaseActivity.mainPage(UserProfileActivity.this, true);
        startActivity(intent);
        finish();
    }

    //    void chekUserAuth() {
//        Users.getUserInfo(ProfileWhite.this, prefMgr.read(FMCConstants.USER_MOBILE,""), new CallBack() {
//            @Override
//            public void onSuccess(Object object) {
//                _userModel = (Users) object;
////                showToast(_userModel.toString());
//                Log.e(TAG,"_userModel : "+_userModel.toString());
//            }
//
//            @Override
//            public void onError(Object object) {
//
//            };
//        });
//    }

}
