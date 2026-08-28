package com.sana.dev.fm.ui.fragment;


import android.content.Context;
import android.os.Bundle;
import android.text.Html;
import android.text.SpannableString;
import android.text.SpannableStringBuilder;
import android.text.style.ForegroundColorSpan;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.AdapterMainProgram;
import com.sana.dev.fm.adapter.SimpleSectionedRecyclerViewAdapter;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.ui.activity.ProgramDetailsActivity;
import com.sana.dev.fm.data.datasource.FirestoreProgramsRemoteDataSource;
import com.sana.dev.fm.data.datasource.ProgramsRemoteDataSource;
import com.sana.dev.fm.data.mapper.ProgramMapper;
import com.sana.dev.fm.data.repository.ProgramsRepositoryImpl;
import com.sana.dev.fm.domain.model.Program;
import com.sana.dev.fm.domain.repository.ProgramsRepository;
import com.sana.dev.fm.feature.programs.state.ProgramsUiState;
import com.sana.dev.fm.feature.programs.viewmodel.ProgramsViewModel;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * A simple {@link Fragment} subclass.
 * Use the {@link ProgramsFragment} factory method to
 * create an instance of this fragment.
 */
public class ProgramsFragment extends BaseFragment {
    private static final String TAG = ProgramsFragment.class.getSimpleName();

    private RecyclerView recyclerView;
    private FrameLayout cf_container;
    private TextView tvTittle;

    View parent_fragment_view;
    private AdapterMainProgram mAdapter;
    private List<RadioProgram> itemList = new ArrayList<>();
    private ProgramsViewModel programsViewModel;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ProgramsRemoteDataSource remoteDataSource = new FirestoreProgramsRemoteDataSource();
        ProgramsRepository repository = new ProgramsRepositoryImpl(remoteDataSource);
        programsViewModel = new ProgramsViewModel(repository);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        parent_fragment_view = inflater.inflate(R.layout.fragment_programs, container, false);
        recyclerView = parent_fragment_view.findViewById(R.id.recyclerView);
        cf_container = parent_fragment_view.findViewById(R.id.child_fragment_container);
        tvTittle = parent_fragment_view.findViewById(R.id.tvTittle);
        initComponent();

        return parent_fragment_view;
    }


    @Override
    public void onViewCreated(View view, Bundle savedInstanceState) {
        EmptyViewFragment emptyViewFragment = EmptyViewFragment.newInstance(requireActivity().getString(R.string.no_data_available), getString(R.string.brows_more_station), getString(R.string.label_main_screen));
        FragmentTransaction transaction = getChildFragmentManager().beginTransaction();
        transaction.replace(R.id.child_fragment_container, emptyViewFragment).commit();
        emptyViewFragment.setOnItemClickListener(new CallBackListener() {
            @Override
            public void onCallBack() {
                if ((MainActivity) mActivity != null)
                    ((MainActivity) mActivity).selectTab(R.id.navigation_home);
            }
        });

        toggleView(true);
    }

    private void initComponent() {
        RadioInfo selectedRadio = prefMgr.selectedRadio();
        if (selectedRadio != null && selectedRadio.getRadioId() != null) {
            try {

                SpannableStringBuilder builder = new SpannableStringBuilder();

                String primary = (selectedRadio != null && selectedRadio.getName() != null) ? selectedRadio.getName() : " ";
                SpannableString blueSpannable = new SpannableString(Html.fromHtml(" <b>" + primary + "</b> "));
                blueSpannable.setSpan(new ForegroundColorSpan(getResources().getColor(R.color.colorPrimary)), 0, primary.length(), 0);
                builder.append(blueSpannable);

                String black = requireActivity().getResources().getString(R.string.main_program_for);
                SpannableString whiteSpannable = new SpannableString(black);
                whiteSpannable.setSpan(new ForegroundColorSpan(getResources().getColor(R.color.grey_40)), 0, black.length(), 0);
                builder.append(whiteSpannable);

                tvTittle.setText(builder, TextView.BufferType.SPANNABLE);

            } catch (Exception e) {
                LogUtility.e(TAG, "Error formatting title: " + e.getMessage());
            }

            programsViewModel.getUiState().observe(getViewLifecycleOwner(), state -> {
                if (state == null) return;

                if (state.isLoading()) {
                    toggleView(itemList == null || itemList.isEmpty());
                } else if (state.isContent()) {
                    List<RadioProgram> programList = new ArrayList<>();
                    for (Program p : state.getPrograms()) {
                        if (p != null) {
                            programList.add(ProgramMapper.toDto(p));
                        }
                    }

                    if (!programList.isEmpty()) {
                        itemList = programList;
                        initAdapter();
                        setupAdapterListeners(selectedRadio);
                        toggleView(false);
                    } else {
                        toggleView(true);
                    }
                } else if (state.isEmpty()) {
                    toggleView(true);
                } else if (state.isError()) {
                    toggleView(itemList == null || itemList.isEmpty());
                    LogUtility.e(TAG, "Programs load error: " + state.getMessage());
                }
            });

            programsViewModel.loadPrograms(selectedRadio.getRadioId());
        } else {
            toggleView(true);
        }

    }

    private void setupAdapterListeners(RadioInfo selectedRadio) {
        if (mAdapter == null) return;

        mAdapter.setOnItemClickListener(new OnClickListener() {
            @Override
            public void onItemClick(View view, Object obj, int position) {
                RadioProgram item = (RadioProgram) obj;
                if (BuildConfig.FLAVOR.equals("internews") || BuildConfig.FLAVOR.equals("hudhudOfficial") || BuildConfig.FLAVOR.equals("hudhudDev")) {
                    Episode episode = new Episode();
                    episode.setRadioId(item.getRadioId());
                    episode.setProgramId(item.getProgramId());
                    int[] startingLocation = new int[2];
                    view.getLocationOnScreen(startingLocation);
                    startingLocation[0] += view.getWidth() / 2;
                    ProgramDetailsActivity.startUserProfileFromLocation(startingLocation, mActivity, episode);
                    mActivity.overridePendingTransition(0, 0);
                }
            }
        });
    }

    void initAdapter() {
        //This is the code to provide a sectioned list
        List<SimpleSectionedRecyclerViewAdapter.Section> sections =
                new ArrayList<SimpleSectionedRecyclerViewAdapter.Section>();

        HashMap<String, ArrayList<RadioProgram>> myProgram = new HashMap<String, ArrayList<RadioProgram>>();
        for (int i = 0; i < itemList.size(); i++) {
            if (itemList.get(i).getProgramScheduleTime() != null) {
                String month_name = FmUtilize.month_date.format(Tools.getDateFormat(itemList.get(i).getProgramScheduleTime().getDateStart()));
                ArrayList<RadioProgram> programList = myProgram.get(month_name);
                if (programList == null) {
                    programList = new ArrayList<RadioProgram>();
                    myProgram.put(month_name, programList);
                    sections.add(new SimpleSectionedRecyclerViewAdapter.Section(i, month_name));
                }
                RadioProgram p = itemList.get(i);
                programList.add(p);
            }
        }


        mAdapter = new AdapterMainProgram(requireActivity(), itemList, R.layout.item_programs);

        //Add your adapter to the sectionAdapter
        SimpleSectionedRecyclerViewAdapter.Section[] dummy = new SimpleSectionedRecyclerViewAdapter.Section[sections.size()];
        SimpleSectionedRecyclerViewAdapter mSectionedAdapter = new
                SimpleSectionedRecyclerViewAdapter(requireActivity(), R.layout.layout_section, R.id.section_text, mAdapter);
        mSectionedAdapter.setSections(sections.toArray(dummy));


        recyclerView.setAdapter(mSectionedAdapter);
        recyclerView.setHasFixedSize(true);
        recyclerView.setLayoutManager(new LinearLayoutManager(requireContext()));
        recyclerView.setNestedScrollingEnabled(false);
    }

    @Override
    public void onAttach(@NonNull Context context) {
        super.onAttach(context);
    }

    @Override
    public void onDetach() {
        super.onDetach();
    }

    public void refresh() {
        initComponent();
    }

    void toggleView(boolean hide) {
        recyclerView.setVisibility(!hide ? View.VISIBLE : View.GONE);
        cf_container.setVisibility(hide ? View.VISIBLE : View.GONE);
    }

}