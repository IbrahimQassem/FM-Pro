///*
// * Copyright 2018 Rozdoum
// *
// *    Licensed under the Apache License, Version 2.0 (the "License");
// *    you may not use this file except in compliance with the License.
// *    You may obtain a copy of the License at
// *
// *        http://www.apache.org/licenses/LICENSE-2.0
// *
// *    Unless required by applicable law or agreed to in writing, software
// *    distributed under the License is distributed on an "AS IS" BASIS,
// *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// *    See the License for the specific language governing permissions and
// *    limitations under the License.
// */
//
package com.sana.dev.fm.ui.fragment;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.view.View;
import android.view.inputmethod.InputMethodManager;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentActivity;

import com.dd.CircularProgressButton;
import com.google.firebase.auth.FirebaseAuth;
import com.sana.dev.fm.model.interfaces.BaseFragmentView;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.UserGuide;

import java.util.Objects;

/**
 * Created by Admin on 08.05.18.
 */

public abstract class BaseFragment extends Fragment implements BaseFragmentView {

    protected FragmentActivity mActivity;
    protected UserGuide userGuide;
    protected PreferencesManager prefMng;

    public void showProgress() {
        ((BaseActivity) mActivity).showProgress();
    }

    @Override
    public void showProgress(int message) {
        ((BaseActivity) mActivity).showProgress(message);
    }

    public void hideProgress() {
        ((BaseActivity) mActivity).hideProgress();
//                        if (mContext instanceof BaseActivity) {
//                    ((BaseActivity) mContext).showLikedSnackbar(feedItems.get(adapterPosition));
//                }
    }

    @Override
    public void showSnackBar(String message) {
        ((BaseActivity) Objects.requireNonNull(mActivity)).showSnackBar(message);
    }

    @Override
    public void showSnackBar(int message) {
        ((BaseActivity) mActivity).showSnackBar(message);
    }

    @Override
    public void showSnackBar(View view, int messageId) {
        ((BaseActivity) mActivity).showSnackBar(view, messageId);
    }

    @Override
    public void showToast(int messageId) {
        ((BaseActivity) mActivity).showToast(messageId);
    }

    @Override
    public void showToast(String message) {
        ((BaseActivity) mActivity).showToast(message);
    }

    @Override
    public void showWarningDialog(int messageId) {
        ((BaseActivity) mActivity).showWarningDialog(messageId);
    }

    @Override
    public void showWarningDialog(String message) {
        ((BaseActivity) getActivity()).showWarningDialog(message);
    }

    @Override
    public void showNotCancelableWarningDialog(String message) {
        ((BaseActivity) getActivity()).showNotCancelableWarningDialog(message);
    }

    @Override
    public void showWarningDialog(int messageId, DialogInterface.OnClickListener listener) {
        ((BaseActivity) getActivity()).showWarningDialog(messageId, listener);
    }

    @Override
    public void showWarningDialog(String message, DialogInterface.OnClickListener listener) {
        ((BaseActivity) getActivity()).showWarningDialog(message, listener);
    }

    @Override
    public void showWarningDialog(String message, String desc) {
        ((BaseActivity) getActivity()).showWarningDialog(message, desc);
    }


    @Override
    public void showNotCancelableWarningDialog(String message, String desc, View.OnClickListener listener) {
        ((BaseActivity) getActivity()).showNotCancelableWarningDialog(message, desc, listener);
    }

    @Override
    public void showNotCancelableWarningDialog(String message, String desc, View.OnClickListener cancelListener, View.OnClickListener okListener) {
        ((BaseActivity) getActivity()).showNotCancelableWarningDialog(message, desc, cancelListener,okListener);
    }

    @Override
    public boolean hasInternetConnection() {
        return ((BaseActivity) getActivity()).hasInternetConnection();
    }

    @Override
    public void startLoginActivity() {
        ((BaseActivity) getActivity()).startLoginActivity();
    }

    @Override
    public void startMainActivity() {
        ((BaseActivity) getActivity()).startMainActivity();
    }

    @Override
    public void hideKeyboard() {
        ((BaseActivity) getActivity()).hideKeyboard();
    }

    protected static void hideKeyboard(@NonNull Context context, @NonNull View view) {
        InputMethodManager imm = (InputMethodManager) context.getSystemService(Activity.INPUT_METHOD_SERVICE);
        imm.hideSoftInputFromWindow(view.getWindowToken(), 0);
    }

    @Override
    public void finish() {
        ((BaseActivity) getActivity()).finish();
    }

    @Override
    public void onAttach(Context context) {
        super.onAttach(context);

        if (context instanceof Activity) {
            mActivity = (FragmentActivity) context;
            userGuide = new UserGuide((BaseActivity) mActivity);
            prefMng = new PreferencesManager(context);
        }
    }


    @Override
    public boolean isUserSignedIn() {
        return prefMng.getUsers() != null && prefMng.getUsers().getUserId() != null && FirebaseAuth.getInstance().getCurrentUser() != null;
    }

    @Override
    public boolean isRadioSelected() {
            return  prefMng.radioInfo() != null && prefMng.radioInfo().getRadioId() != null;
    }


    protected static void setSpinning(@Nullable CircularProgressButton button) {
        if (button != null) {
            button.setClickable(false);
            button.setIndeterminateProgressMode(true);
            button.setProgress(50);
        }
    }

    protected static void cancelSpinning(@Nullable CircularProgressButton button) {
        if (button != null) {
            button.setProgress(0);
            button.setIndeterminateProgressMode(false);
            button.setClickable(true);
        }
    }


//    /**
//     * Presents a prompt for the user to confirm their number as long as it can be shown in one of their device languages.
//     */
//    protected final void showConfirmNumberDialogIfTranslated(@NonNull Context context,
//                                                             @StringRes int firstMessageLine,
//                                                             @NonNull String e164number,
//                                                             @NonNull Runnable onConfirmed,
//                                                             @NonNull Runnable onEditNumber)
//    {
//        TranslationDetection translationDetection = new TranslationDetection(context);
//
//        if (translationDetection.textExistsInUsersLanguage(firstMessageLine) &&
//                translationDetection.textExistsInUsersLanguage(R.string.RegistrationActivity_is_your_phone_number_above_correct) &&
//                translationDetection.textExistsInUsersLanguage(R.string.RegistrationActivity_edit_number))
//        {
//            CharSequence message = new SpannableStringBuilder().append(context.getString(firstMessageLine))
//                    .append("\n\n")
//                    .append(SpanUtil.bold(PhoneNumberFormatter.prettyPrint(e164number)))
//                    .append("\n\n")
//                    .append(context.getString(R.string.RegistrationActivity_is_your_phone_number_above_correct));
//
//            Log.i(TAG, "Showing confirm number dialog (" + context.getString(firstMessageLine) + ")");
//            new AlertDialog.Builder(context)
//                    .setMessage(message)
//                    .setPositiveButton(android.R.string.ok,
//                            (a, b) -> {
//                                Log.i(TAG, "Number confirmed");
//                                onConfirmed.run();
//                            })
//                    .setNegativeButton(R.string.RegistrationActivity_edit_number,
//                            (a, b) -> {
//                                Log.i(TAG, "User requested edit number from confirm dialog");
//                                onEditNumber.run();
//                            })
//                    .show();
//        } else {
//            Log.i(TAG, "Confirm number dialog not translated in " + Locale.getDefault() + " skipping");
//            onConfirmed.run();
//        }
//    }

}


