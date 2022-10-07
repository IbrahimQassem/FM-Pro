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
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.widget.Toolbar;
import androidx.core.content.ContextCompat;

import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.android.material.textfield.TextInputEditText;
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
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.model.WakeTranslate;
import com.sana.dev.fm.model.interfaces.OnCallbackDate;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.ProgressHUD;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.ViewAnimation;
import com.sana.dev.fm.utils.my_firebase.AppConstant;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.EpisodeRepositoryImpl;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;
import com.sana.dev.fm.utils.my_firebase.FmRepositoryImpl;
import com.wdullaer.materialdatetimepicker.date.DatePickerDialog;
import com.wdullaer.materialdatetimepicker.time.TimePickerDialog;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import java.util.Stack;

import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnClick;


public class EpisodeAddStepperVertical extends BaseActivity {

    private final String TAG = EpisodeAddStepperVertical.class.getSimpleName();
    @BindView(R.id.tit_ep_name)
    TextInputEditText tit_ep_name;
    @BindView(R.id.tit_ep_announcer)
    TextInputEditText tit_ep_announcer;
    @BindView(R.id.tit_ep_desc)
    TextInputEditText tit_ep_desc;
    @BindView(R.id.et_station)
    EditText et_station;
    @BindView(R.id.et_program)
    EditText et_program;
    //    @BindView(R.id.et_ep_start)
//    EditText et_ep_start;
//    @BindView(R.id.et_ep_end)
//    EditText et_ep_end;
//    @BindView(R.id.et_ep_stream_date)
//    EditText et_ep_stream_date;
    @BindView(R.id.img_logo)
    ImageView img_logo;
    @BindView(R.id.tv_add_logo)
    TextView tv_add_logo;
    @BindView(R.id.lin_file)
    LinearLayout lin_file;
    @BindView(R.id.tie_filename)
    TextInputEditText tie_filename;

    @BindView(R.id.layout_list)
    LinearLayout layout_list;

//    @BindView(R.id.cg_display_day)
//    ChipGroup cg_display_day;


//    @BindView(R.id.tie_display_day)
//    TextInputEditText tie_display_day;

    @BindView(R.id.button_add)
    Button button_add;


    int stSelected = 0;
    int prSelected = 0;
    PreferencesManager prefMgr;
    Stack<String> stackImg = new Stack<String>();
    private List<View> view_list = new ArrayList<>();
    private List<RelativeLayout> step_view_list = new ArrayList<>();
    private int success_step = 0;
    private int current_step = 0;
    private View parent_view;
    //    private String epName, epAnn, epDesc, timeStart, timeEnd, epProfile, epPeriod, epCastDateAt = null;
    private String radioId, epId, epName, epDesc, epAnnouncer, programId, epProfile, epStreamUrl, programName, timestamp, createBy, stopNote = null;
    private DateTimeModel dateTimeModel;
    /**
     * broadcastDateAt
     * epEndAt
     * epStartAt
     */
    private Uri imageUri = null;
    private RadioInfo radioInfo = new RadioInfo();
    //    private RadioProgram program;
    private List<DateTimeModel> showTimeList = new ArrayList<>();

    private long timeStart, timeEnd;
    private boolean isItMainTime = false;
    private EpisodeRepositoryImpl ePoRepo;


    public static void startActivity(Context context, Episode episode) {
        Intent intent = new Intent(context, EpisodeAddStepperVertical.class);
        String obj = (new Gson().toJson(episode));
        intent.putExtra("episode", obj);
        context.startActivity(intent);
    }

    public static void startActivity(Context context) {
        Intent intent = new Intent(context, EpisodeAddStepperVertical.class);
        context.startActivity(intent);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_episode_add_stepper_vertical);
        parent_view = findViewById(android.R.id.content);

        ButterKnife.bind(this);
        ePoRepo = new EpisodeRepositoryImpl(this, FirebaseConstants.EPISODE_TABLE);
        prefMgr = new PreferencesManager(this);

        initToolbar();
        initComponent();
        loadProfileDefault();

        initEditView();
//        setDisplayDayChips();

        button_add.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                addView();
            }
        });


    }


    private void initToolbar() {
        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        toolbar.setNavigationIcon(R.drawable.ic_arrow_back_white_24dp);
        setSupportActionBar(toolbar);
        getSupportActionBar().setTitle(null);
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        Tools.setSystemBarColor(this);
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


//        et_ep_start.setOnClickListener(new View.OnClickListener() {
//            @Override
//            public void onClick(View v) {
//                dialogTimePickerLight((TextView) v, new OnCallbackDate() {
//                    @Override
//                    public void getSelected(long _time) {
//                        timeStart = _time;
//                        et_ep_start.setError(null);
//                        LogUtility.e(TAG, String.valueOf(_time));
//                    }
//                });
//            }
//        });

//        et_ep_end.setOnClickListener(new View.OnClickListener() {
//            @Override
//            public void onClick(View v) {
//                dialogTimePickerLight((TextView) v, new OnCallbackDate() {
//                    @Override
//                    public void getSelected(long _time) {
//                        timeEnd = _time;
//                        et_ep_end.setError(null);
//                        LogUtility.e(TAG, String.valueOf(timeEnd));
//
//                    }
//                });
//            }
//        });


//        et_ep_stream_date.setOnClickListener(new View.OnClickListener() {
//            @Override
//            public void onClick(View v) {
//                dialogDatePickerLight((TextView) v);
//            }
//        });


    }

    private void initEditView() {
        String s = getIntent().getStringExtra("episode");
        if (s != null) {
            Episode _episode = new Gson().fromJson(s, Episode.class);
            showSnackBar(_episode.getEpName());

            et_station.setFocusable(false);
            et_station.setClickable(true);

            et_program.setFocusable(false);
            et_program.setClickable(true);

            et_station.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    showWarningDialog("لا يمكنك تغيير القناة الإاعية في حالة تحديث بيانات البرنامج");
                }
            });

            et_program.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    showWarningDialog("لا يمكنك تغيير إسم البرنامج في حالة تحديث بيانات البرنامج");
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
            radioInfo = prefMgr.selectedRadio() ;
            radioId = radioInfo.getRadioId();
            dateTimeModel = _episode.getDateTimeModel();
            showTimeList = _episode.getShowTimeList() != null ? _episode.getShowTimeList() : new ArrayList<>();
//            program = program.findRadioProgram(programId, ShardDate.getInstance().getProgramList());
//            programId = program.getProgramId();


            tit_ep_name.setText(epName);
            tit_ep_announcer.setText(epAnnouncer);
            tit_ep_desc.setText(epDesc);
//           RadioInfo ri = radioInfo.findRadio(radioId,ShardDate.getInstance().getInfoList());
            et_station.setText(radioInfo.getName());
            et_program.setText(programName);

            loadProfile(Uri.parse(epProfile));


        }
    }


    //    @OnClick({R.id.ib_send})
    public void send() {


        if (prefMgr.getUsers() == null || prefMgr.getUsers().getUserId() == null) {
            showToast(getString(R.string.most_login));
            return;
        }


        radioId = radioInfo.getRadioId();
//        programId = program.getProgramId();
//        programName = program.getPrName();
        createBy = prefMgr.getUsers().getUserId();

        epName = tit_ep_name.getText().toString().trim();
        epAnnouncer = tit_ep_announcer.getText().toString().trim();
        epDesc = tit_ep_desc.getText().toString().trim();


        if (imageUri != null) {
            ProgressHUD mProgressHUD = ProgressHUD.showDialog( "تحميل الصورة", true, false, null);
            mProgressHUD.setMessage("جاري تحميل البيانات ...");
            mProgressHUD.show();

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
                                    epProfile = uri.toString();
                                    mProgressHUD.dismiss();

                                    Episode episode = new Episode(radioId, programId, programName, "", epName, epDesc, epAnnouncer, dateTimeModel, epProfile, "", 1, 1, String.valueOf(System.currentTimeMillis()), createBy, "", false, showTimeList);
                                    ePoRepo.createEpi(radioId, programId, episode, new CallBack() {
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
            Episode episode = new Episode(radioId, programId, programName, "", epName, epDesc, epAnnouncer, dateTimeModel, epProfile, "", 1, 1, String.valueOf(System.currentTimeMillis()), createBy, "", false, showTimeList);
            ePoRepo.createEpi(radioId, programId, episode, new CallBack() {
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


    public void clickAction(View view) {
        int id = view.getId();
        switch (id) {
            case R.id.bt_continue_one:
                // validate input user here


                if (tit_ep_name.getText().toString().trim().isEmpty()) {
                    tit_ep_name.setError(getString(R.string.empty_not_allowd));
                    tit_ep_name.requestFocus();
                    return;
                }

                collapseAndContinue(0);
                break;
            case R.id.bt_continue_tow:
                // validate input user here
                if (et_station.getText().toString().trim().isEmpty()) {
                    et_station.setError(getString(R.string.empty_not_allowd));
                    et_station.requestFocus();
                    showSnackBar("يجب تحديد القناة الإذاعية");
                    return;
                } else if (et_program.getText().toString().trim().isEmpty()) {
                    et_program.setError(getString(R.string.empty_not_allowd));
                    et_program.requestFocus();
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

    @OnClick({R.id.et_station})
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
                et_station.setText(radioInfo.getName());
                et_station.setError(null);
                stackImg.push(radioInfo.getLogo());
                loadRadioProgram(radioInfo.getRadioId());
                dialogInterface.dismiss();
            }
        });
        builder.show();
    }

    @OnClick({R.id.et_program})
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
                et_program.setText(programName);
                et_program.setError(null);
                epProfile = items.get(i).getPrProfile();
                stackImg.push(epProfile);
                loadProfile(Uri.parse(epProfile));
                dialogInterface.dismiss();
            }
        });
        builder.show();
    }


    private void loadRadioProgram(String RadioId) {

        FmRepositoryImpl rpRepo = new FmRepositoryImpl(this, FirebaseConstants.RADIO_PROGRAM_TABLE);
        rpRepo.readAllProgramByRadioId(RadioId, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                if (isCollection(object)) {
                    List<RadioProgram> programList = (List<RadioProgram>) object;
                    ShardDate.getInstance().setProgramList(programList);
                    et_program.setText(null);
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

        // Displaying the Stack after the Operation
        System.out.println("Final stackImg: " + stackImg);
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

    /**
     * Showing Alert Dialog with Settings option
     * Navigates user to app settings
     * NOTE: Keep proper title and message depending on your app
     */
    private void showSettingsDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(EpisodeAddStepperVertical.this);
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
        Intent intent = new Intent(EpisodeAddStepperVertical.this, ImagePickerActivity.class);
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
        Intent intent = new Intent(EpisodeAddStepperVertical.this, ImagePickerActivity.class);
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

        for (int i = 0; i < layout_list.getChildCount(); i++) {
            View rowView = layout_list.getChildAt(i);
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
            RadioButton  radioButton = (RadioButton) findViewById(selectedId);
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

    public String getEmojiByUnicode(int unicode){
        return new String(Character.toChars(unicode));
    }

//    private RadioButton mSelectedRB;
//    private int mSelectedPosition = -1;

    private void showWeekDialog(final View view) {
        final ArrayList<WakeTranslate> displayDayList = translateWakeDaysAr(Arrays.asList(FmUtilize.getWeekDayNames()));
        ArrayList<String> arList = new ArrayList<>();
        for(WakeTranslate o:displayDayList){
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

//        for (int position = 0; position < layout_list.getChildCount(); position++) {
//
//            View _rowPosition = layout_list.getChildAt(position);
//            RadioButton tempRadio = (RadioButton) _rowPosition.findViewById(R.id.radio_main);
//
//            if (mSelectedPosition != position) {
//                rbMainTime.setChecked(false);
//            } else {
//                rbMainTime.setChecked(true);
//                if (mSelectedRB != null && rbMainTime != mSelectedRB) {
//                    mSelectedRB = rbMainTime;
//                }
//            }
//        }

        layout_list.addView(rowView);
    }

    private void removeView(View view) {
        layout_list.removeView(view);
    }


//    -------------------- show day name -------------------

//    private void initSelectedChip() {
//        if (dateTimeModel == null)
//            return;
//
////        ArrayList<String> enList = new ArrayList<>();
////        enList.add("Sun");
////        enList.add("Mon");
////        enList.add("Thu");
////        for (int i = 0; i < 5; i++) {
////            Chip mChip = (Chip) this.getLayoutInflater().inflate(R.layout.item_chip_display_days, null, false);
////            mChip.setText("item " + i);
////            int paddingDp = (int) TypedValue.applyDimension(
////                    TypedValue.COMPLEX_UNIT_DIP, 10,
////                    getResources().getDisplayMetrics()
////            );
////            mChip.setPadding(paddingDp, 0, paddingDp, 0);
////            mChip.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
////                @Override
////                public void onCheckedChanged(CompoundButton compoundButton, boolean b) {
////
////                }
////            });
////            mChip.setChecked(true);
////            cg_display_day.addView(mChip);
////        }
//        int chipsCount = cg_display_day.getChildCount();
//        int i = 0;
//        ArrayList<String> mList = new ArrayList<>();
//        while (i < chipsCount) {
//            Chip chip = (Chip) cg_display_day.getChildAt(i);
//
//            for (WakeTranslate s : translateWakeDaysAr(dateTimeModel.getDisplayDays())) {
//                if (chip.getText().toString().equals(s.getDayName())) {
////                    mList.add(chip.getText().toString());
//                    ((Chip) cg_display_day.getChildAt(i)).setChecked(true);
//                }
//            }
////            if (chip.isChecked()) {
////                mList.add(chip.getText().toString());
////            }
//            i++;
////            displayDay = translateWakeDaysEn(mList);
//        }
//
//        onChipDisplayDayClick(null);
////        tie_display_day.setText(android.text.TextUtils.join(" , ", mList));
////        tie_display_day.setError(null);
//
//    }

//    public void onChipDisplayDayClick(View view) {
//        int chipsCount = cg_display_day.getChildCount();
//        int i = 0;
//        ArrayList<String> mList = new ArrayList<>();
//        while (i < chipsCount) {
//            Chip chip = (Chip) cg_display_day.getChildAt(i);
//            if (chip.isChecked()) {
//                mList.add(chip.getText().toString());
//            }
//            i++;
//            dateTimeModel.setDisplayDays(translateWakeDaysEn(mList));;
//        }
//
//        tie_display_day.setText(android.text.TextUtils.join(" , ", mList));
//        tie_display_day.setError(null);
//    }


//    public void setDisplayDayChips() {
//        cg_display_day.removeAllViews();
//        ArrayList<WakeTranslate> displayDayList = translateWakeDaysAr(Arrays.asList(FmUtilize.getWeekDayNames()));
//        for (WakeTranslate category : displayDayList) {
//            Chip mChip = (Chip) this.getLayoutInflater().inflate(R.layout.item_chip_display_days, null, false);
//            mChip.setText(category.getDayName());
//            int paddingDp = (int) TypedValue.applyDimension(
//                    TypedValue.COMPLEX_UNIT_DIP, 10,
//                    getResources().getDisplayMetrics()
//            );
//            mChip.setPadding(paddingDp, 0, paddingDp, 0);
//            mChip.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
//                @Override
//                public void onCheckedChanged(CompoundButton compoundButton, boolean b) {
//
//                }
//            });
//            cg_display_day.addView(mChip);
//        }
//
//            initSelectedChip();
//    }
}
