package com.sana.dev.fm.ui.activity.appuser;


import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.ContactsContract;
import android.text.method.PasswordTransformationMethod;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.webkit.URLUtil;
import android.widget.EditText;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.widget.AppCompatRadioButton;
import androidx.core.content.ContextCompat;

import com.facebook.login.LoginManager;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.OnPausedListener;
import com.google.firebase.storage.OnProgressListener;
import com.google.firebase.storage.StorageMetadata;
import com.google.firebase.storage.StorageReference;
import com.google.firebase.storage.UploadTask;
import com.google.gson.Gson;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityUserProfileBinding;
import com.sana.dev.fm.model.AuthMethod;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.Gender;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.ui.activity.ImagePickerActivity;
import com.sana.dev.fm.utils.AESCrypt;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;


public class UserProfileActivity extends BaseActivity {
    public static final int PICK_IMAGE = 100;
    private final String TAG = UserProfileActivity.class.getSimpleName();
    ActivityUserProfileBinding binding;
    private FirebaseAuth mAuth;
//    private String userId, name, email, mobile, password, photoUrl, token, nickNme, bio, tag, deviceId, stopNote, country, city;

//    private Gender gender = Gender.UNKNOWN;

    //    private Uri imageUri = null;
//    private UserModel _userModel;
    private FirestoreDbUtility firestoreDbUtility;

//    private ProfileImageHelper profileImageHelper;

    private Uri imageUri = null;

    /* Access modifiers changed, original: protected */
    public void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        binding = ActivityUserProfileBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);

        hideKeyboard();

        firestoreDbUtility = new FirestoreDbUtility();
        mAuth = FirebaseAuth.getInstance();
        mAuth.setLanguageCode(PreferencesManager.getInstance().getPrefLange());
        // [END initialize_auth]
        prefMgr = PreferencesManager.getInstance();
//        profileImageHelper = new ProfileImageHelper(this);


        initToolbar();
        init();

    }

/*    private void initEvent() {

        binding.includeToolbar.imbClose.setOnClickListener(v -> finishThisActivity());

        binding.etData.setOnClickListener(view -> {
            PermissionListener permissionlistener = new PermissionListener() {
                @Override
                public void onPermissionGranted() {
                    Intent intent = new Intent(Intent.ACTION_PICK);
                    intent.setType(ContactsContract.CommonDataKinds.Phone.CONTENT_TYPE);
                    selectContactActivityResult.launch(intent);
                }

                @Override
                public void onPermissionDenied(List<String> deniedPermissions) {

                }
            };

            TedPermission.create()
                    .setPermissionListener(permissionlistener)
                    .setDeniedMessage(getString(R.string.message_required_contacts_permission))
                    .setPermissions(Manifest.permission.READ_CONTACTS)
                    .setGotoSettingButtonText(getString(R.string.label_settings))
                    .setDeniedCloseButtonText(getString(R.string.close))
                    .check();
        });


    }*/

    ActivityResultLauncher<Intent> selectContactActivityResult = registerForActivityResult(new ActivityResultContracts.StartActivityForResult(),
            result -> {
                Log.d("contact_test", "result code: " + result.getResultCode());

                if (result.getResultCode() == Activity.RESULT_OK) {
                    try {
                        Uri contactData = result.getData().getData();
                        Cursor c = getContentResolver().query(contactData, null, null, null, null);
                        if (c.moveToFirst()) {
                            String number = c.getString(c.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.NUMBER));
//                            binding.etData.setText(Utils.cleanMobileNumber(number));
                        }
                    } catch (Exception ex) {
                    }

                }
            });


    private void init() {
        // Todo fix
        if (prefMgr.getUserSession() != null) {

            binding.lytParentPass.setVisibility(View.GONE);
            binding.lytParentCity.setVisibility(View.GONE);

            UserModel _userModel = prefMgr.getUserSession();
            Log.d(TAG, " UserSession : " + new Gson().toJson(_userModel));
            binding.tvLabelUserName.setText(_userModel.getName());
            binding.tvLabelUserEmail.setText(_userModel.getEmail());
            binding.tvLabelUserMobile.setText(FmUtilize.trimMobileCode(_userModel.getMobile()));

            binding.etFullName.setText(_userModel.getName());
            binding.etEmail.setText(_userModel.getEmail());
            binding.etMobile.setText(FmUtilize.trimMobileCode(_userModel.getMobile()));

            try {
                binding.etPassword.setText(AESCrypt.decrypt(_userModel.getPassword()));
            } catch (Exception e) {
                Log.e(TAG, e.toString());
            }

            Gender gender = _userModel.getGender() != null ? _userModel.getGender() : Gender.UNKNOWN;
            if (Gender.FEMALE == gender) {
                binding.radioFemale.setChecked(true);
            } else if (Gender.MALE == gender) {
                binding.radioMale.setChecked(true);
            }

//            Tools.setTextOrHideIfEmpty(binding.etMobile, null);
//            Tools.setTextOrHideIfEmpty(binding.etEmail, null);

            if (_userModel.getAuthMethod() != null && _userModel.getAuthMethod().equals(AuthMethod.SMS)) {
                disableEditText(binding.etMobile);
            } else if (_userModel.getAuthMethod() != null && _userModel.getAuthMethod().equals(AuthMethod.EMAIL)) {
                disableEditText(binding.etEmail);
            }

            if (URLUtil.isValidUrl(_userModel.getPhotoUrl()))
                Tools.displayUserProfile(this, binding.imgProfile, _userModel.getPhotoUrl());
        }


//        binding.etMobile.addTextChangedListener(new PhoneNumberFormattingTextWatcher());
//        binding.etEmail.addTextChangedListener(new PhoneNumberFormattingTextWatcher());


        binding.rtlImgParent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
//                profileImageHelper.onImageSelect();
                showImagePickerOptions();
            }
        });


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
                        binding.etPassword.setTransformationMethod(null);
                    } else {
                        //Handle de-select state change
                        binding.ibPass.setImageDrawable(ContextCompat.getDrawable(getBaseContext(), R.drawable.ic_visibility_off));
                        binding.etPassword.setTransformationMethod(new PasswordTransformationMethod());
                    }
                } catch (Exception e) {
                    e.printStackTrace();
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

    private void initToolbar() {
        setSupportActionBar(binding.toolbar);
        getSupportActionBar().setTitle(null);
        (binding.toolbar).setNavigationIcon(R.drawable.ic_arrow_back);
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
                startMainActivity();
                break;
            case R.id.action_pick_image:
                showImagePickerOptions();
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
        if (isAccountSignedIn()) {
            CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.USERS_TABLE, AppConstant.Firebase.USERS_TABLE);
            firestoreDbUtility.deleteDocument(collectionReference, prefMgr.getUserSession().userId, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    deleteFirebaseUser();
                    showToast(getString(R.string.done_successfully));
                    userLogOut();
                }

                @Override
                public void onFailure(Object object) {
                    showToast(getString(R.string.unkon_error_please_try_again_later));
                }
            });
        }
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

        try {
        UserModel user = prefMgr.getUserSession();
        if (user == null) return;
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

            String name = Tools.isEmpty(binding.etFullName) ? "" : binding.etFullName.getText().toString().trim();
            String mobile = Tools.isEmpty(binding.etMobile) ? "" : binding.etMobile.getText().toString().trim();
            String email = Tools.isEmpty(binding.etEmail) ? "" : binding.etEmail.getText().toString().trim();
            String pass = Tools.isEmpty(binding.etPassword) ? "" : AESCrypt.encrypt(Tools.toString(binding.etPassword));

            boolean isUserNameEdite = Tools.isEmpty(user.getName()) && name.equalsIgnoreCase(user.getName());
            boolean isGenderEdited = user.getGender() == gender;
            if (isUserNameEdite && isGenderEdited) {
                startMainActivity();
            } else {
                user.setName(name);
                user.setMobile(mobile);
                user.setEmail(email);
                user.setPassword(pass);

                user.setGender(gender);
                user.setDeviceToken(FmUtilize.getIMEIDeviceId(this));
                user.setNotificationToken(FmUtilize.getFirebaseToken(this));
//            updateUser(user);
                Log.d(TAG, "before submit : " + user.toString());
                updateUser(user);
            }
        } catch (Exception e) {
            e.printStackTrace();
            Log.d(TAG, "Error saveUserData : " + e.getMessage());
            showToast(getString(R.string.label_error_occurred_with_val, e.getLocalizedMessage()));
        }
    }

    private void uploadUserProfile(Uri uriImage) {
//        if (imageUri != null) {
        showProgress(getString(R.string.please_wait_to_save_your_profile));
        // Create file metadata including the content type
        StorageMetadata metadata = new StorageMetadata.Builder()
                .setContentType("image/jpg")
                .build();
        final StorageReference ref = FirebaseStorage.getInstance().getReference().child(AppConstant.General.FB_FM_FOLDER_PATH).child(AppConstant.Firebase.USERS_TABLE).child(mAuth.getUid() + ".jpg");

        // Upload file and metadata to the path 'images/mountains.jpg'
        UploadTask uploadTask = ref.putFile(uriImage, metadata);

        // Listen for state changes, errors, and completion of the upload.
        uploadTask.addOnProgressListener(new OnProgressListener<UploadTask.TaskSnapshot>() {
            @Override
            public void onProgress(UploadTask.TaskSnapshot taskSnapshot) {
                double progress = (100.0 * taskSnapshot.getBytesTransferred()) / taskSnapshot.getTotalByteCount();
                Log.d(TAG, "Upload is " + progress + "% done");
                showProgress(String.valueOf((int) progress));
                if (hud != null) {
//                hud.setMessage(getString(R.string.please_wait) + " % " + (int) progress);
//                hud.setProgress((int) progress);
                    hud.setCancellable(false);

                }

            }
        }).addOnPausedListener(new OnPausedListener<UploadTask.TaskSnapshot>() {
            @Override
            public void onPaused(UploadTask.TaskSnapshot taskSnapshot) {
                Log.d(TAG, "Upload is paused");
            }
        }).addOnFailureListener(new OnFailureListener() {
            @Override
            public void onFailure(@NonNull Exception e) {
                Log.e(TAG, e.toString());
                // Handle unsuccessful uploads
//                showToast("نعتذر لم يتم الحفظ !" + e);
                ModelConfig config = new ModelConfig(R.drawable.ic_cloud_off, getString(R.string.label_error_occurred), e.toString(), new ButtonConfig(getString(R.string.label_close)), null);
                showWarningDialog(config);
                hideProgress();
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
                hideProgress();

            }
        });
    }


    void updateUser(UserModel model) {
        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.USERS_TABLE, AppConstant.Firebase.USERS_TABLE);
        firestoreDbUtility.createOrMerge(collectionReference, model.userId, model, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                prefMgr.setUserSession(model);
                showToast(getString(R.string.login_successfully));
                startMainActivity();
            }

            @Override
            public void onFailure(Object object) {
                LogUtility.e(LogUtility.TAG, "onError : " + object);
//                    showToast(getString(R.string.label_error_occurred_with_val, object.toString()));
                showToast(getString(R.string.unkon_error_please_try_again_later));
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
        prefMgr.remove(AppConstant.General.USER_INFO);
        LoginManager.getInstance().logOut();
        Intent intent = IntentHelper.splashActivity(this, true);
        startActivity(intent);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
//        Log.e(TAG, "onActivityResult requestCode:"+requestCode+" resultCode:"+resultCode);
        if (requestCode == ImagePickerActivity.REQUEST_IMAGE) {
            if (resultCode == Activity.RESULT_OK) {
                imageUri = data.getParcelableExtra(ImagePickerActivity.INTENT_IMAGE_PATH);
                try {
                    // You can update this bitmap to your server
//                    Bitmap bitmap = MediaStore.Images.Media.getBitmap(this.getContentResolver(), imageUri);
                    // loading profile image from local cache
                    loadProfile(imageUri);
                    uploadUserProfile(imageUri);
                } catch (Exception e) {
                    e.printStackTrace();
                    showToast(getString(R.string.label_error_occurred_with_val, e.getLocalizedMessage()));
                }
            }
        }
    }

    private void loadProfile(Uri imageUri) {
        Log.d(TAG, "Image cache path: " + imageUri.toString());
//        binding.tvAddLogo.setVisibility(View.GONE);
//        binding.linFile.setVisibility(View.VISIBLE);
//        String dd = FmUtilize.getFileName(imageUri, this);
//        binding.tieFilename.setText(dd);

        Tools.displayUserProfile(this, binding.imgProfile, imageUri.toString());
        binding.imgProfile.setColorFilter(ContextCompat.getColor(this, android.R.color.transparent));
    }

    private void showImagePickerOptions() {
        ImagePickerActivity.showImagePickerOptions(this, new ImagePickerActivity.PickerOptionListener() {
            @Override
            public void onTakeCameraSelected() {
                launchCameraIntent();
            }

            @Override
            public void onChooseGallerySelected() {
                launchGalleryIntent();
            }
        });
    }

    private void launchCameraIntent() {
        Intent intent = new Intent(UserProfileActivity.this, ImagePickerActivity.class);
        intent.putExtra(ImagePickerActivity.INTENT_IMAGE_PICKER_OPTION, ImagePickerActivity.REQUEST_IMAGE_CAPTURE);

        // setting aspect ratio
        intent.putExtra(ImagePickerActivity.INTENT_LOCK_ASPECT_RATIO, true);
        intent.putExtra(ImagePickerActivity.INTENT_ASPECT_RATIO_X, 1); // 16x9, 1x1, 3:4, 3:2
        intent.putExtra(ImagePickerActivity.INTENT_ASPECT_RATIO_Y, 1);

        // setting maximum bitmap width and height
        intent.putExtra(ImagePickerActivity.INTENT_SET_BITMAP_MAX_WIDTH_HEIGHT, true);
        intent.putExtra(ImagePickerActivity.INTENT_BITMAP_MAX_WIDTH, 1000);
        intent.putExtra(ImagePickerActivity.INTENT_BITMAP_MAX_HEIGHT, 1000);

        startActivityForResult(intent, ImagePickerActivity.REQUEST_IMAGE);
    }

    private void launchGalleryIntent() {
        Intent intent = new Intent(UserProfileActivity.this, ImagePickerActivity.class);
        intent.putExtra(ImagePickerActivity.INTENT_IMAGE_PICKER_OPTION, ImagePickerActivity.REQUEST_GALLERY_IMAGE);

        // setting aspect ratio
        intent.putExtra(ImagePickerActivity.INTENT_LOCK_ASPECT_RATIO, true);
        intent.putExtra(ImagePickerActivity.INTENT_ASPECT_RATIO_X, 1); // 16x9, 1x1, 3:4, 3:2
        intent.putExtra(ImagePickerActivity.INTENT_ASPECT_RATIO_Y, 1);
        startActivityForResult(intent, ImagePickerActivity.REQUEST_IMAGE);
    }

}
