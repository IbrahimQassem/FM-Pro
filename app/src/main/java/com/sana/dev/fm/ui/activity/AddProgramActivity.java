package com.sana.dev.fm.ui.activity;

import static com.sana.dev.fm.utils.AppConstant.Firebase.RADIO_PROGRAM_TABLE;
import static com.sana.dev.fm.utils.Tools.getFormattedDateOnly;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.util.TypedValue;
import android.view.View;
import android.widget.CompoundButton;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog.Builder;
import androidx.core.content.ContextCompat;

import com.google.android.material.chip.Chip;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.storage.FirebaseStorage;
import com.google.gson.Gson;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityAddProgramBinding;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.model.enums.Weekday;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.DateTimePickerHelper;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.KProgressHUDHelper;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.WeekdayUtils;
import com.sana.dev.fm.utils.my_firebase.AppGeneralMessage;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.my_firebase.task.StorageHelper;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;


public class AddProgramActivity extends BaseActivity {
    private static final String TAG = AddProgramActivity.class.getSimpleName();

    private ActivityAddProgramBinding binding;

    Uri imageUri;
    PreferencesManager prefMgr;
    private String programId, prName, prDesc, prTag, prProfile, createBy, stopNote, timestamp;
    private DateTimeModel programScheduleTime;
    private FirestoreDbUtility firestoreDbUtility;
    private RadioInfo radioInfo;
    private long dateStart, dateEnd;
    private List<String> prCategoryList;
    private List<Weekday> displayDay;
    // Get the KProgressHUDHelper instance
    private KProgressHUDHelper kProgressHUDHelper;

    public static void startActivity(Context context, RadioProgram item) {
        Intent intent = new Intent(context, AddProgramActivity.class);
        String obj = (new Gson().toJson(item));
        intent.putExtra("radioProgram", obj);
        context.startActivity(intent);
    }

    public void onCreate(Bundle bundle) {
        super.onCreate(bundle);

        binding = ActivityAddProgramBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);

        firestoreDbUtility = new FirestoreDbUtility();
        prefMgr = PreferencesManager.getInstance();
        kProgressHUDHelper = new KProgressHUDHelper(this);
        Tools.setSystemBarColor(this, R.color.colorPrimary);
        Tools.setSystemBarLight(this);

        initClickEvent();
        loadProfileDefault();

        // Clearing older images from cache directory
        // don't call this line if you want to choose multiple images in the same activity
        // call this once the bitmap(s) usage is over
        ImagePickerActivity.clearCache(this);

        setCategoryChips();
        setDisplayDayChips();
        initEditView();
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

        DateTimePickerHelper dateTimePickerHelper = new DateTimePickerHelper(AddProgramActivity.this);

        binding.etStart.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dateTimePickerHelper.showDatePicker(new DateTimePickerHelper.OnDateSelectedListener() {
                    @Override
                    public void onDateSelected(Calendar selectedDate) {
                        dateStart = selectedDate.getTimeInMillis();
                        binding.etStart.setText(Tools.getFormattedDateSimple(dateStart));
                        binding.etStart.setError(null);
                    }
                });
////                dialogDatePickerLight((TextView) v, new OnCallbackDate() {
////                    @Override
////                    public void getSelected(long _time) {
////                        dateStart = _time;
////                        binding.etStart.setError(null);
////                    }
////                });
//
//                DialogTimePickerHelper helper = new DialogTimePickerHelper(AddProgramActivity.this,Calendar.getInstance(), new DialogTimePickerHelper.OnDateTimeSelectedListener() {
//                    @Override
//                    public void onDateTimeSelected(Calendar selectedDateTime) {
//                        // Handle the selected date and time
//                        binding.etStart.setText(Tools.getFormattedDateSimple(selectedDateTime.getTimeInMillis()));
//                        binding.etStart.setError(null);
//                    }
//                });
//
////                Calendar initialDateTime = Calendar.getInstance();
//                helper.showDatePickerDialog(new DialogTimePickerHelper.OnDateSelectedListener() {
//                    @Override
//                    public void onDateSelected(Calendar selectedDate) {
//                        binding.etStart.setText(Tools.getFormattedDateSimple(selectedDate.getTimeInMillis()));
//                        binding.etStart.setError(null);
//                    }
//                });
////                helper.displayCurrentTime(new DialogTimePickerHelper.OnTimeSelectedListener() {
////                    @Override
////                    public void onTimeSelected(int hour, int minute) {
////
////                    }
////                });

            }
        });

        binding.etEnd.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dateTimePickerHelper.showDatePicker(new DateTimePickerHelper.OnDateSelectedListener() {
                    @Override
                    public void onDateSelected(Calendar selectedDate) {
                        dateEnd = selectedDate.getTimeInMillis();
                        binding.etEnd.setText(Tools.getFormattedDateSimple(dateEnd));
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
        List<String> mList = new ArrayList<>();
        while (i < chipsCount) {
            Chip chip = (Chip) binding.cgDisplayDay.getChildAt(i);
            if (chip.isChecked()) {
                String selectedDay = (String) chip.getText();
                mList.add(selectedDay);
            }
            i++;

            String joinedString = TextUtils.join(",", mList);
            displayDay = WeekdayUtils.convertSeparatedWeekdays(joinedString, ",");
        }

//        List<Weekday> convertSeparatedWeekdays = WeekdayUtils.convertSeparatedWeekdays(TextUtils.join(",", mList), ",");

        binding.tieDisplayDay.setText(android.text.TextUtils.join(" , ", mList));
        binding.tieDisplayDay.setError(null);

    }


    public void setDisplayDayChips() {
        Weekday[] weekdays = Weekday.values();
        for (Weekday category : weekdays) {
            Chip mChip = (Chip) this.getLayoutInflater().inflate(R.layout.item_chip_display_days, null, false);
            String dayName = WeekdayUtils.getLocalizedDayName(category, "en");
            mChip.setText(dayName);
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

    private void initEditView() {
        String s = getIntent().getStringExtra("radioProgram");
        if (s != null) {
            binding.tvTitle.setText(getString(R.string.label_edit));

            try {
                RadioProgram _episode = new Gson().fromJson(s, RadioProgram.class);
                showSnackBar(_episode.getPrName());

                prName = _episode.getPrName();
                prDesc = _episode.getPrDesc();
//            epAnnouncer = _episode.getEpAnnouncer();
                programId = _episode.getProgramId();
                prProfile = _episode.getPrProfile();
//            stackImg.push(epProfile);
                timestamp = _episode.getTimestamp();
                createBy = _episode.getCreateBy();
                stopNote = _episode.getStopNote();
                radioInfo = prefMgr.selectedRadio();
                programScheduleTime = _episode.getProgramScheduleTime() != null ? _episode.getProgramScheduleTime() : new DateTimeModel();
                displayDay = programScheduleTime.getWeekdays() != null ? programScheduleTime.getWeekdays() : new ArrayList<>();
//            program = program.findRadioProgram(programId, ShardDate.getInstance().getProgramList());
//            programId = program.getProgramId();


                binding.titPrName.setText(prName);
                binding.titPrDesc.setText(prDesc);
                binding.etStation.setText(radioInfo.getName());
                binding.tieDisplayDay.setText(android.text.TextUtils.join(" , ", displayDay));

                if (programScheduleTime != null) {
                    String dtS = getFormattedDateOnly(FmUtilize._dateFormat, programScheduleTime.getDateStart(), FmUtilize.englishFormat);
                    String dtE = getFormattedDateOnly(FmUtilize._dateFormat, programScheduleTime.getDateEnd(), FmUtilize.englishFormat);
                    binding.etStart.setText(dtS);
                    binding.etEnd.setText(dtE);
                } else {
//            binding.tvState.setVisibility(View.GONE);
                }


            } catch (Exception e) {
                e.printStackTrace();
                Log.d(TAG, "Error saveUserData : " + e.getMessage());
                showToast(getString(R.string.label_error_occurred_with_val, e.getLocalizedMessage()));
            }


            loadProfile(Uri.parse(prProfile));

            binding.etStation.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    ModelConfig config = new ModelConfig(R.drawable.ic_cloud_off, getString(R.string.label_warning), getString(R.string.msg_you_cannot_change_the_radio_channel_if_the_program_data_is_updated), new ButtonConfig(getString(R.string.label_cancel)), null);
                    showWarningDialog(config);
                }
            });

//            binding.etProgram.setOnClickListener(new View.OnClickListener() {
//                @Override
//                public void onClick(View v) {
//                    ModelConfig config = new ModelConfig(R.drawable.ic_cloud_off, getString(R.string.label_warning), getString(R.string.msg_you_cannot_change_the_program_name_if_you_update_the_program_data), new ButtonConfig(getString(R.string.label_cancel)), null);
//                    showWarningDialog(config);
//                }
//            });
        }

    }


    public void send() {

//        Resources res = getResources();
//        String localized = res.getString(res.getIdentifier(Constant.SUCCESS, "string", getPackageName()));
//        showToast(Constant.SUCCESS);


        if (prefMgr.getUserSession() == null || prefMgr.getUserSession().getUserId() == null) {
            showToast(getString(R.string.most_login));
            return;
        } else if (binding.etStation.getText().toString().trim().isEmpty()) {
            showSnackBar(getString(R.string.error_please_select_radio_station));
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

//        if (programId == null){
//            programId = radioInfo.getRadioId() + "_" + FmUtilize.random();
//        }

        prName = binding.titPrName.getText().toString().trim();
        prDesc = binding.titPrDesc.getText().toString().trim();
        createBy = prefMgr.getUserSession().getUserId();

        // Show loading dialog
        kProgressHUDHelper.showLoading(getString(R.string.please_wait), false);

        if (imageUri != null) {

            //-------------------------   submit image task    ---------------------------
            StorageHelper storageHelper = new StorageHelper(FirebaseStorage.getInstance());

            storageHelper.submitUserInfo(AddProgramActivity.this, radioInfo.getRadioId(), imageUri, new StorageHelper.UserSubmittedCallback() {
                @Override
                public void onSuccess(String imageName, String profileImageUrl) {
                    prProfile = profileImageUrl;
                    RadioProgram radioProgram = new RadioProgram(programId, radioInfo.getRadioId(), prName, prDesc, prCategoryList, prTag, prProfile, 1, 1, 1, String.valueOf(System.currentTimeMillis()), createBy, false, stopNote, new DateTimeModel(dateStart, dateEnd, displayDay));
                    String pushKey = radioInfo.getRadioId() + "_" + firestoreDbUtility.getKeyId(RADIO_PROGRAM_TABLE).document().getId();

                    if (programId == null) {
                        radioProgram.setProgramId(pushKey);
                    } else {
                        radioProgram.setProgramId(programId);
                    }

                    CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.RADIO_PROGRAM_TABLE, radioInfo.getRadioId()).document(AppConstant.Firebase.RADIO_PROGRAM_TABLE).collection(AppConstant.Firebase.RADIO_PROGRAM_TABLE);

                    firestoreDbUtility.createOrMerge(collectionReference, radioProgram.getProgramId(), radioProgram, new CallBack() {
                        @Override
                        public void onSuccess(Object object) {
                            // After data is loaded
                            kProgressHUDHelper.dismiss();
//                            kProgressHUDHelper.showSuccess(getString(R.string.done_successfully));
                            showToast(getString(R.string.done_successfully));
                            finish();
                        }

                        @Override
                        public void onFailure(Object object) {
                            kProgressHUDHelper.dismiss();
                            showToast(AppGeneralMessage.ERROR);
                        }
                    });
                }

                @Override
                public void onFailure(Exception e) {
                    kProgressHUDHelper.dismiss();
                    showToast(AppGeneralMessage.ERROR);
                }
            });

            //-------------------------   submit image task    ---------------------------

/*            // Create file metadata including the content type
            StorageMetadata metadata = new StorageMetadata.Builder()
                    .setContentType("image/jpg")
                    .build();
            StorageReference ref = FirebaseStorage.getInstance().getReference().child(General.FB_FM_FOLDER_PATH).child(radioInfo.getRadioId()).child(programId + ".jpg");
            // Upload file and metadata to the path 'images/mountains.jpg'
            UploadTask uploadTask = ref.putFile(imageUri, metadata);

            // Listen for state changes, errors, and completion of the upload.
            uploadTask.addOnProgressListener(new OnProgressListener<UploadTask.TaskSnapshot>() {
                @Override
                public void onProgress(UploadTask.TaskSnapshot taskSnapshot) {
                    double progress = (100.0 * taskSnapshot.getBytesTransferred()) / taskSnapshot.getTotalByteCount();
                    Log.d(TAG, "Upload is " + progress + "% done");
//                    hud.setDetailsLabel(" جار الإرسال " + " % " + (int) progress);
                    kProgressHUDHelper.setProgress((int) progress);
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
                    // After data is loaded
                    kProgressHUDHelper.dismiss();
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
                                    // After data is loaded
                                    kProgressHUDHelper.dismiss();
                                    RadioProgram radioProgram = new RadioProgram(programId, radioInfo.getRadioId(), prName, prDesc, prCategoryList, prTag, prProfile, 1, 1, 1, String.valueOf(System.currentTimeMillis()), createBy, false, stopNote, new DateTimeModel(dateStart, dateEnd, displayDay));
                                    String pushKey = radioInfo.getRadioId() + "_" + firestoreDbUtility.getKeyId(RADIO_PROGRAM_TABLE).document().getId();

                                    if (programId == null) {
                                        radioProgram.setProgramId(pushKey);
                                    } else {
                                        radioProgram.setProgramId(programId);
                                    }

                                    CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.RADIO_PROGRAM_TABLE, radioInfo.getRadioId()).document(AppConstant.Firebase.RADIO_PROGRAM_TABLE).collection(AppConstant.Firebase.RADIO_PROGRAM_TABLE);

                                    firestoreDbUtility.createOrMerge(collectionReference, radioProgram.getProgramId(), radioProgram, new CallBack() {
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
                    // After data is loaded
                    kProgressHUDHelper.dismiss();

                }
            });*/

        } else {
            prProfile = radioInfo.getLogo();
            RadioProgram radioProgram = new RadioProgram(programId, radioInfo.getRadioId(), prName, prDesc, prCategoryList, prTag, prProfile, 1, 1, 1, String.valueOf(System.currentTimeMillis()), createBy, false, stopNote, new DateTimeModel(dateStart, dateEnd, displayDay));
            String pushKey = radioInfo.getRadioId() + "_" + firestoreDbUtility.getKeyId(AppConstant.Firebase.RADIO_PROGRAM_TABLE).document().getId();

            if (programId == null) {
                radioProgram.setProgramId(pushKey);
            } else {
                radioProgram.setProgramId(programId);
            }
            CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.RADIO_PROGRAM_TABLE, radioInfo.getRadioId()).document(AppConstant.Firebase.RADIO_PROGRAM_TABLE).collection(AppConstant.Firebase.RADIO_PROGRAM_TABLE);

            firestoreDbUtility.createOrMerge(collectionReference, radioProgram.getProgramId(), radioProgram, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    // After data is loaded
                    kProgressHUDHelper.dismiss();
                    showToast(getString(R.string.done_successfully));
                    finish();
                }

                @Override
                public void onFailure(Object object) {
                    // After data is loaded
                    kProgressHUDHelper.dismiss();
                    showToast(AppGeneralMessage.ERROR);
                }
            });
        }

    }

    int stSelected = 0;

    // البرنامج العام
    public void showStationDialog() {
        List<RadioInfo> items = ShardDate.getInstance().getRadioInfoList();

//        List<RadioInfo> items = ShardDate.getInstance().getAllowedRadioInfoList(prefMgr.getUserSession());

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


/*
// Create the adapter
        AdapterRadioDialog adapter = new AdapterRadioDialog(this, items);

// Build the AlertDialog
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(getString(R.string.add_station));
        builder.setSingleChoiceItems(adapter, stSelected, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                stSelected = which;
                // Handle item selection (e.g., display a toast with the selected item name)
                String selectedItemName = items.get(which).getName();
                radioInfo = items.get(which);
                binding.etStation.setText(radioInfo.getName());
                loadProfile(Uri.parse(radioInfo.getLogo()));
                dialog.dismiss();
            }
        });
        builder.create().show();*/

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

}