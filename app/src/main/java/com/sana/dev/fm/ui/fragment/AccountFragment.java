package com.sana.dev.fm.ui.fragment;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.widget.SwitchCompat;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.card.MaterialCardView;
import com.sana.dev.fm.R;
import com.sana.dev.fm.core.auth.AccountDeletionCoordinator;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.model.enums.UserType;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;

public class AccountFragment extends BaseFragment {

    private ImageView ivAvatar;
    private TextView tvName;
    private TextView tvStatus;
    private MaterialButton btnAuth;
    private MaterialCardView cardAdminPanel;
    private LinearLayout rowPrivacy;
    private LinearLayout rowShareApp;
    private View dividerDeleteAccount;
    private LinearLayout rowDeleteAccount;
    private SwitchCompat switchNotifications;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_account, container, false);

        ivAvatar = view.findViewById(R.id.iv_account_avatar);
        tvName = view.findViewById(R.id.tv_account_name);
        tvStatus = view.findViewById(R.id.tv_account_status);
        btnAuth = view.findViewById(R.id.btn_account_auth);
        cardAdminPanel = view.findViewById(R.id.card_admin_panel);
        rowPrivacy = view.findViewById(R.id.row_privacy);
        rowShareApp = view.findViewById(R.id.row_share_app);
        dividerDeleteAccount = view.findViewById(R.id.divider_delete_account);
        rowDeleteAccount = view.findViewById(R.id.row_delete_account);
        switchNotifications = view.findViewById(R.id.switch_notifications);

        initViews();
        return view;
    }

    @Override
    public void onResume() {
        super.onResume();
        updateUserState();
    }

    private void initViews() {
        btnAuth.setOnClickListener(v -> {
            if (isAccountSignedIn()) {
                if (mActivity instanceof MainActivity) {
                    ((MainActivity) mActivity).checkUserLogin();
                }
            } else {
                if (mActivity instanceof MainActivity) {
                    ((MainActivity) mActivity).checkUserLogin();
                }
            }
        });

        rowPrivacy.setOnClickListener(v -> {
            String url = getString(R.string.terms_reference);
            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(browserIntent);
        });

        rowShareApp.setOnClickListener(v -> {
            if (mActivity != null) {
                FmUtilize.shareApp(mActivity);
            }
        });

        if (rowDeleteAccount != null) {
            rowDeleteAccount.setOnClickListener(v -> showDeleteAccountConfirmation());
        }

        cardAdminPanel.setOnClickListener(v -> {
            if (mActivity instanceof MainActivity) {
                ((MainActivity) mActivity).openAdminPanelIfAuthorized();
            }
        });

        updateUserState();
    }

    private void showDeleteAccountConfirmation() {
        if (getContext() == null) return;

        new androidx.appcompat.app.AlertDialog.Builder(getContext())
                .setTitle(R.string.delete_account_confirm_title)
                .setMessage(R.string.delete_account_confirm_message)
                .setPositiveButton(R.string.delete_account_confirm_button, (dialog, which) -> executeAccountDeletion())
                .setNegativeButton(R.string.label_cancel, (dialog, which) -> dialog.dismiss())
                .show();
    }

    private void executeAccountDeletion() {
        if (getContext() == null) return;

        AccountDeletionCoordinator.deleteAccount(getContext(), (result, errorMessage) -> {
            if (result == AccountDeletionCoordinator.DeletionResult.SUCCESS) {
                showToast(getString(R.string.delete_account_success));
                updateUserState();
            } else if (result == AccountDeletionCoordinator.DeletionResult.REAUTH_REQUIRED) {
                showToast(getString(R.string.delete_account_reauth_required));
                if (mActivity instanceof MainActivity) {
                    ((MainActivity) mActivity).checkUserLogin();
                }
            } else {
                showToast(errorMessage != null ? errorMessage : getString(R.string.label_error_occurred));
            }
        });
    }

    private void updateUserState() {
        if (isAccountSignedIn()) {
            UserModel user = prefMgr.getUserSession();
            if (user != null) {
                tvName.setText(user.getName() != null && !user.getName().isEmpty() ? user.getName() : getString(R.string.user_account));
                tvStatus.setText(user.getEmail() != null && !user.getEmail().isEmpty() ? user.getEmail() : getString(R.string.label_online));
                btnAuth.setText(R.string.logout);

                if (!Tools.isEmpty(user.getPhotoUrl()) && getContext() != null) {
                    Tools.displayUserProfile(getContext(), ivAvatar, user.getPhotoUrl(), R.drawable.ic_account_circle);
                }

                boolean isAdmin = user.getUserType() == UserType.SuperADMIN;
                cardAdminPanel.setVisibility(isAdmin ? View.VISIBLE : View.GONE);
                if (dividerDeleteAccount != null) dividerDeleteAccount.setVisibility(View.VISIBLE);
                if (rowDeleteAccount != null) rowDeleteAccount.setVisibility(View.VISIBLE);
            }
        } else {
            tvName.setText(R.string.login_anonymous_status);
            tvStatus.setText(R.string.offline);
            btnAuth.setText(R.string.login);
            cardAdminPanel.setVisibility(View.GONE);
            if (dividerDeleteAccount != null) dividerDeleteAccount.setVisibility(View.GONE);
            if (rowDeleteAccount != null) rowDeleteAccount.setVisibility(View.GONE);
        }
    }
}
