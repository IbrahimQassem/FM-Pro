package com.sana.dev.fm.ui.activity.appuser;


import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.FB_FM_FOLDER_PATH;
import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.USERS_TABLE;

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
import android.webkit.URLUtil;
import android.widget.EditText;
import android.widget.RadioButton;
import android.widget.RadioGroup;

import androidx.annotation.NonNull;
import androidx.appcompat.widget.AppCompatRadioButton;
import androidx.core.content.ContextCompat;

import com.facebook.login.LoginManager;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.EmailAuthProvider;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.OnPausedListener;
import com.google.firebase.storage.OnProgressListener;
import com.google.firebase.storage.StorageMetadata;
import com.google.firebase.storage.StorageReference;
import com.google.firebase.storage.UploadTask;
import com.google.gson.Gson;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityUserProfileBinding;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.Gender;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.AESCrypt;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;
import com.sana.dev.fm.utils.my_firebase.FmUserCRUDImpl;
import com.yalantis.ucrop.UCrop;

import java.io.File;


public class UserProfileActivity extends BaseActivity {
    public static final int PICK_IMAGE = 100;

    private final String TAG = UserProfileActivity.class.getSimpleName();

    ActivityUserProfileBinding binding;

    private FirebaseAuth mAuth;
//    private String userId, name, email, mobile, password, photoUrl, token, nickNme, bio, tag, deviceId, stopNote, country, city;

//    private Gender gender = Gender.UNKNOWN;

    //    private Uri imageUri = null;
//    private UserModel _userModel;
    private FmUserCRUDImpl fmRepo;


    /* Access modifiers changed, original: protected */
    public void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        binding = ActivityUserProfileBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);

        hideKeyboard();

        fmRepo = new FmUserCRUDImpl(this, USERS_TABLE);
        mAuth = FirebaseAuth.getInstance();
        mAuth.setLanguageCode(PreferencesManager.getInstance().getPrefLange());
        // [END initialize_auth]
        prefMgr = PreferencesManager.getInstance();

        initToolbar();
        init();
    }

    private void init() {

        // Todo fix
        if (prefMgr.getUserSession() != null) {
            UserModel _userModel = prefMgr.getUserSession();
            LogUtility.d(LogUtility.TAG, " UserSession : " + new Gson().toJson(_userModel));
            binding.tvLabelUserName.setText(_userModel.getName());
            binding.tvLabelUserEmail.setText(_userModel.getEmail());
            binding.tvLabelUserMobile.setText(_userModel.getMobile());

            binding.etFullName.setText(_userModel.getName());
            binding.etEmail.setText(_userModel.getEmail());
            binding.etMobile.setText(FmUtilize.trimMobileCode(_userModel.getMobile()));

            try {
                binding.etPassword.setText(AESCrypt.decrypt(_userModel.getPassword()));
            } catch (Exception e) {
                LogUtility.e(TAG, e.toString());
            }

            Gender gender = _userModel.getGender() != null ? _userModel.getGender() : Gender.UNKNOWN;
            if (Gender.FEMALE == gender) {
                binding.radioFemale.setChecked(true);
            } else if (Gender.MALE == gender) {
                binding.radioMale.setChecked(true);
            }

//            Tools.setTextOrHideIfEmpty(binding.etMobile, null);
//            Tools.setTextOrHideIfEmpty(binding.etEmail, null);

            disableEditText(binding.etMobile);
            disableEditText(binding.etEmail);

            if (URLUtil.isValidUrl(_userModel.getPhotoUrl()))
                Tools.displayUserProfile(this, binding.imgProfile, _userModel.getPhotoUrl());
        }


//        binding.etMobile.addTextChangedListener(new PhoneNumberFormattingTextWatcher());
//        binding.etEmail.addTextChangedListener(new PhoneNumberFormattingTextWatcher());


        binding.rtlImgParent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                onImageSelect(view);
            }
        });

//        binding.rgGender.setOnCheckedChangeListener(new RadioGroup.OnCheckedChangeListener() {
//            public void onCheckedChanged(RadioGroup group, int checkedId) {
//                switch (checkedId) {
//                    case R.id.radio_male:
//                        // do operations specific to this selection
//                        gender = Gender.MALE;
//                        break;
//                    case R.id.radio_female:
//                        // do operations specific to this selection
//                        gender = Gender.FEMALE;
//                        break;
//                }
//            }
//        });

//        if (!FmUtilize.isEmpty(_userModel.getMobile()))
//            binding.etMobile.setOnClickListener(new View.OnClickListener() {
//                @Override
//                public void onClick(View v) {
//                    showToast(getString(R.string.mobile_cant_edited));
//                }
//            });
//
//        if (!FmUtilize.isEmpty(_userModel.getEmail()))
//            binding.etEmail.setOnClickListener(new View.OnClickListener() {
//                @Override
//                public void onClick(View v) {
//                    showToast(getString(R.string.mobile_cant_edited));
//                }
//            });
//
//        binding.etPassword.setOnClickListener(new View.OnClickListener() {
//            @Override
//            public void onClick(View v) {
//                try {
//                    showToast(AESCrypt.decrypt(_userModel.getPassword()));
//                } catch (Exception e) {
//                    LogUtility.e(TAG, e.toString());
//                }
//            }
//        });


        //assign the image in code (or you can do this in your layout xml with the src attribute)
        binding.ibPass.setImageDrawable(ContextCompat.getDrawable(this, R.drawable.ic_visibility_off));

//set the click listener
        binding.ibPass.setOnClickListener(new View.OnClickListener() {

            public void onClick(View button) {
                try {
                    //Set the button's appearance
                    button.setSelected(!button.isSelected());

                    if (button.isSelected()) {
                        //Handle selected state change
                        binding.ibPass.setImageDrawable(ContextCompat.getDrawable(getBaseContext(), R.drawable.ic_visibility));
//                        binding.etPassword.setText(AESCrypt.decrypt(_userModel.getPassword()));
                        binding.etPassword.setTransformationMethod(null);
                    } else {
                        //Handle de-select state change
                        binding.ibPass.setImageDrawable(ContextCompat.getDrawable(getBaseContext(), R.drawable.ic_visibility_off));
//                        binding.etPassword.setText(AESCrypt.encrypt(_userModel.getPassword()));
                        binding.etPassword.setTransformationMethod(new PasswordTransformationMethod());
                    }
                } catch (Exception e) {
                    LogUtility.printStackTrace(e);
                }
            }
        });

        binding.btnSave.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                saveUserData();
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
                Tools.displayUserProfile(getBaseContext(), binding.imgProfile, String.valueOf(uriImg));
                // Todo upload image
                uploadUserProfile(uriImg);
            } else if (resultCode == UCrop.RESULT_ERROR) {
                Log.e(TAG, "Crop error:" + UCrop.getError(data).getMessage());
            }
        }
    }


    private void initToolbar() {
        setSupportActionBar(binding.toolbar);
        getSupportActionBar().setTitle(null);
        (binding.toolbar).setNavigationIcon(R.drawable.ic_arrow_back);
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        Tools.setSystemBarColor(this, R.color.colorAccent);
    }

    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_notif_setting, menu);
        Tools.changeMenuIconColor(menu, getResources().getColor(R.color.colorAccent));
        return true;
    }

    public boolean onOptionsItemSelected(MenuItem menuItem) {
        switch (menuItem.getItemId()) {
            case android.R.id.home:
                startMainActivity();
                break;
            case R.id.action_pick_image:
                onImageSelect(binding.imgProfile);
                break;
            case R.id.action_delete:
                ModelConfig config = new ModelConfig(R.drawable.ic_warning, getString(R.string.label_warning), getString(R.string.confirm_delete_my_account), new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        deleteMyAccount();
//                        showToast(getString(R.string.done_successfully));
                    }
                }));
                showWarningDialog(config);
                break;
            case R.id.action_logout:
                config = new ModelConfig(R.drawable.ic_warning, getString(R.string.label_warning), getString(R.string.confirm_logout_my_account), new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        userLogOut();
                        showToast(getString(R.string.user_loged_out));
                    }
                }));
                showWarningDialog(config);
//                Toast.makeText(getApplicationContext(), menuItem.getTitle(), Toast.LENGTH_LONG).show();
                break;
        }
        return super.onOptionsItemSelected(menuItem);
    }

    private void deleteMyAccount() {
        if (isAccountSignedIn())
            fmRepo.delete(prefMgr.getUserSession(), new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    deleteFirebaseUser();
                    showToast(getString(R.string.done_successfully));
                    userLogOut();
                }

                @Override
                public void onError(Object object) {
                    showToast(getString(R.string.unkon_error_please_try_again_later));
                }
            });
    }

    void deleteFirebaseUser() {
        try {
            FirebaseUser user = mAuth.getCurrentUser();
            if (user == null) {
                user.delete()
                        .addOnCompleteListener(new OnCompleteListener<Void>() {
                            @Override
                            public void onComplete(@NonNull Task<Void> task) {
                                if (task.isSuccessful()) {
                                    Log.d(TAG, "User account deleted.");
                                } else {
                                    Log.w(TAG, "Error deleting user", task.getException());
                                }
                            }
                        });
            }

        } catch (Exception e) {
            Log.d(TAG, "Error deleting user: " + e.getMessage());
        }
    }


    // [START on_start_check_user]
    @Override
    public void onStart() {
        super.onStart();
        // Check if user is signed in (non-null) and update UI accordingly.
        FirebaseUser currentUser = mAuth.getCurrentUser();
        if (currentUser == null) {
            startMainActivity();
        }
    }
    // [END on_start_check_user]


    private void saveUserData() {

        UserModel user = prefMgr.getUserSession();
        // set privilege
//        List<String> per = new ArrayList<>();
//        per.add("ALL");
//        for (RadioInfo obj : prefMgr.getRadioList()) {
//            per.add(obj.getName());
//        }
//        user.setAllowedPermissions(per);

        Gender gender = Gender.UNKNOWN;
        int checkedRadioButtonId = binding.rgGender.getCheckedRadioButtonId();
        if (binding.rgGender.getCheckedRadioButtonId() != -1) {
            // radio buttons  checked
            AppCompatRadioButton checkedRadioButton = (AppCompatRadioButton) findViewById(checkedRadioButtonId);
            switch (checkedRadioButton.getId()) {
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

//            }
//        });

        String name = binding.etFullName.getText().toString().trim();

        boolean isUserNameEdite = user.getName().equals(name);
        boolean isGenderEdited = user.getGender() == gender;
        if (isUserNameEdite && isGenderEdited) {
            startMainActivity();
        } else {
            user.setName(name);
            user.setGender(gender);
            user.setDeviceToken(FmUtilize.getIMEIDeviceId(this));
            user.setNotificationToken(FmUtilize.getFirebaseToken(this));
//            updateUser(user);
            fmRepo.create(user.getUserId(), user, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    prefMgr.setUserSession((UserModel) object);
                    showToast(getString(R.string.saved_successfully));
                    startMainActivity();
                }

                @Override
                public void onError(Object object) {
                    Log.d(TAG, "onError : " + object);
                    showToast(getString(R.string.unkon_error_please_try_again_later));
                }
            });
        }

    }

/*
    private void validateInput() {

        name = binding.etFullName.getText().toString().trim();
        email = binding.etEmail.getText().toString().trim();
        mobile = binding.etMobile.getText().toString().trim();
        password = "";//binding.etPassword.getText().toString().trim();

        if (TextUtils.isEmpty(name)) {
            showSnackBar(String.format(" %s", getResources().getString(R.string.field_is_required, binding.etFullName.getHint())));
            binding.etFullName.requestFocus();
            return;
        }

//        if (TextUtils.isEmpty(email)) {
//            showSnackBar(String.format(" %s", getResources().getString(R.string.field_is_required, binding.etMobile.getHint())));
//            binding.etMobile.requestFocus();
//            return;
//        }

        if (TextUtils.isEmpty(mobile)) {
            showSnackBar(String.format(" %s", getResources().getString(R.string.field_is_required, binding.etMobile.getHint())));
            binding.etMobile.requestFocus();
            return;
        }

//        if (TextUtils.isEmpty(password)) {
//            showSnackBar(String.format(" %s", getResources().getString(R.string.field_is_required, binding.etPassword.getHint())));
//            binding.etPassword.requestFocus();
//            return;
//        }

        if (binding.rgGender.getCheckedRadioButtonId() == -1) {
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
*/

    private void uploadUserProfile(Uri uriImage) {
//        if (imageUri != null) {
        showProgress(getString(R.string.please_wait_to_save_your_profile));
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
                Log.d(TAG, "Upload is " + progress + "% done");
                hud.setCancellable(false);
//                hud.setMessage(getString(R.string.please_wait) + " % " + (int) progress);
                hud.setProgress((int) progress);

            }
        }).addOnPausedListener(new OnPausedListener<UploadTask.TaskSnapshot>() {
            @Override
            public void onPaused(UploadTask.TaskSnapshot taskSnapshot) {
                Log.d(TAG, "Upload is paused");
            }
        }).addOnFailureListener(new OnFailureListener() {
            @Override
            public void onFailure(@NonNull Exception e) {
                LogUtility.e(TAG, e.toString());
                // Handle unsuccessful uploads
//                showToast("نعتذر لم يتم الحفظ !" + e);
                ModelConfig config = new ModelConfig(R.drawable.ic_cloud_off, getString(R.string.label_error_occurred), e.toString(), new ButtonConfig(getString(R.string.label_close)), null);
                showWarningDialog(config);
                hud.dismiss();
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
//                                prefMgr.write(FirebaseConstants.USER_IMAGE_Profile, downloadUri);
//                                ------------------------------------
                                UserModel user = prefMgr.getUserSession();
                                user.setPhotoUrl(downloadUri);
                                updateUser(user);
                            }
                        });
                    }
                }
                hud.dismiss();

            }
        });
    }


    void updateUser(UserModel model) {
        fmRepo.create(prefMgr.getUserSession().getUserId(), model, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                prefMgr.setUserSession( (UserModel) object);
                showToast(getString(R.string.done_successfully));
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
        startMainActivity();
    }


    private void userLogOut() {
        // Todo check login type
//        mAuth.signOut();
        prefMgr.remove(FirebaseConstants.USER_INFO);
        LoginManager.getInstance().logOut();
        Intent intent = IntentHelper.splashActivity(this, true);
        startActivity(intent);
    }
}
