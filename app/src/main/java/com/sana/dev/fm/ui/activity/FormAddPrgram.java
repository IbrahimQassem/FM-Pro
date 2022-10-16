package com.sana.dev.fm.ui.activity;


import static com.sana.dev.fm.model.AppConfig.RADIO_TAG;
import static com.sana.dev.fm.ui.activity.ImagePickerActivity.REQUEST_IMAGE;
import static com.sana.dev.fm.utils.FmUtilize.getWeekDayNames;
import static com.sana.dev.fm.utils.FmUtilize.translateWakeDaysAr;
import static com.sana.dev.fm.utils.FmUtilize.translateWakeDaysEn;
import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.FB_FM_FOLDER_PATH;
import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.RADIO_PROGRAM_TABLE;

import android.Manifest;
import android.app.Activity;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Log;
import android.util.TypedValue;
import android.view.View;
import android.widget.CompoundButton;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog.Builder;
import androidx.core.content.ContextCompat;

import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.google.android.material.textfield.TextInputEditText;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.OnPausedListener;
import com.google.firebase.storage.OnProgressListener;
import com.google.firebase.storage.StorageMetadata;
import com.google.firebase.storage.StorageReference;
import com.google.firebase.storage.UploadTask;
import com.karumi.dexter.Dexter;
import com.karumi.dexter.MultiplePermissionsReport;
import com.karumi.dexter.PermissionToken;
import com.karumi.dexter.listener.multi.MultiplePermissionsListener;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.model.WakeTranslate;
import com.sana.dev.fm.model.interfaces.OnCallbackDate;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.ProgressHUD;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.AppConstant;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.FmRepositoryImpl;
import com.wdullaer.materialdatetimepicker.date.DatePickerDialog;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.List;

import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnClick;


public class FormAddPrgram extends BaseActivity {
    private static final String TAG = FormAddPrgram.class.getSimpleName();
    @BindView(R.id.img_logo)
    ImageView img_logo;

    @BindView(R.id.cg_type)
    ChipGroup cg_type;

    @BindView(R.id.cg_display_day)
    ChipGroup cg_display_day;

    @BindView(R.id.tie_category)
    TextInputEditText tie_category;

    @BindView(R.id.tie_display_day)
    TextInputEditText tie_display_day;


    @BindView(R.id.tie_filename)
    TextInputEditText tie_filename;

    @BindView(R.id.tit_pr_name)
    TextInputEditText tit_pr_name;
    @BindView(R.id.tit_pr_desc)
    TextInputEditText tit_pr_desc;

    @BindView(R.id.tv_add_logo)
    TextView tv_add_logo;

    @BindView(R.id.lin_file)
    LinearLayout lin_file;

    @BindView(R.id.et_station)
    EditText et_program;

    @BindView(R.id.et_start)
    EditText et_start;

    @BindView(R.id.et_end)
    EditText et_end;

    Uri imageUri;
    PreferencesManager prefMgr;
    private String programId, radioId, prName, prDesc, prTag, prProfile, createBy, stopNote;
    private FmRepositoryImpl fmRepo;
    private RadioInfo radioInfo;
    private long dateStart, dateEnd;
    private List<String> prCategoryList;
    private List<String> displayDay;

    /* Access modifiers changed, original: protected */
    public void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        setContentView((int) R.layout.activity_form_add_program);
        ButterKnife.bind(this);
        fmRepo = new FmRepositoryImpl(this, RADIO_PROGRAM_TABLE);
        prefMgr = new PreferencesManager(this);

        Tools.setSystemBarColor(this, R.color.white);
        Tools.setSystemBarLight(this);
        findViewById(R.id.bt_close).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                FormAddPrgram.this.finish();
            }
        });


        loadProfileDefault();

        // Clearing older images from cache directory
        // don't call this line if you want to choose multiple images in the same activity
        // call this once the bitmap(s) usage is over
        ImagePickerActivity.clearCache(this);


        setCategoryChips();
        setDisplayDayChips();

        et_start.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dialogDatePickerLight((TextView) v, new OnCallbackDate() {
                    @Override
                    public void getSelected(long _time) {
                        dateStart = _time;
                        et_start.setError(null);
                    }
                });
            }
        });

        et_end.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dialogDatePickerLight((TextView) v, new OnCallbackDate() {
                    @Override
                    public void getSelected(long _time) {
                        dateEnd = _time;
                        et_end.setError(null);
                    }
                });
            }
        });
    }


    public void onChipCategoryClick(View view) {
        int chipsCount = cg_type.getChildCount();
        int i = 0;
        ArrayList<String> cgList = new ArrayList<>();
        while (i < chipsCount) {
            Chip chip = (Chip) cg_type.getChildAt(i);
            if (chip.isChecked()) {
//                prType += chip.getText().toString() + ",";
                cgList.add(chip.getText().toString());
            }
            i++;
            prCategoryList = cgList;
        }

//        prCategory = android.text.TextUtils.join(" , ", cgList);
        tie_category.setText(android.text.TextUtils.join(" , ", prCategoryList));
        tie_category.setError(null);

    }


    public void onChipDisplayDayClick(View view) {
        int chipsCount = cg_display_day.getChildCount();
        int i = 0;
        ArrayList<String> mList = new ArrayList<>();
        while (i < chipsCount) {
            Chip chip = (Chip) cg_display_day.getChildAt(i);
            if (chip.isChecked()) {
                mList.add(chip.getText().toString());
            }
            i++;
            displayDay = translateWakeDaysEn(mList);
        }

        tie_display_day.setText(android.text.TextUtils.join(" , ", mList));
        tie_display_day.setError(null);

    }


    public void setDisplayDayChips() {
//        String[] displayDayList = DateFormatSymbols.getInstance(Locale.ENGLISH).getShortWeekdays();
//        String[] displayDayList = getWeekDayNames();
        ArrayList<WakeTranslate> displayDayList = translateWakeDaysAr(Arrays.asList(getWeekDayNames()));

        for (WakeTranslate category : displayDayList) {
            Chip mChip = (Chip) this.getLayoutInflater().inflate(R.layout.item_chip_display_days, null, false);
            mChip.setText(category.getDayName());
            int paddingDp = (int) TypedValue.applyDimension(
                    TypedValue.COMPLEX_UNIT_DIP, 10,
                    getResources().getDisplayMetrics()
            );
            mChip.setPadding(paddingDp, 0, paddingDp, 0);
            mChip.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
                @Override
                public void onCheckedChanged(CompoundButton compoundButton, boolean b) {

                }
            });
            cg_display_day.addView(mChip);
        }


    }

    @OnClick({R.id.ib_send})
    public void send() {

//        Resources res = getResources();
//        String localized = res.getString(res.getIdentifier(Constant.SUCCESS, "string", getPackageName()));
//        showToast(Constant.SUCCESS);

        if (prefMgr.getUsers() == null || prefMgr.getUsers().getUserId() == null) {
            showToast(getString(R.string.most_login));
            return;
        } else if (et_program.getText().toString().trim().isEmpty()) {
            showToast("يجب تحديد إسم القناة الإذاعية");
            return;
        } else if (tit_pr_name.getText().toString().trim().isEmpty()) {
            tit_pr_name.setError(getString(R.string.error_empty_field_not_allowed));
            tit_pr_name.requestFocus();
            return;
        } else if (tie_category.getText().toString().trim().isEmpty()) {
            tie_category.setError(getString(R.string.error_empty_field_not_allowed));
            tie_category.requestFocus();
            return;
        } else if (dateStart == 0L) {
            et_start.setError(getString(R.string.error_empty_field_not_allowed));
            et_start.requestFocus();
            return;
        } else if (dateEnd == 0L) {
            et_end.setError(getString(R.string.error_empty_field_not_allowed));
            et_end.requestFocus();
            return;
        } else if (tie_display_day.getText().toString().trim().isEmpty()) {
            tie_display_day.setError(getString(R.string.error_empty_field_not_allowed));
            tie_display_day.requestFocus();
            return;
        }

        programId = radioInfo.getRadioId() + "ـــ" + FmUtilize.random();
        radioId = radioInfo.getRadioId();
        prName = tit_pr_name.getText().toString().trim();
        prDesc = tit_pr_desc.getText().toString().trim();
        createBy = prefMgr.getUsers().getUserId();


        if (imageUri != null) {
            ProgressHUD mProgressHUD = ProgressHUD.showDialog( "تحميل الصورة", true, false, null);
            mProgressHUD.setMessage("جاري الحفظ ...");
            mProgressHUD.show();

            // Create file metadata including the content type
            StorageMetadata metadata = new StorageMetadata.Builder()
                    .setContentType("image/jpg")
                    .build();
            StorageReference ref = FirebaseStorage.getInstance().getReference().child(FB_FM_FOLDER_PATH).child(radioId).child(programId + ".jpg");
            // Upload file and metadata to the path 'images/mountains.jpg'
            UploadTask uploadTask = ref.putFile(imageUri, metadata);

            // Listen for state changes, errors, and completion of the upload.
            uploadTask.addOnProgressListener(new OnProgressListener<UploadTask.TaskSnapshot>() {
                @Override
                public void onProgress(UploadTask.TaskSnapshot taskSnapshot) {
                    double progress = (100.0 * taskSnapshot.getBytesTransferred()) / taskSnapshot.getTotalByteCount();
//                    Log.d(TAG, "Upload is " + progress + "% done");
                    mProgressHUD.setCanceledOnTouchOutside(false);
                    mProgressHUD.setMessage(" جار الإرسال " + " % " + (int) progress);

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
                    showSnackBar("لم يتم حفظ الصورة !" + exception.toString());
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
                                    prProfile = uri.toString();
                                    mProgressHUD.dismiss();
                                    RadioProgram radioProgram = new RadioProgram(programId, radioId, prName, prDesc, prCategoryList, RADIO_TAG, prProfile, 1, 1, 1, String.valueOf(System.currentTimeMillis()), createBy, false, stopNote, new DateTimeModel(dateStart, dateEnd, displayDay));
                                    fmRepo.createPG(radioId, radioProgram, new CallBack() {
                                        @Override
                                        public void onSuccess(Object object) {
                                            showToast(object.toString());
                                            finish();
                                        }

                                        @Override
                                        public void onError(Object object) {
                                            showToast(AppConstant.ERROR);
                                        }
                                    });
                                }
                            });
                        }
                    }
                    mProgressHUD.dismiss();

                }
            });

        } else {
            prProfile = radioInfo.getLogo();
            RadioProgram radioProgram = new RadioProgram(programId, radioId, prName, prDesc, prCategoryList, RADIO_TAG, prProfile, 1, 1, 1, String.valueOf(System.currentTimeMillis()), createBy, false, stopNote, new DateTimeModel(dateStart, dateEnd, displayDay));
            fmRepo.createPG(radioId, radioProgram, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    showToast(object.toString());
                    finish();
                }

                @Override
                public void onError(Object object) {
                    showToast(AppConstant.ERROR);
                }
            });
        }

    }

    int stSelected = 0;

    @OnClick({R.id.et_station})
    public void showStationDialog() {
        List<RadioInfo> items = ShardDate.getInstance().getInfoList();

        String[] charSequence = new String[items.size()];
        for (int i = 0; i < items.size(); i++) {
            charSequence[i] = String.valueOf(items.get(i).getName());
        }

        Builder builder = new Builder(this);
        builder.setTitle((CharSequence) getString(R.string.add_station));
        builder.setSingleChoiceItems(charSequence, stSelected, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialogInterface, int i) {
                stSelected = i;
                radioInfo = items.get(i);
                ((EditText) et_program).setText(radioInfo.getName());
                loadProfile(Uri.parse(radioInfo.getLogo()));
                dialogInterface.dismiss();
            }
        });
        builder.show();
    }


    public void setCategoryChips() {
        String[] categories = getResources().getStringArray(R.array.program_category);

        for (String category : categories) {
            Chip mChip = (Chip) this.getLayoutInflater().inflate(R.layout.item_chip_category, null, false);
            mChip.setText(category);
            int paddingDp = (int) TypedValue.applyDimension(
                    TypedValue.COMPLEX_UNIT_DIP, 10,
                    getResources().getDisplayMetrics()
            );
            mChip.setPadding(paddingDp, 0, paddingDp, 0);
            mChip.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
                @Override
                public void onCheckedChanged(CompoundButton compoundButton, boolean b) {

                }
            });
            cg_type.addView(mChip);
        }
    }


    private void loadProfile(Uri imageUri) {
        Log.d(TAG, "Image cache path: " + imageUri.toString());

        tv_add_logo.setVisibility(View.GONE);
        lin_file.setVisibility(View.VISIBLE);
        String dd = FmUtilize.getFileName(imageUri, this);
        tie_filename.setText(dd);

//        GlideApp.with(this).load(imageUri.toString())
//                .into(img_logo);
        Tools.displayImageOriginal(this,img_logo,imageUri.toString());

        img_logo.setColorFilter(ContextCompat.getColor(this, android.R.color.transparent));
    }

    private void loadProfileDefault() {
//        GlideApp.with(this).load(R.drawable.ic_photo)
//                .into(img_logo);
        Tools.displayImageOriginal(this,img_logo,R.drawable.ic_photo);
        img_logo.setColorFilter(ContextCompat.getColor(this, R.color.grey_10));
    }

    @OnClick({R.id.iv_clear})
    public void clearImg() {
        tv_add_logo.setVisibility(View.VISIBLE);
        lin_file.setVisibility(View.GONE);
        img_logo.setImageBitmap(null);
        imageUri = null;
        tie_filename.setText(null);
        loadProfileDefault();

    }

    @OnClick({R.id.img_logo, R.id.tv_add_logo})
    void onProfileImageClick() {
        Dexter.withContext(this)
                .withPermissions(Manifest.permission.CAMERA, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                .withListener(new MultiplePermissionsListener() {
                    @Override
                    public void onPermissionsChecked(MultiplePermissionsReport report) {
                        if (report.areAllPermissionsGranted()) {
                            showImagePickerOptions();
                        }

                        if (report.isAnyPermissionPermanentlyDenied()) {
                            showSettingsDialog();
                        }
                    }

                    @Override
                    public void onPermissionRationaleShouldBeShown(List<com.karumi.dexter.listener.PermissionRequest> list, PermissionToken permissionToken) {
                        permissionToken.continuePermissionRequest();
                    }
                }).check();
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
        Intent intent = new Intent(FormAddPrgram.this, ImagePickerActivity.class);
        intent.putExtra(ImagePickerActivity.INTENT_IMAGE_PICKER_OPTION, ImagePickerActivity.REQUEST_IMAGE_CAPTURE);

        // setting aspect ratio
        intent.putExtra(ImagePickerActivity.INTENT_LOCK_ASPECT_RATIO, true);
        intent.putExtra(ImagePickerActivity.INTENT_ASPECT_RATIO_X, 1); // 16x9, 1x1, 3:4, 3:2
        intent.putExtra(ImagePickerActivity.INTENT_ASPECT_RATIO_Y, 1);

        // setting maximum bitmap width and height
        intent.putExtra(ImagePickerActivity.INTENT_SET_BITMAP_MAX_WIDTH_HEIGHT, true);
        intent.putExtra(ImagePickerActivity.INTENT_BITMAP_MAX_WIDTH, 1000);
        intent.putExtra(ImagePickerActivity.INTENT_BITMAP_MAX_HEIGHT, 1000);

        startActivityForResult(intent, REQUEST_IMAGE);
    }

    private void launchGalleryIntent() {
        Intent intent = new Intent(FormAddPrgram.this, ImagePickerActivity.class);
        intent.putExtra(ImagePickerActivity.INTENT_IMAGE_PICKER_OPTION, ImagePickerActivity.REQUEST_GALLERY_IMAGE);

        // setting aspect ratio
        intent.putExtra(ImagePickerActivity.INTENT_LOCK_ASPECT_RATIO, true);
        intent.putExtra(ImagePickerActivity.INTENT_ASPECT_RATIO_X, 1); // 16x9, 1x1, 3:4, 3:2
        intent.putExtra(ImagePickerActivity.INTENT_ASPECT_RATIO_Y, 1);
        startActivityForResult(intent, REQUEST_IMAGE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_IMAGE) {
            if (resultCode == Activity.RESULT_OK) {
                imageUri = data.getParcelableExtra("path");
                try {
                    // You can update this bitmap to your server
                    Bitmap bitmap = MediaStore.Images.Media.getBitmap(this.getContentResolver(), imageUri);

                    // loading profile image from local cache
                    loadProfile(imageUri);
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }

    /**
     * Showing Alert Dialog with Settings option
     * Navigates user to app settings
     * NOTE: Keep proper title and message depending on your app
     */
    private void showSettingsDialog() {
        Builder builder = new Builder(FormAddPrgram.this);
        builder.setTitle(getString(R.string.dialog_permission_title));
        builder.setMessage(getString(R.string.dialog_permission_message));
        builder.setPositiveButton(getString(R.string.go_to_settings), (dialog, which) -> {
            dialog.cancel();
            openSettings();
        });
        builder.setNegativeButton(getString(android.R.string.cancel), (dialog, which) -> dialog.cancel());
        builder.show();

    }


    // navigating user to app settings
    private void openSettings() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        Uri uri = Uri.fromParts("package", getPackageName(), null);
        intent.setData(uri);
        startActivityForResult(intent, 101);
    }


    private void dialogDatePickerLight(final TextView tv, OnCallbackDate clickListener) {
        Calendar cur_calender = Calendar.getInstance();
        long now = System.currentTimeMillis() - 1000;
        cur_calender.setTimeInMillis(now);
        DatePickerDialog datePicker = DatePickerDialog.newInstance(
                new DatePickerDialog.OnDateSetListener() {
                    @Override
                    public void onDateSet(DatePickerDialog view, int year, int monthOfYear, int dayOfMonth) {
                        Calendar calendar = Calendar.getInstance();
                        calendar.set(Calendar.YEAR, year);
                        calendar.set(Calendar.MONTH, monthOfYear);
                        calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth);
                        long date_ship_millis = calendar.getTimeInMillis();
                        clickListener.getSelected(date_ship_millis);
                        tv.setText(Tools.getFormattedDateSimple(date_ship_millis));
                        tv.setError(null);
                    }
                },
                cur_calender.get(Calendar.YEAR),
                cur_calender.get(Calendar.MONTH),
                cur_calender.get(Calendar.DAY_OF_MONTH)
        );
        //set dark light
        datePicker.setThemeDark(false);
        datePicker.setAccentColor(getResources().getColor(R.color.colorPrimary));
//        datePicker.setMinDate(cur_calender);
//        datePicker.setMaxDate(cur_calender);
        datePicker.show(getSupportFragmentManager(), "تحديد التاريخ");
    }


    private void putImageInStorage(StorageReference storageReference, Uri uri, final String key) {
        // First upload the image to Cloud Storage
        storageReference.putFile(uri)
                .addOnSuccessListener(this, new OnSuccessListener<UploadTask.TaskSnapshot>() {
                    @Override
                    public void onSuccess(UploadTask.TaskSnapshot taskSnapshot) {
                        // After the image loads, get a public downloadUrl for the image
                        // and add it to the message.
                        taskSnapshot.getMetadata().getReference().getDownloadUrl()
                                .addOnSuccessListener(new OnSuccessListener<Uri>() {
                                    @Override
                                    public void onSuccess(Uri uri) {
//                                        FriendlyMessage friendlyMessage = new FriendlyMessage(
//                                                null, getUserName(), getUserPhotoUrl(), uri.toString());
//                                        mDatabase.getReference()
//                                                .child(MESSAGES_CHILD)
//                                                .child(key)
//                                                .setValue(friendlyMessage);
                                    }
                                });
                    }
                })
                .addOnFailureListener(this, new OnFailureListener() {
                    @Override
                    public void onFailure(@NonNull Exception e) {
                        Log.w(TAG, "Image upload task was not successful.", e);
                    }
                });
    }


}