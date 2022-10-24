package com.sana.dev.fm.ui.fragment;

import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.sana.dev.fm.databinding.FragmentNoiternetViewBinding;
import com.sana.dev.fm.model.interfaces.CallBackListener;
import com.sana.dev.fm.utils.FmUtilize;

/**
 * A simple {@link Fragment} subclass.
 * Use the {@link EmptyViewFragment#newInstance} factory method to
 * create an instance of this fragment.
 */
public class EmptyViewFragment extends Fragment {

    public static final String ARG_TITLE = "ARG_TITLE";
    public static final String ARG_DETAILS = "ARG_DETAILS";
    public static final String ARG_BTN_LABEL = "ARG_BTN_LABEL";

    private FragmentNoiternetViewBinding binding;
    Context ctx;
    private String title_label, details_label, btn_label;
    private CallBackListener callBackListener;

    public void setOnItemClickListener(CallBackListener callBackListener) {
        this.callBackListener = callBackListener;
    }


    public static EmptyViewFragment newInstance(String title, String desc, String btnLAbel) {
        EmptyViewFragment fragment = new EmptyViewFragment();
        Bundle args = new Bundle();
        args.putString(ARG_TITLE, title);
        args.putString(ARG_DETAILS, desc);
        args.putString(ARG_BTN_LABEL, btnLAbel);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            title_label = getArguments().getString(ARG_TITLE);
            details_label = getArguments().getString(ARG_DETAILS);
            btn_label = getArguments().getString(ARG_BTN_LABEL);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        binding = FragmentNoiternetViewBinding.inflate(LayoutInflater.from(getContext()));
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        ctx = getActivity();

        binding.linearlayout.setVisibility(View.VISIBLE);

        FmUtilize.hideEmptyElement(title_label, binding.tvNoteTitle);
        FmUtilize.hideEmptyElement(details_label, binding.tvNoteDetails);

        if (!TextUtils.isEmpty(btn_label)) {
            binding.btnClick.setText(btn_label);
        }else {
            binding.btnClick.setVisibility(View.GONE);
        }

        binding.progressBar.setVisibility(View.GONE);
        binding.linearlayout.setVisibility(View.VISIBLE);

    /*    binding.linearlayout.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(final View v) {
                triggerEvent();
            }
        });*/

        binding.btnClick.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                triggerEvent();
            }
        });
    }

    private void triggerEvent() {
        binding.progressBar.setVisibility(View.VISIBLE);
        binding.linearlayout.setVisibility(View.GONE);

        new Handler().postDelayed(new Runnable() {
            @Override
            public void run() {
                binding.progressBar.setVisibility(View.GONE);
                binding.linearlayout.setVisibility(View.VISIBLE);
                if (callBackListener != null)
                    callBackListener.onCallBack();
            }
        }, 500);
    }


    @Override
    public void onActivityCreated(@Nullable Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);
        //getActivity() is fully created in onActivityCreated and instanceOf differentiate it between different Activities
//        if (getActivity() instanceof CallBackListener)
//            callBackListener = (CallBackListener) getActivity();
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

}