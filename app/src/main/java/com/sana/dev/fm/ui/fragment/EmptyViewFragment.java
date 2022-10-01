package com.sana.dev.fm.ui.fragment;

import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.widget.AppCompatButton;
import androidx.fragment.app.Fragment;

import com.sana.dev.fm.R;
import com.sana.dev.fm.ui.activity.MainActivity;

import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * A simple {@link Fragment} subclass.
 * Use the {@link EmptyViewFragment#newInstance} factory method to
 * create an instance of this fragment.
 */
public class EmptyViewFragment extends Fragment {

    // TODO: Rename parameter arguments, choose names that match
    // the fragment initialization parameters, e.g. ARG_ITEM_NUMBER
    public static final String ARG_NOTE_TITLE = "Note_Title";
    public static final String ARG_NOTE_DETAILS = "NOTE_Details";
    View view;
    private String _details;
    Context ctx;
    @BindView(R.id.linearlayout)
    LinearLayout linearlayout;

    //    private CallBackListener callBackListener;
    @BindView(R.id.tv_note_title)
    TextView tv_note_title;
    @BindView(R.id.tv_note_details)
    TextView tv_note_details;
    //    ProgressBar progress_bar;
//    AppCompatButton bt_action;
//    @BindView(R.id.btn_click)
//    AppCompatButton btn_click;
    // TODO: Rename and change types of parameters
    private String _title;


    public EmptyViewFragment() {
        // Required empty public constructor
    }

    /**
     * Use this factory method to create a new instance of
     * this fragment using the provided parameters.
     *
     * @param param1 Parameter 1.
     * @param param2 Parameter 2.
     * @return A new instance of fragment EmpyViewFragment.
     */
    // TODO: Rename and change types and number of parameters
    public static EmptyViewFragment newInstance(String param1, String param2) {
        EmptyViewFragment fragment = new EmptyViewFragment();
        Bundle args = new Bundle();
        args.putString(ARG_NOTE_TITLE, param1);
        args.putString(ARG_NOTE_DETAILS, param2);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            _title = getArguments().getString(ARG_NOTE_TITLE);
            _details = getArguments().getString(ARG_NOTE_DETAILS);
        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
//        return inflater.inflate(R.layout.fragment_no_item_tabs, container, false);
        view = inflater.inflate(R.layout.fragment_noiternet_view, container, false);
        ButterKnife.bind(this, view);

        linearlayout.setVisibility(View.VISIBLE);
        tv_note_title.setText(_title);
        tv_note_title.setVisibility(_title != null ? View.VISIBLE : View.GONE);
        tv_note_details.setText(_details);
        tv_note_details.setVisibility(_details != null ? View.VISIBLE : View.GONE);


        return view;
    }


    @Override
    public void onActivityCreated(@Nullable Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);
        //getActivity() is fully created in onActivityCreated and instanceOf differentiate it between different Activities
//        if (getActivity() instanceof CallBackListener)
//            callBackListener = (CallBackListener) getActivity();
    }

    @Override
    public void onViewCreated(View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        AppCompatButton btn = view.findViewById(R.id.btn_click);
        btn.setVisibility(_title != null ? View.VISIBLE : View.GONE);
        btn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
//                if(callBackListener != null)
//                    callBackListener.onCallBack();
                ((MainActivity) getActivity()).selectTab(R.id.navigation_home); // 1 for GamesFragment
            }
        });
    }

    @Override
    public void onAttach(Context context) {
        super.onAttach(context);
        this.ctx = context;
//        if (context instanceof CallBackListener) {
//            callBackListener = (CallBackListener) context;
//        } else {
//            throw new RuntimeException(context.toString()
//                    + " must implement CallBackListener");
//        }
    }

    @Override
    public void onDetach() {
        super.onDetach();
//        callBackListener = null;
    }

//    public interface CallBackListener {
//        void onCallBack();// pass any parameter in your onCallBack which you want to return
//    }
}