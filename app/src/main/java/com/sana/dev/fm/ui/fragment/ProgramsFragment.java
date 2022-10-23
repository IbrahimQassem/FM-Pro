package com.sana.dev.fm.ui.fragment;


import static com.sana.dev.fm.utils.FmUtilize.isCollection;
import static com.sana.dev.fm.utils.FmUtilize.month_date;
import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.RADIO_PROGRAM_TABLE;

import android.content.Context;
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

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;


import com.google.gson.Gson;
import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.AdapterListProgram;
import com.sana.dev.fm.adapter.SimpleSectionedRecyclerViewAdapter;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.UserType;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.ui.activity.ProgramDetailsActivity;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.FmRepositoryImpl;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * A simple {@link Fragment} subclass.
 * Use the {@link ProgramsFragment#newInstance} factory method to
 * create an instance of this fragment.
 */
public class ProgramsFragment extends BaseFragment {

    private static final String TAG = ProgramsFragment.class.getSimpleName();

    // the fragment initialization parameters, e.g. ARG_ITEM_NUMBER
    private static final String ARG_RADIO_ID = "radioId";
    private static final String ARG_RADIO_LIST = "radioList";

    private String radioId;

    /**
     * Use this factory method to create a new instance of
     * this fragment using the provided parameters.
     *
     * @param radioId Parameter 1.
     * @param list   Parameter 2.
     * @return A new instance of fragment ProgramsFragment.
     */
    public static ProgramsFragment newInstance(String radioId, List<RadioProgram> list) {
        ProgramsFragment fragment = new ProgramsFragment();
        // Don't include arguments unless uuid != null

        if (list != null) {
            Bundle args = new Bundle();
            args.putString(ARG_RADIO_ID, radioId);
            args.putSerializable(ARG_RADIO_LIST, (Serializable) list);
            fragment.setArguments(args);
        }
        return fragment;
    }

    @BindView(R.id.recyclerView)
    RecyclerView recyclerView;
    @BindView(R.id.child_fragment_container)
    FrameLayout cf_container;
    @BindView(R.id.tvTittle)
    TextView tvTittle;

    View view;
    Context ctx;

    private AdapterListProgram mAdapter;
    private List<RadioProgram> itemList;
    private View parent_view;
    private FmRepositoryImpl fmRepo;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            radioId = getArguments().getString(ARG_RADIO_ID);
            itemList = (List<RadioProgram>) getArguments().getSerializable(ARG_RADIO_LIST);
        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        view = inflater.inflate(R.layout.fragment_programs, container, false);
        ButterKnife.bind(this, view);
        parent_view = view.findViewById(android.R.id.content);
        fmRepo = new FmRepositoryImpl(getActivity(), RADIO_PROGRAM_TABLE);

        initList();
        initComponent();


        return view;
    }


    @Override
    public void onViewCreated(View view, Bundle savedInstanceState) {
        EmptyViewFragment emptyViewFragment = EmptyViewFragment.newInstance(ctx.getString(R.string.no_data_available), getString(R.string.brows_more_station), getString(R.string.label_main_screen));
        FragmentTransaction transaction = getChildFragmentManager().beginTransaction();
        transaction.replace(R.id.child_fragment_container, emptyViewFragment).commit();
        emptyViewFragment.setOnItemClickListener(new CallBackListener() {
            @Override
            public void onCallBack() {
                if ((MainActivity) getActivity() != null)
                    ((MainActivity) getActivity()).selectTab(R.id.navigation_home);
            }
        });
    }

    private void initComponent() {

        SpannableStringBuilder builder = new SpannableStringBuilder();

        String primary = prefMgr.selectedRadio() != null ? prefMgr.selectedRadio().getName() : "";
        SpannableString blueSpannable = new SpannableString(Html.fromHtml("<b>" + primary + "</b>"));
//        StyleSpan boldSpan = new StyleSpan(Typeface.BOLD);
//        blueSpannable.setSpan(boldSpan, 0, 8, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
        blueSpannable.setSpan(new ForegroundColorSpan(getResources().getColor(R.color.colorPrimaryDark)), 0, primary.length(), 0);
        builder.append(blueSpannable);

        String black = ctx.getResources().getString(R.string.main_program_for);
        SpannableString whiteSpannable = new SpannableString(black);
        whiteSpannable.setSpan(new ForegroundColorSpan(getResources().getColor(R.color.grey_40)), 0, black.length(), 0);
        builder.append(whiteSpannable);


        tvTittle.setText(builder, TextView.BufferType.SPANNABLE);

        if (isRadioSelected())
            fmRepo.readAllProgramByRadioId(prefMgr.selectedRadio().getRadioId(), new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    LogUtility.d(LogUtility.TAG, "readAllProgramByRadioId response: " + new Gson().toJson(object));

                    if (isCollection(object)) {
                        itemList = (List<RadioProgram>) object;
                        recyclerView.setLayoutManager(new LinearLayoutManager(ctx));
                        recyclerView.setHasFixedSize(true);
//                      itemList =  DataGenerator.getProgramData(ctx);
//                        mAdapter = new AdapterListProgram(ctx, itemList, R.layout.item_programs);
//                        recyclerView.setAdapter(mAdapter);
                        initAdapter();
                        mAdapter.setOnItemClickListener(new AdapterListProgram.OnItemClickListener() {
                            public void onItemClick(View v, RadioProgram radioProgram, int i) {
                                if (BuildConfig.FLAVOR.equals("internews")) {
                                    Episode episode = new Episode();
                                    episode.setRadioId(radioProgram.getRadioId());
                                    episode.setProgramId(radioProgram.getProgramId());
                                    int[] startingLocation = new int[2];
                                    v.getLocationOnScreen(startingLocation);
                                    startingLocation[0] += v.getWidth() / 2;
                                    ProgramDetailsActivity.startUserProfileFromLocation(startingLocation, getActivity(), episode);
                                    getActivity().overridePendingTransition(0, 0);
//                                showToast("is : "+radioProgram.getPrName());
                                }
                            }
                        });

                        mAdapter.setOnLongItemClickListener(new AdapterListProgram.OnLongItemClickListener() {
                            @Override
                            public void onLongItemClick(View view, RadioProgram obj, int position) {
                                if (ProgramsFragment.this.isAccountSignedIn() && prefMgr.getUserSession().getUserType() == UserType.SuperADMIN){
                                    ModelConfig config = new ModelConfig(R.drawable.world_map, getString(R.string.label_warning), getString(R.string.confirm_delete,obj.getPrName() ),  null, new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                                        @Override
                                        public void onClick(View v) {
                                            fmRepo.deleteProgram(obj, new CallBack() {
                                                @Override
                                                public void onSuccess(Object object) {
                                                    showToast("" + object.toString());
                                                    mAdapter.removeAt(position);
                                                }

                                                @Override
                                                public void onError(Object object) {
                                                    showToast("" + object.toString());
                                                }
                                            });
                                        }
                                    }));
                                    showWarningDialog(config);
                                }
                            }
                        });

                        if (itemList.isEmpty()) {
                            recyclerView.setVisibility(View.GONE);
                            cf_container.setVisibility(View.VISIBLE);
                        } else {
                            recyclerView.setVisibility(View.VISIBLE);
                            cf_container.setVisibility(View.GONE);
                        }
                    } else {
                        recyclerView.setVisibility(View.GONE);
                        cf_container.setVisibility(View.VISIBLE);
                    }
                }

                @Override
                public void onError(Object object) {
                    LogUtility.d(LogUtility.TAG, "readAllProgramByRadioId error: " + new Gson().toJson(object));
                }
            });
    }

    void initAdapter() {
        //This is the code to provide a sectioned list
        List<SimpleSectionedRecyclerViewAdapter.Section> sections =
                new ArrayList<SimpleSectionedRecyclerViewAdapter.Section>();

        //Sections
//        sections.add(new SimpleSectionedRecyclerViewAdapter.Section(0,"Section 1"));
//        sections.add(new SimpleSectionedRecyclerViewAdapter.Section(5,"Section 2"));
//        sections.add(new SimpleSectionedRecyclerViewAdapter.Section(12,"Section 3"));
//        sections.add(new SimpleSectionedRecyclerViewAdapter.Section(14,"Section 4"));
//        sections.add(new SimpleSectionedRecyclerViewAdapter.Section(20,"Section 5"));

//       itemList.removeAll(Collections.singleton(null));
//       itemList.removeAll(Collections.singleton(RadioProgram.class));
//       itemList.removeAll(Collections.singleton(new ArrayList<>()));
//       FmUtilize.removeNulls(new ArrayList<RadioProgram>(itemList));
//       List<String> idList = itemList.stream().map(RadioProgram::getProgramId).collect(Collectors.toList());

//       ArrayList<RadioProgram> itemLists  = new ArrayList<RadioProgram>(itemList);
//       ImmutableList.copyOf(Iterables.filter(itemList, Predicates.notNull()));

//       Arrays.fill(itemList, Arrays.asList(new RadioProgram()));
//       List<RadioProgram> x = new ArrayList<RadioProgram>(Arrays.asList(new RadioProgram()));
        HashMap<String, ArrayList<RadioProgram>> myProgram = new HashMap<String, ArrayList<RadioProgram>>();
        for (int i = 0; i < itemList.size(); i++) {
            if (itemList.get(i).getDateTimeModel() != null) {
                String month_name = month_date.format(Tools.getDateFormat(itemList.get(i).getDateTimeModel().getDateStart()));
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


        mAdapter = new AdapterListProgram(ctx, itemList, R.layout.item_programs);

        //Add your adapter to the sectionAdapter
        SimpleSectionedRecyclerViewAdapter.Section[] dummy = new SimpleSectionedRecyclerViewAdapter.Section[sections.size()];
        SimpleSectionedRecyclerViewAdapter mSectionedAdapter = new
                SimpleSectionedRecyclerViewAdapter(ctx, R.layout.layout_section, R.id.section_text, mAdapter);
        mSectionedAdapter.setSections(sections.toArray(dummy));

        recyclerView.setAdapter(mSectionedAdapter);

    }

    @Override
    public void onAttach(@NonNull Context context) {
        super.onAttach(context);
        this.ctx = context;
    }

    @Override
    public void onDetach() {
        super.onDetach();
    }

    public void refresh() {
        initComponent();
    }


    private ArrayList<Map<String, String>> keyList;
    private Map<String, List<RadioProgram>> map;

    private void initList() {
        map = new HashMap<>();
        keyList = new ArrayList<>();
    }

//    SimpleDateFormat month_date = new SimpleDateFormat("MMMM",_arabicFormat);
//    String month_name = month_date.format(cal.getTime());

    private void getPhotoList(ArrayList<RadioProgram> arrayList) {

//        for (Episode string : photoList) {
//            String month_name = month_date.format(Tools.getDateFormat(string.getDateTimeModel().getDateStart()));
//            Map<String, String> map = new HashMap<String, String>();
//            map.put("key", String.valueOf(string.getDateTimeModel().getDateStart()));
//            map.put("value",month_name);
//            if (!keyList.contains(string.getDate()))
//            keyList.add(map);
//             else;
//        }

        HashMap<String, ArrayList<RadioProgram>> myProgram = new HashMap<String, ArrayList<RadioProgram>>();
        for (int i = 0; i < arrayList.size(); i++) {
            String month_name = month_date.format(Tools.getDateFormat(arrayList.get(i).getDateTimeModel().getDateStart()));
            ArrayList<RadioProgram> programList = myProgram.get(month_name);
            if (programList == null) {
                programList = new ArrayList<RadioProgram>();
                myProgram.put(month_name, programList);
            }
            RadioProgram p = arrayList.get(i);
            programList.add(p);
        }


        for (Map<String, String> s : keyList) {
            ArrayList<RadioProgram> photos = new ArrayList<>();
            long count = s.containsKey("key") ? Long.parseLong(s.get("key")) : 0;
            for (RadioProgram s1 : arrayList) {
                if (s1.getDateTimeModel().getDateStart() == count)
                    photos.add(s1);
                else ;
            }
            map.put(s.get("value"), photos);
        }
        Log.d(TAG, "map " + map.toString());

    }
}