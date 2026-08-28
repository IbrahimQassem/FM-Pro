package com.sana.dev.fm.ui.dialog;

import static android.view.View.GONE;
import static android.view.View.VISIBLE;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.databinding.ViewDataBinding;

import com.google.android.material.button.MaterialButton;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.DialogHeaderBinding;
import com.sana.dev.fm.databinding.DialogWarningBinding;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;

public class FmGeneralDialog extends Dialog {
    public static final int VIEW_WARNING = 0;
    public static final int VIEW_INFO = 1;

    private final Context context;
    private final ModelConfig config;
    private ViewDataBinding bindingType;

    public FmGeneralDialog(@NonNull Context context, ModelConfig config) {
        super(context);
        this.context = context;
        this.config = config;
    }

    @Override
    public void show() {
        try {
            if (context instanceof Activity && ((Activity) context).isFinishing()) {
                return;
            }
            Window window = getWindow();
            if (window != null) {
                window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
                WindowManager.LayoutParams lp = new WindowManager.LayoutParams();
                lp.copyFrom(window.getAttributes());
                lp.width = WindowManager.LayoutParams.MATCH_PARENT;
                lp.height = WindowManager.LayoutParams.WRAP_CONTENT;
                lp.dimAmount = 0.55f;
                lp.flags |= WindowManager.LayoutParams.FLAG_DIM_BEHIND;
                window.setAttributes(lp);
                window.getAttributes().windowAnimations = R.style.PauseDialogAnimation;
            }
            super.show();
        } catch (Exception e) {
            LogUtility.e(LogUtility.tag(FmGeneralDialog.class), "Error displaying FmGeneralDialog: " + e.getMessage());
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        if (VIEW_INFO == config.getViewType()) {
            bindingType = DialogHeaderBinding.inflate(LayoutInflater.from(getContext()));
        } else {
            bindingType = DialogWarningBinding.inflate(LayoutInflater.from(getContext()));
        }

        setContentView(bindingType.getRoot());
        setCancelable(config.isCancellable());
        setCanceledOnTouchOutside(config.isCancellable());

        if (bindingType instanceof DialogHeaderBinding) {
            DialogHeaderBinding binding = (DialogHeaderBinding) bindingType;
            bindViews(
                    binding.flIconContainer,
                    binding.ivImage,
                    binding.tvTitle,
                    binding.tvDesc,
                    binding.lytActions,
                    binding.btCancel,
                    binding.btConfirm
            );
        } else if (bindingType instanceof DialogWarningBinding) {
            DialogWarningBinding binding = (DialogWarningBinding) bindingType;
            bindViews(
                    binding.flIconContainer,
                    binding.ivImage,
                    binding.tvTitle,
                    binding.tvDesc,
                    binding.lytActions,
                    binding.btCancel,
                    binding.btConfirm
            );
        }
    }

    private void bindViews(
            FrameLayout flIconContainer,
            ImageView ivImage,
            TextView tvTitle,
            TextView tvDesc,
            LinearLayout lytActions,
            MaterialButton btCancel,
            MaterialButton btConfirm
    ) {
        // 1. Icon & Container
        if (config.getIcon() < 1) {
            if (flIconContainer != null) flIconContainer.setVisibility(GONE);
            if (ivImage != null) ivImage.setVisibility(GONE);
        } else {
            if (flIconContainer != null) {
                flIconContainer.setVisibility(VISIBLE);
                // Apply semantic container styling
                int containerColorRes = (config.getViewType() == VIEW_WARNING)
                        ? R.color.md_theme_warningContainer
                        : R.color.md_theme_primaryContainer;
                int iconColorRes = (config.getViewType() == VIEW_WARNING)
                        ? R.color.md_theme_warning
                        : R.color.md_theme_primary;

                GradientDrawable shape = new GradientDrawable();
                shape.setShape(GradientDrawable.RECTANGLE);
                shape.setCornerRadius(context.getResources().getDimension(R.dimen.corner_radius_lg));
                shape.setColor(ContextCompat.getColor(context, containerColorRes));
                flIconContainer.setBackground(shape);

                if (ivImage != null) {
                    ivImage.setVisibility(VISIBLE);
                    ivImage.setImageResource(config.getIcon());
                    ivImage.setColorFilter(ContextCompat.getColor(context, iconColorRes));
                }
            } else if (ivImage != null) {
                ivImage.setVisibility(VISIBLE);
                ivImage.setImageResource(config.getIcon());
            }
        }

        // 2. Title & Description
        Tools.setTextOrHideIfEmpty(tvTitle, config.getTitle());
        Tools.setTextOrHideIfEmpty(tvDesc, config.getDesc());

        // 3. Action Buttons Configuration
        ButtonConfig confirmConfig = config.getBtnConfirm();
        ButtonConfig cancelConfig = config.getBtnCancel();

        boolean hasConfirm = confirmConfig != null && !Tools.isEmpty(confirmConfig.getName());
        boolean hasCancel = cancelConfig != null && !Tools.isEmpty(cancelConfig.getName());

        if (!hasConfirm && !hasCancel) {
            if (lytActions != null) lytActions.setVisibility(GONE);
            return;
        }

        if (lytActions != null) lytActions.setVisibility(VISIBLE);

        // Single button vs Dual buttons margin adjustment for responsive balance
        int marginXs = (int) context.getResources().getDimension(R.dimen.spacing_xs);

        if (hasConfirm && hasCancel) {
            // Dual button layout: equal weights with spacing
            configureButton(btConfirm, confirmConfig, marginXs, 0);
            configureButton(btCancel, cancelConfig, 0, marginXs);
        } else if (hasConfirm) {
            // Single confirm button (e.g. Force Update): full width prominent action
            configureButton(btConfirm, confirmConfig, 0, 0);
            if (btCancel != null) btCancel.setVisibility(GONE);
        } else {
            // Single cancel/dismiss button
            configureButton(btCancel, cancelConfig, 0, 0);
            if (btConfirm != null) btConfirm.setVisibility(GONE);
        }
    }

    private void configureButton(MaterialButton button, ButtonConfig buttonConfig, int marginStart, int marginEnd) {
        if (button == null) return;
        button.setVisibility(VISIBLE);
        button.setText(buttonConfig.getName());

        if (buttonConfig.getTextColor() != -1) {
            button.setTextColor(buttonConfig.getTextColor());
        }

        LinearLayout.LayoutParams params = (LinearLayout.LayoutParams) button.getLayoutParams();
        if (params != null) {
            params.setMarginStart(marginStart);
            params.setMarginEnd(marginEnd);
            button.setLayoutParams(params);
        }

        button.setOnClickListener(v -> {
            dismiss();
            if (buttonConfig.getOnClickListener() != null) {
                buttonConfig.getOnClickListener().onClick(v);
            }
        });
    }
}
