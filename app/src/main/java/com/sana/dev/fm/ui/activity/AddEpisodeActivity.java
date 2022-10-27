package com.sana.dev.fm.ui.activity;


import static com.sana.dev.fm.ui.activity.ImagePickerActivity.REQUEST_IMAGE;
import static com.sana.dev.fm.utils.FmUtilize.isCollection;
import static com.sana.dev.fm.utils.FmUtilize.random;
import static com.sana.dev.fm.utils.FmUtilize.setTimeFormat;
import static com.sana.dev.fm.utils.FmUtilize.stringTimeToMillis;
import static com.sana.dev.fm.utils.FmUtilize.translateWakeDaysAr;
import static com.sana.dev.fm.utils.FmUtilize.translateWakeDaysEn;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.widget.ImageButton;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;

import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.OnPausedListener;
import com.google.firebase.storage.OnProgressListener;
import com.google.firebase.storage.StorageMetadata;
import com.google.firebase.storage.StorageReference;
import com.google.firebase.storage.UploadTask;
import com.google.gson.Gson;
import com.karumi.dexter.Dexter;
import com.karumi.dexter.MultiplePermissionsReport;
import com.karumi.dexter.PermissionToken;
import com.karumi.dexter.listener.multi.MultiplePermissionsListener;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityAddEpisodeBinding;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.model.WakeTranslate;
import com.sana.dev.fm.model.interfaces.OnCallbackDate;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.ViewAnimation;
import com.sana.dev.fm.utils.my_firebase.AppConstant;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;
import com.sana.dev.fm.utils.my_firebase.FmEpisodeCRUDImpl;
import com.sana.dev.fm.utils.my_firebase.FmProgramCRUDImpl;
import com.wdullaer.materialdatetimepicker.date.DatePickerDialog;
import com.wdullaer.materialdatetimepicker.time.TimePickerDialog;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import java.util.Stack;




public class AddEpisodeActivity extends BaseActivity {

    private final String TAG = AddEpisodeActivity.class.getSimpleName();
    private ActivityAddEpisodeBinding binding;
    

    int stSelected = 0;
    int prSelected = 0;
    PreferencesManager prefMgr;
    Stack<String> stackImg = new Stack<String>();
    private List<View> view_list = new ArrayList<>();
    private List<RelativeLayout> step_view_list = new ArrayList<>();
    private int success_step = 0;
    private int current_step = 0;
    private String radioId, epId, epName, epDesc, epAnnouncer, programId, epProfile, epStreamUrl, programName, timestamp, createBy, stopNote = null;
    private DateTimeModel dateTimeModel;
    private Uri imageUri = null;
    private RadioInfo radioInfo = new RadioInfo();
    private List<DateTimeModel> showTimeList = new ArrayList<>();

    private long timeStart, timeEnd;
    private FmEpisodeCRUDImpl ePoRepo;


    public static void startActivity(Context context, Episode episode) {
        Intent intent = new Intent(context, AddEpisodeActivity.class);
        String obj = (new Gson().toJson(episode));
        intent.putExtra("episode", obj);
        context.startActivity(intent);
    }

    public static void startActivity(Context context) {
        Intent intent = new Intent(context, AddEpisodeActivity.class);
        context.startActivity(intent);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        binding = ActivityAddEpisodeBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);
        

        ePoRepo = new FmEpisodeCRUDImpl(this, FirebaseConstants.EPISODE_TABLE);
        prefMgr = PreferencesManager.getInstance();

        initToolbar();
        initComponent();
        loadProfileDefault();

        initClickEvent();
        initEditView();
//        setDisplayDayChips();

      binding.buttonAdd.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                addView();
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

    private void initComponent() {
        // populate layout field
        view_list.add(findViewById(R.id.lyt_one));
        view_list.add(findViewById(R.id.lyt_tow));
        view_list.add(findViewById(R.id.lyt_three));
//        view_list.add(findViewById(R.id.lyt_four));
        view_list.add(findViewById(R.id.lyt_four));
        view_list.add(findViewById(R.id.lyt_confirmation));

        // populate view step (circle in left)
        step_view_list.add(((RelativeLayout) findViewById(R.id.step_one)));
        step_view_list.add(((RelativeLayout) findViewById(R.id.step_tow)));
        step_view_list.add(((RelativeLayout) findViewById(R.id.step_three)));
//        step_view_list.add(((RelativeLayout) findViewById(R.id.step_four)));
        step_view_list.add(((RelativeLayout) findViewById(R.id.step_four)));
        step_view_list.add(((RelativeLayout) findViewById(R.id.step_confirmation)));

        for (View v : view_list) {
            v.setVisibility(View.GONE);
        }

        view_list.get(0).setVisibility(View.VISIBLE);
        hideKeyboard();

    }

    private void initClickEvent() {


        binding.imgLogo.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                onProfileImageClick();
            }
        });

        binding.tvAddLogo.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                onProfileImageClick();
            }
        });

        binding.ivClear.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                clearImg();
            }
        });


        binding.etStation.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showStationDialog();
            }
        });


        binding.etProgram.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showProgramDialog();
            }
        });
    }


    private void initEditView() {
        String s = getIntent().getStringExtra("episode");
        if (s != null) {
            Episode _episode = new Gson().fromJson(s, Episode.class);
            showSnackBar(_episode.getEpName());

            binding.etStation.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    ModelConfig config = new ModelConfig(R.drawable.ic_cloud_off, getString(R.string.label_warning), "لا يمكنك تغيير القناة الإاعية في حالة تحديث بيانات البرنامج",  null, null);
                    showWarningDialog(config);
                }
            });

            binding.etProgram.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    ModelConfig config = new ModelConfig(R.drawable.ic_cloud_off, getString(R.string.label_warning), "لا يمكنك تغيير إسم البرنامج في حالة تحديث بيانات البرنامج",  null, null);
                    showWarningDialog(config);
                }
            });


            radioId = _episode.getRadioId();
            epId = _episode.getEpId();
            epName = _episode.getEpName();
            epDesc = _episode.getEpDesc();
            epAnnouncer = _episode.getEpAnnouncer();
            programId = _episode.getProgramId();
            epProfile = _episode.getEpProfile();
            stackImg.push(epProfile);
            epStreamUrl = _episode.getEpStreamUrl();
            programName = _episode.getProgramName();
            timestamp = _episode.getTimestamp();
            createBy = _episode.getCreateBy();
            stopNote = _episode.getStopNote();
            radioInfo = prefMgr.selectedRadio();
            radioId = radioInfo.getRadioId();
            dateTimeModel = _episode.getDateTimeModel();
            showTimeList = _episode.getShowTimeList() != null ? _episode.getShowTimeList() : new ArrayList<>();
//            program = program.findRadioProgram(programId, ShardDate.getInstance().getProgramList());
//            programId = program.getProgramId();


          binding.titEpName.setText(epName);
            binding.titEpAnnouncer.setText(epAnnouncer);
          binding.titEpDesc.setText(epDesc);
//           RadioInfo ri = radioInfo.findRadio(radioId,ShardDate.getInstance().getInfoList());
            binding.etStation.setText(radioInfo.getName());
            binding.etProgram.setText(programName);
            binding.titEpStreamUrl.setText(epStreamUrl);

            loadProfile(Uri.parse(epProfile));
        }
    }


    public void send() {

        if (prefMgr.getUserSession() == null || prefMgr.getUserSession().getUserId() == null) {
            showToast(getString(R.string.most_login));
            return;
        }

        radioId = radioInfo.getRadioId();
//        programId = program.getProgramId();
//        programName = program.getPrName();
        createBy = prefMgr.getUserSession().getUserId();

        epName = binding.titEpName.getText().toString().trim();
        epAnnouncer = binding.titEpAnnouncer.getText().toString().trim();
        epDesc = binding.titEpDesc.getText().toString().trim();
        epStreamUrl = binding.titEpStreamUrl.getText().toString().trim();

        showProgress(getString(R.string.label_saving_in_progress));

        if (imageUri != null) {


            // Create file metadata including the content type
            StorageMetadata metadata = new StorageMetadata.Builder()
                    .setContentType("image/jpg")
                    .build();
            StorageReference ref = FirebaseStorage.getInstance().getReference().child(FirebaseConstants.FB_FM_FOLDER_PATH).child(radioId).child(random() + ".jpg");
            // Upload file and metadata to the path 'images/mountains.jpg'
            UploadTask uploadTask = ref.putFile(imageUri, metadata);

            // Listen for state changes, errors, and completion of the upload.
            uploadTask.addOnProgressListener(new OnProgressListener<UploadTask.TaskSnapshot>() {
                @Override
                public void onProgress(UploadTask.TaskSnapshot taskSnapshot) {
                    double progress = (100.0 * taskSnapshot.getBytesTransferred()) / taskSnapshot.getTotalByteCount();
//                    Log.d(TAG, "Upload is " + progress + "% done");
                    hud.setCancellable(false);
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
                    LogUtility.e(LogUtility.tag(AddEpisodeActivity.class), e.toString());
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
                                    epProfile = uri.toString();

                                    Episode episode = new Episode(radioId, programId, programName, "", epName, epDesc, epAnnouncer, dateTimeModel, epProfile, epStreamUrl, 1, 1, String.valueOf(System.currentTimeMillis()), createBy, "", false, showTimeList);
                                    ePoRepo.create(radioId, episode, new CallBack() {
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
                    hideProgress();

                }
            });

        } else {
            Episode episode = new Episode(radioId, programId, programName, "", epName, epDesc, epAnnouncer, dateTimeModel, epProfile, epStreamUrl, 1, 1, String.valueOf(System.currentTimeMillis()), createBy, "", false, showTimeList);
            ePoRepo.create(radioId, episode, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    hideProgress();
                    showToast(object.toString());
                    finish();
                }

                @Override
                public void onError(Object object) {
                    hideProgress();
                    showToast(AppConstant.ERROR);
                }
            });

        }

    }


    public void clickAction(View view) {
        int id = view.getId();
        switch (id) {
            case R.id.bt_continue_one:
                // validate input user here

                if (binding.titEpName.getText().toString().trim().isEmpty()) {
                    binding.titEpName.setError(getString(R.string.error_empty_field_not_allowed));
                    binding.titEpName.requestFocus();
                    return;
                }

                collapseAndContinue(0);
                break;
            case R.id.bt_continue_tow:
                // validate input user here
                if (binding.etStation.getText().toString().trim().isEmpty()) {
                    binding.etStation.setError(getString(R.string.error_empty_field_not_allowed));
                    binding.etStation.requestFocus();
                    showSnackBar(getString(R.string.error_please_select_radio_station));
                    return;
                } else if (binding.etProgram.getText().toString().trim().isEmpty()) {
                    binding.etProgram.setError(getString(R.string.error_empty_field_not_allowed));
                    binding.etProgram.requestFocus();
                    showSnackBar("يجب تحديد برنامج");
                    return;
                }

                collapseAndContinue(1);
                break;
            case R.id.bt_continue_three:
                // validate input user here

                if (!checkIfValidAndRead()) {
//                    showSnackBar("يجب تحديد وقت بدء البرنامج");
                    return;
                }


                collapseAndContinue(2);
                break;

//            case R.id.bt_continue_four:
//                // validate input user here
//
//                if (et_ep_stream_date.getText().toString().trim().isEmpty()) {
//                    et_ep_stream_date.setError(getString(R.string.empty_not_allowd));
//                    et_ep_stream_date.requestFocus();
//                    showSnackBar("يجب تحديد تاريخ بث البرنامج");
//                    return;
//                }
//
//
//                collapseAndContinue(3);
//                break;

            case R.id.bt_continue_four:
                // validate input user here
//                boolean con1 = (swh_no_img.isChecked() && imageUri == null);
//                boolean con2 = (!swh_no_img.isChecked() && imageUri == null);
//
//                if (!con1 && con2) {
//                    Snackbar.make(parent_view, "يجب تحديد صورة البرنامج", Snackbar.LENGTH_SHORT).show();
//                    return;
//                }

                collapseAndContinue(3);
                break;

            case R.id.bt_add_event:
                // confirm and validate input user here
                send();
                //                finish();
                break;
        }
    }

    public void clickLabel(View view) {
        int id = view.getId();
        switch (id) {
            case R.id.tv_label_one:
                if (success_step >= 0 && current_step != 0) {
                    current_step = 0;
                    collapseAll();
                    ViewAnimation.expand(view_list.get(0));
                }
                break;
            case R.id.tv_label_tow:
                if (success_step >= 1 && current_step != 1) {
                    current_step = 1;
                    collapseAll();
                    ViewAnimation.expand(view_list.get(1));
                }
                break;
            case R.id.tv_label_three:
                if (success_step >= 2 && current_step != 2) {
                    current_step = 2;
                    collapseAll();
                    ViewAnimation.expand(view_list.get(2));
                }
                break;
//            case R.id.tv_label_four:
//                if (success_step >= 3 && current_step != 3) {
//                    current_step = 3;
//                    collapseAll();
//                    ViewAnimation.expand(view_list.get(3));
//                }
//                break;

            case R.id.tv_label_four:
                if (success_step >= 3 && current_step != 3) {
                    current_step = 3;
                    collapseAll();
                    ViewAnimation.expand(view_list.get(3));
                }
                break;
            case R.id.tv_label_confirmation:
                if (success_step >= 4 && current_step != 4) {
                    current_step = 4;
                    collapseAll();
                    ViewAnimation.expand(view_list.get(4));
                }
                break;
        }
    }

    private void collapseAndContinue(int index) {
        ViewAnimation.collapse(view_list.get(index));
        setCheckedStep(index);
        index++;
        current_step = index;
        success_step = index > success_step ? index : success_step;
        ViewAnimation.expand(view_list.get(index));
    }

    private void collapseAll() {
        for (View v : view_list) {
            ViewAnimation.collapse(v);
        }
    }


    private void setCheckedStep(int index) {
        RelativeLayout relative = step_view_list.get(index);
        relative.removeAllViews();
        ImageButton img = new ImageButton(this);
        img.setImageResource(R.drawable.ic_done);
        img.setBackgroundColor(Color.TRANSPARENT);
        img.setColorFilter(Color.WHITE, PorterDuff.Mode.SRC_IN);
        relative.addView(img);
    }

    private void dialogTimePickerLight(final TextView tv, OnCallbackDate clickListener) {
        Calendar cur_calender = Calendar.getInstance();
        TimePickerDialog datePicker = TimePickerDialog.newInstance(new TimePickerDialog.OnTimeSetListener() {
            @Override
            public void onTimeSet(TimePickerDialog view, int hourOfDay, int minute, int second) {
//              String  time = (hourOfDay > 9 ? hourOfDay + "" : ("0" + hourOfDay)) + ":" + minute;
//                Calendar calendar = Calendar.getInstance();
                final Calendar calendar = Calendar.getInstance();
                calendar.set(Calendar.HOUR_OF_DAY, hourOfDay);
                calendar.set(Calendar.MINUTE, minute);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                long millis = calendar.getTimeInMillis();
                clickListener.getSelected(millis);
                tv.setText(setTimeFormat(hourOfDay, minute, second));
//                tv.setText(showTime(hourOfDay, minute, second));
            }
        }, cur_calender.get(Calendar.HOUR_OF_DAY), cur_calender.get(Calendar.MINUTE), false);
        //set dark light
        datePicker.setThemeDark(false);
        datePicker.vibrate(true);
        datePicker.setLocale(Locale.ENGLISH);
        datePicker.setAccentColor(getResources().getColor(R.color.colorPrimary));
        datePicker.show(getSupportFragmentManager(), "تحديد الوقت");
    }

    private void dialogDatePickerLight(final TextView tv) {
        Calendar cur_calender = Calendar.getInstance();
        DatePickerDialog datePicker = DatePickerDialog.newInstance(
                new DatePickerDialog.OnDateSetListener() {
                    @Override
                    public void onDateSet(DatePickerDialog view, int year, int monthOfYear, int dayOfMonth) {
                        Calendar calendar = Calendar.getInstance();
                        calendar.set(Calendar.YEAR, year);
                        calendar.set(Calendar.MONTH, monthOfYear);
                        calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth);
                        long date_ship_millis = calendar.getTimeInMillis();
//                        _selectDate = new Date(date_ship_millis);
//                        epCastDateAt = stringToDate(); ;
//                        broadcastDateAt = Tools.getFormattedDateSimple(date_ship_millis);
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
        datePicker.setMinDate(cur_calender);
        datePicker.show(getSupportFragmentManager(), "تحديد التاريخ");
    }

    public void showStationDialog() {
        List<RadioInfo> items = ShardDate.getInstance().getInfoList();

        String[] charSequence = new String[items.size()];
        for (int i = 0; i < items.size(); i++) {
            charSequence[i] = String.valueOf(items.get(i).getName());
        }

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle((CharSequence) getString(R.string.add_station));
        builder.setSingleChoiceItems(charSequence, stSelected, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialogInterface, int i) {
                stSelected = i;
                radioInfo = items.get(i);
                binding.etStation.setText(radioInfo.getName());
                binding.etStation.setError(null);
                stackImg.push(radioInfo.getLogo());
                loadRadioProgram(radioInfo.getRadioId());
                dialogInterface.dismiss();
            }
        });
        builder.show();
    }

    public void showProgramDialog() {

        List<RadioProgram> items = ShardDate.getInstance().getProgramList();

        String[] charSequence = new String[items.size()];
        for (int i = 0; i < items.size(); i++) {
            charSequence[i] = String.valueOf(items.get(i).getPrName());
        }

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle((CharSequence) getString(R.string.add_program));
//        final int position = getArguments().getInt("position");
//        final AlertDialog dialog = (AlertDialog) getDialog();
        builder.setSingleChoiceItems(charSequence, prSelected, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialogInterface, int i) {
                programId = items.get(i).getProgramId();
                programName = items.get(i).getPrName();
                dateTimeModel = items.get(i).getDateTimeModel();
//                setDisplayDayChips();
                prSelected = i;
                binding.etProgram.setText(programName);
                binding.etProgram.setError(null);
                epProfile = items.get(i).getPrProfile();
                stackImg.push(epProfile);
                loadProfile(Uri.parse(epProfile));
                dialogInterface.dismiss();
            }
        });
        builder.show();
    }


    private void loadRadioProgram(String RadioId) {

        FmProgramCRUDImpl rpRepo = new FmProgramCRUDImpl(this, FirebaseConstants.RADIO_PROGRAM_TABLE);
        rpRepo.queryAllBy(RadioId,null, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                if (isCollection(object)) {
                    List<RadioProgram> programList = (List<RadioProgram>) object;
                    ShardDate.getInstance().setProgramList(programList);
                    binding.etProgram.setText(null);
                }
            }

            @Override
            public void onError(Object object) {
                LogUtility.d(TAG, "readAllProgramByRadioId: " + object);
            }
        });

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
        // Displaying the Stack after the Operation
        System.out.println("Final stackImg: " + stackImg);
    }

    public void clearImg() {
        binding.tvAddLogo.setVisibility(View.VISIBLE);
       binding.linFile.setVisibility(View.GONE);
       binding.imgLogo.setImageBitmap(null);
        imageUri = null;
        binding.tieFilename.setText(null);
        loadProfileDefault();
    }

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

    /**
     * Showing Alert Dialog with Settings option
     * Navigates user to app settings
     * NOTE: Keep proper title and message depending on your app
     */
    private void showSettingsDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(AddEpisodeActivity.this);
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

    private void launchCameraIntent() {
        Intent intent = new Intent(AddEpisodeActivity.this, ImagePickerActivity.class);
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
        Intent intent = new Intent(AddEpisodeActivity.this, ImagePickerActivity.class);
        intent.putExtra(ImagePickerActivity.INTENT_IMAGE_PICKER_OPTION, ImagePickerActivity.REQUEST_GALLERY_IMAGE);

        // setting aspect ratio
        intent.putExtra(ImagePickerActivity.INTENT_LOCK_ASPECT_RATIO, true);
        intent.putExtra(ImagePickerActivity.INTENT_ASPECT_RATIO_X, 1); // 16x9, 1x1, 3:4, 3:2
        intent.putExtra(ImagePickerActivity.INTENT_ASPECT_RATIO_Y, 1);
        startActivityForResult(intent, REQUEST_IMAGE);
    }


//    ------------------ Dynamic Show Time  -------------------------

    private boolean checkIfValidAndRead() {
        showTimeList.clear();
//        selectedDays.clear();
        boolean result = true;

        for (int i = 0; i < binding.layoutList.getChildCount(); i++) {
            View rowView = binding.layoutList.getChildAt(i);
            DateTimeModel dateTimeModel = new DateTimeModel();
            List<String> selectedDays = new ArrayList<>();

            TextView tvStartTime = (TextView) rowView.findViewById(R.id.tv_ep_start);
            String _etStartTime = tvStartTime.getText().toString();
            if (!_etStartTime.matches("")) {
                dateTimeModel.setTimeStart(stringTimeToMillis(_etStartTime));
            } else {
                result = false;
                break;
            }

            TextView tvEndTime = (TextView) rowView.findViewById(R.id.tv_ep_end);
            String _etEndTime = tvEndTime.getText().toString();

            if (!_etEndTime.matches("")) {
                dateTimeModel.setTimeEnd(stringTimeToMillis(_etEndTime));
            } else {
                result = false;
                break;
            }

            TextView tv_day = (TextView) rowView.findViewById(R.id.tv_day);
            String _tv_day = tv_day.getText().toString();
            if (!_tv_day.matches("")) {
                selectedDays.add(_tv_day);
                dateTimeModel.setDisplayDays(translateWakeDaysEn(selectedDays));
            } else {
                result = false;
                break;
            }

//            RadioButton rbMainTime = (RadioButton) rowView.findViewById(R.id.radio_main);
            // get selected radio button from radioGroup
            RadioGroup rgMainTime = (RadioGroup) rowView.findViewById(R.id.rg_type);
            int selectedId = rgMainTime.getCheckedRadioButtonId();

            // find the radiobutton by returned id
            RadioButton radioButton = (RadioButton) findViewById(selectedId);
            dateTimeModel.setItMainTime(radioButton.isChecked());

//            Toast.makeText(EpisodeAddStepperVertical.this,
//                    radioButton.getText(), Toast.LENGTH_SHORT).show();

            showTimeList.add(dateTimeModel);
        }

        if (showTimeList.size() == 0) {
            result = false;
            Toast.makeText(this, "  تأكد من إضافة جميع البيانات بشكل صحيح ! " + getEmojiByUnicode(unicode), Toast.LENGTH_SHORT).show();
        } else if (!result) {
            Toast.makeText(this, "تأكد من إدخال البيانات بشكل صحيح !", Toast.LENGTH_SHORT).show();
        }

//        dateTimeModel.setDisplayDays(translateWakeDaysEn(selectedDays));
        return result;
    }

    int unicode = 0x1F92C;
//    int unicode = 0x1F60A;

    public String getEmojiByUnicode(int unicode) {
        return new String(Character.toChars(unicode));
    }

//    private RadioButton mSelectedRB;
//    private int mSelectedPosition = -1;

    private void showWeekDialog(final View view) {
        final ArrayList<WakeTranslate> displayDayList = translateWakeDaysAr(Arrays.asList(FmUtilize.getWeekDayNames()));
        ArrayList<String> arList = new ArrayList<>();
        for (WakeTranslate o : displayDayList) {
            arList.add(o.getDayName());
        }
        CharSequence[] charSequenceArr = arList.toArray(new CharSequence[arList.size()]);
//        final CharSequence[] charSequenceArr = new String[]{"Arizona", "California", "Florida", "Massachusetts", "New York", "Washington"};
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle((CharSequence) "أيام الأسبوع");
        builder.setSingleChoiceItems(charSequenceArr, -1, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialogInterface, int i) {
                ((TextView) view).setText(charSequenceArr[i]);
                dialogInterface.dismiss();
            }
        });
        builder.show();
    }

    private void addView() {

        final View rowView = getLayoutInflater().inflate(R.layout.row_add_time, null, false);

        TextView tvStartTime = (TextView) rowView.findViewById(R.id.tv_ep_start);
        TextView tvEndTime = (TextView) rowView.findViewById(R.id.tv_ep_end);
        TextView tv_day = (TextView) rowView.findViewById(R.id.tv_day);
        RadioGroup rgMainTime = (RadioGroup) rowView.findViewById(R.id.rg_type);
        FloatingActionButton fab_remove = (FloatingActionButton) rowView.findViewById(R.id.fab_remove);


        tvStartTime.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dialogTimePickerLight((TextView) v, new OnCallbackDate() {
                    @Override
                    public void getSelected(long _time) {
                        timeStart = _time;
                        tvStartTime.setError(null);
//                        LogUtility.e(TAG, String.valueOf(timeStart));
                    }
                });
            }
        });


        tvEndTime.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dialogTimePickerLight((TextView) v, new OnCallbackDate() {
                    @Override
                    public void getSelected(long _time) {
                        timeEnd = _time;
                        tvEndTime.setError(null);
//                        LogUtility.e(TAG, String.valueOf(timeEnd));
                    }
                });
            }
        });


        tv_day.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showWeekDialog(v);
            }
        });


//        rbMainTime.setOnClickListener(new View.OnClickListener() {
//            @Override
//            public void onClick(View v) {
////                if (etStartTime.getText().toString().matches("") || etEndTime.getText().toString().matches("")){
////                    Toast.makeText(EpisodeAddStepperVertical.this, "يجب تحديد الوقت !", Toast.LENGTH_SHORT).show();
////                }else {
//                if (mSelectedRB != null) {
//                    mSelectedRB.setChecked(false);
//                }
//                mSelectedRB = (RadioButton) v;
////                }
//            }
//        });


        fab_remove.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                removeView(rowView);
            }
        });

        binding.layoutList.addView(rowView);
    }

    private void removeView(View view) {
        binding.layoutList.removeView(view);
    }
}
