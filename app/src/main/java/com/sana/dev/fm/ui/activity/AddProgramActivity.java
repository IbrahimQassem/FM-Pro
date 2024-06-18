package com.sana.dev.fm.ui.activity;

import static com.sana.dev.fm.utils.AppConstant.Firebase.RADIO_PROGRAM_TABLE;
import static com.sana.dev.fm.utils.FmUtilize.getWeekDayNames;
import static com.sana.dev.fm.utils.FmUtilize.translateWakeDaysAr;
import static com.sana.dev.fm.utils.FmUtilize.translateWakeDaysEn;

import android.app.Activity;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.util.TypedValue;
import android.view.View;
import android.widget.CompoundButton;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog.Builder;
import androidx.core.content.ContextCompat;

import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.android.material.chip.Chip;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.OnPausedListener;
import com.google.firebase.storage.OnProgressListener;
import com.google.firebase.storage.StorageMetadata;
import com.google.firebase.storage.StorageReference;
import com.google.firebase.storage.UploadTask;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityAddProgramBinding;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.model.WakeTranslate;
import com.sana.dev.fm.model.interfaces.OnCallbackDate;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.AppConstant.General;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.AppGeneralMessage;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.wdullaer.materialdatetimepicker.date.DatePickerDialog;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.List;


public class AddProgramActivity extends BaseActivity {
    private static final String TAG = AddProgramActivity.class.getSimpleName();

    private ActivityAddProgramBinding binding;

    Uri imageUri;
    PreferencesManager prefMgr;
    private String programId, radioId, prName, prDesc, prTag, prProfile, createBy, stopNote;
    private FirestoreDbUtility firestoreDbUtility;
    private RadioInfo radioInfo;
    private long dateStart, dateEnd;
    private List<String> prCategoryList;
    private List<String> displayDay;

    public void onCreate(Bundle bundle) {
        super.onCreate(bundle);

        binding = ActivityAddProgramBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);

        firestoreDbUtility = new FirestoreDbUtility();
        prefMgr = PreferencesManager.getInstance();

        Tools.setSystemBarColor(this, R.color.white);
        Tools.setSystemBarLight(this);

        initClickEvent();
        loadProfileDefault();

        // Clearing older images from cache directory
        // don't call this line if you want to choose multiple images in the same activity
        // call this once the bitmap(s) usage is over
        ImagePickerActivity.clearCache(this);

        setCategoryChips();
        setDisplayDayChips();

    }

    private void initClickEvent() {
        binding.btClose.setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                AddProgramActivity.this.finish();
            }
        });

        View.OnClickListener onClickListenerImg = new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                showImagePickerOptions();
            }
        };
        binding.imgLogo.setOnClickListener(onClickListenerImg);

        binding.tvAddLogo.setOnClickListener(onClickListenerImg);

        binding.ivClear.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                clearImg();
            }
        });


        binding.etStart.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dialogDatePickerLight((TextView) v, new OnCallbackDate() {
                    @Override
                    public void getSelected(long _time) {
                        dateStart = _time;
                        binding.etStart.setError(null);
                    }
                });
            }
        });

        binding.etEnd.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dialogDatePickerLight((TextView) v, new OnCallbackDate() {
                    @Override
                    public void getSelected(long _time) {
                        dateEnd = _time;
                        binding.etEnd.setError(null);
                    }
                });
            }
        });

        binding.etStation.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showStationDialog();
            }
        });
    }


    public void onChipCategoryClick(View view) {
        int chipsCount = binding.cgType.getChildCount();
        int i = 0;
        ArrayList<String> cgList = new ArrayList<>();
        while (i < chipsCount) {
            Chip chip = (Chip) binding.cgType.getChildAt(i);
            if (chip.isChecked()) {
//                prType += chip.getText().toString() + ",";
                cgList.add(chip.getText().toString());
            }
            i++;
            prCategoryList = cgList;
        }

//        prCategory = android.text.TextUtils.join(" , ", cgList);
        binding.tieCategory.setText(android.text.TextUtils.join(" , ", prCategoryList));
        binding.tieCategory.setError(null);

    }


    public void onChipDisplayDayClick(View view) {
        int chipsCount = binding.cgDisplayDay.getChildCount();
        int i = 0;
        ArrayList<String> mList = new ArrayList<>();
        while (i < chipsCount) {
            Chip chip = (Chip) binding.cgDisplayDay.getChildAt(i);
            if (chip.isChecked()) {
                mList.add(chip.getText().toString());
            }
            i++;
            displayDay = translateWakeDaysEn(mList);
        }

        binding.tieDisplayDay.setText(android.text.TextUtils.join(" , ", mList));
        binding.tieDisplayDay.setError(null);

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
            binding.cgDisplayDay.addView(mChip);
        }


        binding.ibSend.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                send();
            }
        });

    }

    public void send() {

//        Resources res = getResources();
//        String localized = res.getString(res.getIdentifier(Constant.SUCCESS, "string", getPackageName()));
//        showToast(Constant.SUCCESS);


        if (prefMgr.getUserSession() == null || prefMgr.getUserSession().getUserId() == null) {
            showToast(getString(R.string.most_login));
            return;
        } else if (binding.etStation.getText().toString().trim().isEmpty()) {
            showToast("يجب تحديد إسم القناة الإذاعية");
            return;
        } else if (binding.titPrName.getText().toString().trim().isEmpty()) {
            binding.titPrName.setError(getString(R.string.error_empty_field_not_allowed));
            binding.titPrName.requestFocus();
            return;
        } else if (binding.tieCategory.getText().toString().trim().isEmpty()) {
            binding.tieCategory.setError(getString(R.string.error_empty_field_not_allowed));
            binding.tieCategory.requestFocus();
            return;
        } else if (dateStart == 0L) {
            binding.etStart.setError(getString(R.string.error_empty_field_not_allowed));
            binding.etStart.requestFocus();
            return;
        } else if (dateEnd == 0L) {
            binding.etEnd.setError(getString(R.string.error_empty_field_not_allowed));
            binding.etEnd.requestFocus();
            return;
        } else if (binding.tieDisplayDay.getText().toString().trim().isEmpty()) {
            binding.tieDisplayDay.setError(getString(R.string.error_empty_field_not_allowed));
            binding.tieDisplayDay.requestFocus();
            return;
        }

        programId = radioInfo.getRadioId() + "ـــ" + FmUtilize.random();
        radioId = radioInfo.getRadioId();
        prName = binding.titPrName.getText().toString().trim();
        prDesc = binding.titPrDesc.getText().toString().trim();
        createBy = prefMgr.getUserSession().getUserId();

        showProgress("");

        if (imageUri != null) {
//            hud = KProgressHUD.create(this)
//                    .setStyle(KProgressHUD.Style.SPIN_INDETERMINATE)
//                    .setLabel("Please wait")
//                    .setDetailsLabel("Downloading data");


            // Create file metadata including the content type
            StorageMetadata metadata = new StorageMetadata.Builder()
                    .setContentType("image/jpg")
                    .build();
            StorageReference ref = FirebaseStorage.getInstance().getReference().child(General.FB_FM_FOLDER_PATH).child(radioId).child(programId + ".jpg");
            // Upload file and metadata to the path 'images/mountains.jpg'
            UploadTask uploadTask = ref.putFile(imageUri, metadata);

            // Listen for state changes, errors, and completion of the upload.
            uploadTask.addOnProgressListener(new OnProgressListener<UploadTask.TaskSnapshot>() {
                @Override
                public void onProgress(UploadTask.TaskSnapshot taskSnapshot) {
                    double progress = (100.0 * taskSnapshot.getBytesTransferred()) / taskSnapshot.getTotalByteCount();
                    Log.d(TAG, "Upload is " + progress + "% done");
//                    hud.setDetailsLabel(" جار الإرسال " + " % " + (int) progress);
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
                    LogUtility.e(LogUtility.tag(AddProgramActivity.class), e.toString());
                    // Handle unsuccessful uploads
//                    showSnackBar("لم يتم حفظ الصورة !" + e.toString());
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
                                    prProfile = uri.toString();
                                    hud.dismiss();
                                    RadioProgram radioProgram = new RadioProgram(programId, radioId, prName, prDesc, prCategoryList, prTag, prProfile, 1, 1, 1, String.valueOf(System.currentTimeMillis()), createBy, false, stopNote, new DateTimeModel(dateStart, dateEnd, displayDay));
                                    String pushKey = radioId + "__" + firestoreDbUtility.getKeyId(AppConstant.Firebase.EPISODE_TABLE).document().getId();
                                    radioProgram.setProgramId(pushKey);

                                    firestoreDbUtility.createOrMerge(AppConstant.Firebase.RADIO_PROGRAM_TABLE, radioProgram.getProgramId(), radioProgram, new CallBack() {
                                        @Override
                                        public void onSuccess(Object object) {
                                            showToast(getString(R.string.done_successfully));
                                            finish();
                                        }

                                        @Override
                                        public void onFailure(Object object) {
                                            showToast(AppGeneralMessage.ERROR);
                                        }
                                    });
                                }
                            });
                        }
                    }
                    hideProgress();

                }
            });

        } else {
            prProfile = radioInfo.getLogo();
            RadioProgram radioProgram = new RadioProgram(programId, radioId, prName, prDesc, prCategoryList, prTag, prProfile, 1, 1, 1, String.valueOf(System.currentTimeMillis()), createBy, false, stopNote, new DateTimeModel(dateStart, dateEnd, displayDay));
            String pushKey = radioId + "__" + firestoreDbUtility.getKeyId(AppConstant.Firebase.EPISODE_TABLE).document().getId();
            radioProgram.setProgramId(pushKey);
            firestoreDbUtility.createOrMerge(AppConstant.Firebase.RADIO_PROGRAM_TABLE, radioProgram.getProgramId(), radioProgram, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    hideProgress();
                    showToast(getString(R.string.done_successfully));
                    finish();
                }

                @Override
                public void onFailure(Object object) {
                    hideProgress();
                    showToast(AppGeneralMessage.ERROR);
                }
            });
        }

    }

    int stSelected = 0;

    // البرنامج العام
    public void showStationDialog() {
//        List<RadioInfo> items = ShardDate.getInstance().getAllowedRadioInfoList(prefMgr.getUserSession());
        List<RadioInfo> items = ShardDate.getInstance().getRadioInfoList();

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
                binding.etStation.setText(radioInfo.getName());
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
            binding.cgType.addView(mChip);
        }
    }


    private void loadProfile(Uri imageUri) {
        Log.d(TAG, "Image cache path: " + imageUri.toString());

        binding.tvAddLogo.setVisibility(View.GONE);
        binding.linFile.setVisibility(View.VISIBLE);
        String dd = FmUtilize.getFileName(imageUri, this);
        binding.tieFilename.setText(dd);


        Tools.displayImageOriginal(this, binding.imgLogo, imageUri.toString());
        binding.imgLogo.setColorFilter(ContextCompat.getColor(this, android.R.color.transparent));
    }

    private void loadProfileDefault() {
        Tools.displayImageOriginal(this, binding.imgLogo, R.drawable.ic_photo);
        binding.imgLogo.setColorFilter(ContextCompat.getColor(this, R.color.grey_10));
    }

    public void clearImg() {
        binding.tvAddLogo.setVisibility(View.VISIBLE);
        binding.linFile.setVisibility(View.GONE);
        binding.imgLogo.setImageBitmap(null);
        imageUri = null;
        binding.tieFilename.setText(null);
        loadProfileDefault();

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
        Intent intent = new Intent(AddProgramActivity.this, ImagePickerActivity.class);
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
        Intent intent = new Intent(AddProgramActivity.this, ImagePickerActivity.class);
        intent.putExtra(ImagePickerActivity.INTENT_IMAGE_PICKER_OPTION, ImagePickerActivity.REQUEST_GALLERY_IMAGE);

        // setting aspect ratio
        intent.putExtra(ImagePickerActivity.INTENT_LOCK_ASPECT_RATIO, true);
        intent.putExtra(ImagePickerActivity.INTENT_ASPECT_RATIO_X, 1); // 16x9, 1x1, 3:4, 3:2
        intent.putExtra(ImagePickerActivity.INTENT_ASPECT_RATIO_Y, 1);
        startActivityForResult(intent, ImagePickerActivity.REQUEST_IMAGE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == ImagePickerActivity.REQUEST_IMAGE) {
            if (resultCode == Activity.RESULT_OK) {
                imageUri = data.getParcelableExtra(ImagePickerActivity.INTENT_IMAGE_PATH);
                try {
                    // You can update this bitmap to your server
//                    Bitmap bitmap = MediaStore.Images.Media.getBitmap(this.getContentResolver(), imageUri);
                    // loading profile image from local cache
                    loadProfile(imageUri);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
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