package com.sana.dev.fm.ui.dialog;

import static android.view.View.VISIBLE;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

import androidx.annotation.NonNull;
import androidx.databinding.ViewDataBinding;

import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.DialogHeaderBinding;
import com.sana.dev.fm.databinding.DialogWarningBinding;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;

public class FmGeneralDialog extends Dialog {
    public static int VIEW_WARNING = 0;
    public static int VIEW_INFO = 1;
//        public DialogWarning instance;

    private Context context;
    private ModelConfig config;
    private ViewDataBinding bindingType;

//        public DialogWarning getInstance(Context context) {
//            if (instance == null) {
//                instance = new DialogWarning(context, VIEW_WARNING);
//            }
//            return instance;
//        }


    public FmGeneralDialog(@NonNull Context context, ModelConfig config) {
        super(context);
        this.context = context;
        this.config = config;
    }

    @Override
    public void show() {
        try {
            if (!((Activity) context).isFinishing()) {
                getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
                WindowManager.LayoutParams lp = new WindowManager.LayoutParams();
                lp.copyFrom(getWindow().getAttributes());
                lp.width = WindowManager.LayoutParams.MATCH_PARENT;
                lp.height = WindowManager.LayoutParams.MATCH_PARENT;
                getWindow().setAttributes(lp);
                getWindow().getAttributes().windowAnimations = R.style.PauseDialogAnimation;
                super.show();
            } else {
//                instance = null;
            }
        } catch (Exception e) {
            LogUtility.e(LogUtility.tag(FmGeneralDialog.class), e.getMessage());
        }
    }


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
//            DialogWarningBinding binding = DialogWarningBinding.inflate(LayoutInflater.from(getContext()));

        if (VIEW_INFO == config.getViewType()) {
            bindingType = DialogHeaderBinding.inflate(LayoutInflater.from(getContext()));
        } else if (VIEW_WARNING == config.getViewType()) {
            bindingType = DialogWarningBinding.inflate(LayoutInflater.from(getContext()));
        }

        setContentView(bindingType.getRoot());
        setCancelable(config.isCancellable());

        if (bindingType instanceof DialogHeaderBinding) {
            DialogHeaderBinding binding = (DialogHeaderBinding) bindingType;

            if (config.getIcon() < 1) {
                binding.ivImage.setVisibility(View.GONE);
            } else {
                binding.ivImage.setVisibility(View.VISIBLE);
                binding.ivImage.setImageResource(config.getIcon());

            }

            Tools.setTextOrHideIfEmpty( binding.tvTitle,config.getTitle());
            Tools.setTextOrHideIfEmpty( binding.tvDesc,config.getDesc());

            boolean isBtConfirm = (config.getBtnConfirm() != null ? config.getBtnConfirm().getName() : null) != null;
            binding.btConfirm.setVisibility(isBtConfirm ? VISIBLE : View.GONE);
            if (isBtConfirm) {
                binding.btConfirm.setText(config.getBtnConfirm().getName());
                binding.btConfirm.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        dismiss();
                        if (config.getBtnConfirm().getOnClickListener() != null)
                            config.getBtnConfirm().getOnClickListener().onClick(v);
                    }
                });
            }

            boolean isBtCancel = (config.getBtnCancel() != null ? config.getBtnCancel().getName() : null) != null;
            binding.btCancel.setVisibility(isBtCancel ? VISIBLE : View.GONE);
            if (isBtCancel) {
                binding.btCancel.setText(config.getBtnCancel().getName());
            }

            binding.btCancel.setOnClickListener(v -> {
                dismiss();
                if (config.getBtnCancel().getOnClickListener() != null)
                    config.getBtnCancel().getOnClickListener().onClick(v);
            });
        } else if (bindingType instanceof DialogWarningBinding) {
            DialogWarningBinding binding = (DialogWarningBinding) bindingType;

            if (config.getIcon() < 1) {
                binding.ivImage.setVisibility(View.GONE);
            } else {
                binding.ivImage.setVisibility(View.VISIBLE);
                binding.ivImage.setImageResource(config.getIcon());

            }

            Tools.setTextOrHideIfEmpty( binding.tvTitle,config.getTitle());
            Tools.setTextOrHideIfEmpty( binding.tvDesc,config.getDesc());

            boolean isBtConfirm = (config.getBtnConfirm() != null ? config.getBtnConfirm().getName() : null) != null;
            binding.btConfirm.setVisibility(isBtConfirm ? VISIBLE : View.GONE);
            if (isBtConfirm) {
                binding.btConfirm.setText(config.getBtnConfirm().getName());
                binding.btConfirm.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        dismiss();
                        if (config.getBtnConfirm().getOnClickListener() != null)
                            config.getBtnConfirm().getOnClickListener().onClick(v);
                    }
                });
            }

            boolean isBtCancel = (config.getBtnCancel() != null ? config.getBtnCancel().getName() : null) != null;
            binding.btCancel.setVisibility(isBtCancel ? VISIBLE : View.GONE);
            if (isBtCancel) {
                binding.btCancel.setText(config.getBtnCancel().getName());
            }

            binding.btCancel.setOnClickListener(v -> {
                dismiss();
                if (config.getBtnCancel().getOnClickListener() != null)
                    config.getBtnCancel().getOnClickListener().onClick(v);
            });
        }


    }


}
