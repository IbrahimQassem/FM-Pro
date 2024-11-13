package com.sana.dev.fm.ui.fragment;


import android.os.AsyncTask;
import android.os.Bundle;
import android.text.Html;
import android.text.SpannableString;
import android.text.SpannableStringBuilder;
import android.text.style.ForegroundColorSpan;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;
import androidx.recyclerview.widget.DividerItemDecoration;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.firebase.firestore.CollectionReference;
import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.AdapterMainProgram;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.enums.UserType;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.ui.activity.ProgramDetailsActivity;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.DatabaseHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQuery;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQueryConditionCode;

import java.util.ArrayList;
import java.util.List;

/**
 * A simple {@link Fragment} subclass.
 * Use the {@link ProgramsFragment} factory method to
 * create an instance of this fragment.
 */
public class ProgramsFragment extends BaseFragment {
    private static final String TAG = ProgramsFragment.class.getSimpleName();
    RecyclerView recyclerView;
    TextView tvTittle;
    FrameLayout cf_container;
    private FirestoreDbUtility firestoreDbUtility;
    private List<RadioProgram> programs = new ArrayList<>();
    private DatabaseHelper dbHelper;
    private AdapterMainProgram adapter;
    //    private SearchView searchView;
    private SwipeRefreshLayout swipeRefreshLayout;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        programs = new ArrayList<>();
        dbHelper = new DatabaseHelper(getContext());
        firestoreDbUtility = new FirestoreDbUtility();
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_programs, container, false);
        initializeViews(view);
        setupRecyclerView();
//        setupSearchView();
        setupSwipeRefresh();
        loadPrograms();
        return view;
    }

    @Override
    public void onViewCreated(View view, Bundle savedInstanceState) {
        EmptyViewFragment emptyViewFragment = EmptyViewFragment.newInstance(requireActivity().getString(R.string.no_data_available), getString(R.string.brows_more_station), getString(R.string.label_main_screen));
        FragmentTransaction transaction = getChildFragmentManager().beginTransaction();
        transaction.replace(cf_container.getId(), emptyViewFragment).commit();
        emptyViewFragment.setOnItemClickListener(new CallBackListener() {
            @Override
            public void onCallBack() {
                if ((MainActivity) mActivity != null)
                    ((MainActivity) mActivity).selectTab(R.id.navigation_home);
            }
        });

        toggleView(true);
    }

    private void initializeViews(View view) {
        recyclerView = view.findViewById(R.id.programsRecyclerView);
        tvTittle = view.findViewById(R.id.tvTittle);
//        searchView = view.findViewById(R.id.programSearchView);
        swipeRefreshLayout = view.findViewById(R.id.swipeRefreshLayout);
        cf_container = view.findViewById(R.id.child_fragment_container);
    }

    private void toggleView(boolean hide) {
        recyclerView.setVisibility(!hide ? View.VISIBLE : View.GONE);
        swipeRefreshLayout.setVisibility(!hide ? View.VISIBLE : View.GONE);
        cf_container.setVisibility(hide ? View.VISIBLE : View.GONE);
    }

    private void setupRecyclerView() {
//        adapter = new AdapterMainProgram(programs, this::onProgramClick);
        adapter = new AdapterMainProgram(requireActivity(), programs, R.layout.item_programs);

        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        recyclerView.setAdapter(adapter);
        recyclerView.addItemDecoration(new DividerItemDecoration(getContext(), DividerItemDecoration.VERTICAL));

        adapter.setOnItemClickListener(this::onProgramClick);
        adapter.setOnLongItemClickListener(this::OnItemLongClick);
    }


    private void onProgramClick(View view, Object obj, int position) {
        RadioProgram item = (RadioProgram) obj;
        if (BuildConfig.FLAVOR.equals("internews") || BuildConfig.FLAVOR.equals("hudhud_fm") || (BuildConfig.FLAVOR.equals("hudhudfm_google_play") && BuildConfig.DEBUG)) {
            Episode episode = new Episode();
            episode.setRadioId(item.getRadioId());
            episode.setProgramId(item.getProgramId());
            int[] startingLocation = new int[2];
            view.getLocationOnScreen(startingLocation);
            startingLocation[0] += view.getWidth() / 2;
            ProgramDetailsActivity.startUserProfileFromLocation(startingLocation, mActivity, episode);
            mActivity.overridePendingTransition(0, 0);
//                                showToast("is : "+radioProgram.getPrName());
        }
//                                switch (v.getId()) {
//                                    case R.id.bt_toggle:
//                                        break;
//                                    default:return;
//                                }
    }

    private void OnItemLongClick(View view, Object obj, int position) {
        RadioProgram item = (RadioProgram) obj;
        if (ProgramsFragment.this.isAccountSignedIn() && prefMgr.getUserSession().getUserType() == UserType.SuperADMIN) {
            ModelConfig config = new ModelConfig(R.drawable.ic_info, getString(R.string.label_warning), getString(R.string.confirm_delete, item.getPrName()), new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                @Override
                public void onClick(View v) {

                    CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.RADIO_PROGRAM_TABLE, getSelectedRadio().getRadioId()).document(AppConstant.Firebase.RADIO_PROGRAM_TABLE).collection(AppConstant.Firebase.RADIO_PROGRAM_TABLE);
                    firestoreDbUtility.deleteDocument(collectionReference, item.getProgramId(), new CallBack() {
                        @Override
                        public void onSuccess(Object object) {
                            showToast(getString(R.string.deleted_successfully_with_param, item.getPrName()));
//                                                    mAdapter.removeAt(position);
                            programs.remove(position);
                            adapter.notifyDataSetChanged();
//                                                    mAdapter.notifyItemRangeRemoved(position, itemList.size());
                        }

                        @Override
                        public void onFailure(Object object) {
                            showToast(getString(R.string.label_error_occurred_with_val, object));
                        }
                    });
                }
            }));
            showWarningDialog(config);
        }
    }

//    private void setupSearchView() {
//        searchView.setOnQueryTextListener(new SearchView.OnQueryTextListener() {
//            @Override
//            public boolean onQueryTextSubmit(String query) {
//                filterPrograms(query);
//                return true;
//            }
//
//            @Override
//            public boolean onQueryTextChange(String newText) {
//                filterPrograms(newText);
//                return true;
//            }
//        });
//    }

    private void setupSwipeRefresh() {
        swipeRefreshLayout.setOnRefreshListener(this::refreshPrograms);
        swipeRefreshLayout.setColorSchemeResources(
                R.color.refresh_color_1,
                R.color.refresh_color_2,
                R.color.refresh_color_3
        );
    }

    private void loadPrograms() {
        // Async task to load programs from database
/*        new AsyncTask<Void, Void, List<RadioProgram>>() {
            @Override
            protected List<RadioProgram> doInBackground(Void... voids) {
                return dbHelper.getAllPrograms();
            }

            @Override
            protected void onPostExecute(List<RadioProgram> loadedPrograms) {
                programs.clear();
                programs.addAll(loadedPrograms);
                adapter.notifyDataSetChanged();
            }
        }.execute();*/
        if (isRadioSelected()) {
            try {
                SpannableStringBuilder builder = new SpannableStringBuilder();

                String primary = (getSelectedRadio() != null && getSelectedRadio().getName() != null) ? getSelectedRadio().getName() : " ";
                SpannableString blueSpannable = new SpannableString(Html.fromHtml(" <b>" + primary + "</b> "));
//        StyleSpan boldSpan = new StyleSpan(Typeface.BOLD);
//        blueSpannable.setSpan(boldSpan, 0, 8, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
                blueSpannable.setSpan(new ForegroundColorSpan(getResources().getColor(R.color.colorPrimary)), 0, primary.length(), 0);
                builder.append(blueSpannable);

                String black = requireActivity().getResources().getString(R.string.main_program_for);
                SpannableString whiteSpannable = new SpannableString(black);
                whiteSpannable.setSpan(new ForegroundColorSpan(getResources().getColor(R.color.grey_40)), 0, black.length(), 0);
                builder.append(whiteSpannable);


                tvTittle.setText(builder, TextView.BufferType.SPANNABLE);

            } catch (Exception e) {
                e.printStackTrace();
                Log.e(TAG, "Error parsing remote config JSON: " + e.getMessage());
            }
        } else {
            toggleView(true);
        }
        List<FirestoreQuery> firestoreQueryList = new ArrayList<>();
        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.WHERE_EQUAL_TO,
                "radioId",
                getSelectedRadio().getRadioId()
        ));

//            firestoreQueryList.add(new FirestoreQuery(
//                    FirestoreQueryConditionCode.WHERE_LESS_THAN_OR_EQUAL_TO,
//                    "programScheduleTime.dateEnd",
//                    System.currentTimeMillis()
//            ));


        firestoreQueryList.add(new FirestoreQuery(
                FirestoreQueryConditionCode.WHERE_EQUAL_TO,
                "disabled",
                false
        ));

        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.RADIO_PROGRAM_TABLE, getSelectedRadio().getRadioId()).document(AppConstant.Firebase.RADIO_PROGRAM_TABLE).collection(AppConstant.Firebase.RADIO_PROGRAM_TABLE);

        firestoreDbUtility.getMany(collectionReference, firestoreQueryList, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                List<RadioProgram> loadedPrograms = FirestoreDbUtility.getDataFromQuerySnapshot(object, RadioProgram.class);
                toggleView(loadedPrograms.isEmpty());

                if (!loadedPrograms.isEmpty()) {
                    programs.clear();
                    programs.addAll(loadedPrograms);
                    adapter.notifyDataSetChanged();
                }
            }

            @Override
            public void onFailure(Object object) {
                LogUtility.e(TAG, " loadRadioProgram :  " + object);
                toggleView(true);
            }
        });

    }


    private void refreshPrograms() {
//        loadPrograms();
        swipeRefreshLayout.setRefreshing(false);
    }

    private void filterPrograms(String query) {
        List<RadioProgram> filteredList = new ArrayList<>();
        for (RadioProgram program : programs) {
            if (program.getPrName().toLowerCase().contains(query.toLowerCase()) ||
                    program.getPrDesc().toLowerCase().contains(query.toLowerCase())) {
                filteredList.add(program);
            }
        }
        adapter.updatePrograms(filteredList);
    }

    private void onProgramClick(RadioProgram program) {
        // Navigate to program details
        Bundle bundle = new Bundle();
        bundle.putString("program_id", program.getProgramId());
//        Navigation.findNavController(getView())
//                .navigate(R.id.action_programsFragment_to_programDetailsFragment, bundle);
    }

    public void addProgram(RadioProgram program) {
        new AsyncTask<RadioProgram, Void, Boolean>() {
            @Override
            protected Boolean doInBackground(RadioProgram... programs) {
                return dbHelper.addProgram(programs[0]);
            }

            @Override
            protected void onPostExecute(Boolean success) {
                if (success) {
                    loadPrograms();
                    showToast("RadioProgram added successfully");
                } else {
                    showToast("Failed to add program");
                }
            }
        }.execute(program);
    }

    public void updateProgram(RadioProgram program) {
        new AsyncTask<RadioProgram, Void, Boolean>() {
            @Override
            protected Boolean doInBackground(RadioProgram... programs) {
                return dbHelper.updateProgram(programs[0]);
            }

            @Override
            protected void onPostExecute(Boolean success) {
                if (success) {
                    loadPrograms();
                    showToast("RadioProgram updated successfully");
                } else {
                    showToast("Failed to update program");
                }
            }
        }.execute(program);
    }

    public void deleteProgram(int programId) {
        new AlertDialog.Builder(getContext())
                .setTitle("Delete RadioProgram")
                .setMessage("Are you sure you want to delete this program?")
                .setPositiveButton("Yes", (dialog, which) -> {
                    performDeleteProgram(programId);
                })
                .setNegativeButton("No", null)
                .show();
    }

    private void performDeleteProgram(int programId) {
        new AsyncTask<Integer, Void, Boolean>() {
            @Override
            protected Boolean doInBackground(Integer... integers) {
                return dbHelper.deleteProgram(integers[0]);
            }

            @Override
            protected void onPostExecute(Boolean success) {
                if (success) {
                    loadPrograms();
                    showToast("RadioProgram deleted successfully");
                } else {
                    showToast("Failed to delete program");
                }
            }
        }.execute(programId);
    }


    @Override
    public void onDestroy() {
        super.onDestroy();
        if (dbHelper != null) {
            dbHelper.close();
        }
    }

    public void refresh() {
        loadPrograms();
    }

}