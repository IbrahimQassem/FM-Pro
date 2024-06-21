package com.sana.dev.fm.ui.fragment;


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

import com.google.firebase.firestore.CollectionReference;
import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.AdapterMainProgram;
import com.sana.dev.fm.adapter.SimpleSectionedRecyclerViewAdapter;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.UserType;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.model.interfaces.OnItemLongClick;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.ui.activity.ProgramDetailsActivity;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQuery;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreQueryConditionCode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * A simple {@link Fragment} subclass.
 * Use the {@link ProgramsFragment} factory method to
 * create an instance of this fragment.
 */
public class ProgramsFragment extends BaseFragment {
    private static final String TAG = ProgramsFragment.class.getSimpleName();

    // the fragment initialization parameters, e.g. ARG_ITEM_NUMBER
//    private static final String ARG_RADIO_ID = "radioId";
//    private static final String ARG_RADIO_LIST = "radioList";

//    private String radioId;

    /**
     * Use this factory method to create a new instance of
     * this fragment using the provided parameters.
     *
     * @param radioId Parameter 1.
     * @param list    Parameter 2.
     * @return A new instance of fragment ProgramsFragment.
     */
//    public static ProgramsFragment newInstance(String radioId, List<RadioProgram> list) {
//        ProgramsFragment fragment = new ProgramsFragment();
//        // Don't include arguments unless uuid != null
//
//        if (list != null) {
//            Bundle args = new Bundle();
//            args.putString(ARG_RADIO_ID, radioId);
//            args.putSerializable(ARG_RADIO_LIST, (Serializable) list);
//            fragment.setArguments(args);
//        }
//        return fragment;
//    }

    @BindView(R.id.recyclerView)
    RecyclerView recyclerView;
    @BindView(R.id.child_fragment_container)
    FrameLayout cf_container;
    @BindView(R.id.tvTittle)
    TextView tvTittle;

    View parent_fragment_view;
    private AdapterMainProgram mAdapter;
    private List<RadioProgram> itemList = new ArrayList<>();
    private FirestoreDbUtility firestoreDbUtility;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
//        if (getArguments() != null) {
//            radioId = getArguments().getString(ARG_RADIO_ID);
//            itemList = (List<RadioProgram>) getArguments().getSerializable(ARG_RADIO_LIST);
//        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        parent_fragment_view = inflater.inflate(R.layout.fragment_programs, container, false);
        ButterKnife.bind(this, parent_fragment_view);
        firestoreDbUtility = new FirestoreDbUtility();
        initComponent();

//        itemList = DataGenerator.getProgramData(ctx);
////        List<Episode> list = DataGenerator.getEpisodeData(ctx);
//////        AdapterListInbox adapterListInbox = new AdapterListInbox(ctx, list);
////
//        mAdapter = new AdapterMainProgram(ctx, itemList, R.layout.item_programs);
////        recyclerView.setAdapter(mAdapter);
////        recyclerView.setLayoutManager(new LinearLayoutManager(requireContext()));
//
//        // Removes blinks
//        ((SimpleItemAnimator) recyclerView.getItemAnimator()).setSupportsChangeAnimations(false);
//
//        // Standard setup
//        recyclerView.setLayoutManager(new LinearLayoutManager(requireContext()));
//        recyclerView.setAdapter(mAdapter);
//        recyclerView.setHasFixedSize(true);

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
        if (selectedRadio != null) {
            try {

                SpannableStringBuilder builder = new SpannableStringBuilder();

                String primary = (selectedRadio != null && selectedRadio.getName() != null) ? selectedRadio.getName() : " ";
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

            List<FirestoreQuery> firestoreQueryList = new ArrayList<>();
            firestoreQueryList.add(new FirestoreQuery(
                    FirestoreQueryConditionCode.WHERE_EQUAL_TO,
                    "radioId",
                    selectedRadio.getRadioId()
            ));

            firestoreQueryList.add(new FirestoreQuery(
                    FirestoreQueryConditionCode.WHERE_EQUAL_TO,
                    "disabled",
                    false
            ));

//             FirebaseFirestore DATABASE = FirebaseFirestore.getInstance();
//            CollectionReference colRef =  DATABASE.collection(AppConstant.Firebase.RADIO_PROGRAM_TABLE).document(selectedRadio.getRadioId()).collection(RADIO_PROGRAM_TABLE);
            firestoreDbUtility.getMany(firestoreDbUtility.getCollectionReference(AppConstant.Firebase.RADIO_PROGRAM_TABLE, selectedRadio.getRadioId()), firestoreQueryList, new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    List<RadioProgram> programList = FirestoreDbUtility.getDataFromQuerySnapshot(object, RadioProgram.class);

                    if (!programList.isEmpty()) {
                        itemList = programList;
//                      itemList =  DataGenerator.getProgramData(ctx);
                        initAdapter();

                        mAdapter.setOnItemClickListener(new OnClickListener() {
                            @Override
                            public void onItemClick(View view, Object obj, int position) {
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
                        });

                        mAdapter.setOnLongItemClickListener(new OnItemLongClick() {
                            @Override
                            public void onItemLongClick(View view, Object obj, int position) {
                                RadioProgram item = (RadioProgram) obj;
                                if (ProgramsFragment.this.isAccountSignedIn() && prefMgr.getUserSession().getUserType() == UserType.SuperADMIN) {
                                    ModelConfig config = new ModelConfig(R.drawable.ic_warning, getString(R.string.label_warning), getString(R.string.confirm_delete, item.getPrName()), new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                                        @Override
                                        public void onClick(View v) {

                                            CollectionReference collectionRef = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.RADIO_PROGRAM_TABLE, selectedRadio.getRadioId());
                                            firestoreDbUtility.deleteDocument(collectionRef, item.getProgramId(), new CallBack() {
                                                @Override
                                                public void onSuccess(Object object) {
                                                    showToast(getString(R.string.deleted_successfully_with_param, item.getPrName()));
//                                                    mAdapter.removeAt(position);
                                                    itemList.remove(position);
                                                    mAdapter.notifyDataSetChanged();
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
                        });

                        toggleView(itemList.isEmpty());

                    } else {
                        toggleView(true);
                    }
                }

                @Override
                public void onFailure(Object object) {
                    LogUtility.e(TAG, " loadRadioProgram :  " + object);
                }
            });
        } else {
//            showToast(getString(R.string.msg_you_must_select_radio_station));
            toggleView(true);
        }

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
//        recyclerView.setAdapter(mAdapter);

        //  showToast(itemList.size() + "");

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


    private ArrayList<Map<String, String>> keyList = new ArrayList<>();
    private Map<String, List<RadioProgram>> map = new HashMap<>();

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
            String month_name = FmUtilize.month_date.format(Tools.getDateFormat(arrayList.get(i).getProgramScheduleTime().getDateStart()));
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
                if (s1.getProgramScheduleTime().getDateStart() == count)
                    photos.add(s1);
                else ;
            }
            map.put(s.get("value"), photos);
        }
        Log.d(TAG, "map " + map.toString());
    }

    void toggleView(boolean hide) {
        recyclerView.setVisibility(!hide ? View.VISIBLE : View.GONE);
        cf_container.setVisibility(hide ? View.VISIBLE : View.GONE);
    }

}