/*
 * Copyright 2018 Rozdoum
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package com.sana.dev.fm.model.interfaces;

import android.content.DialogInterface;
import android.view.View;

import androidx.annotation.StringRes;


/**
 * Created by Ibrahim on 03.05.18.
 */

public interface BaseView {

    void showProgress();

    void showProgress(int message);

    void hideProgress();

    void showSnackBar(String message);

    void showSnackBar(int message);

    void showSnackBar(View view, int messageId);

    void showToast(@StringRes int messageId);

    void showToast(String message);

    void showWarningDialog(int messageId);

    void showWarningDialog(String message);

    void showNotCancelableWarningDialog(String message);

    void showWarningDialog(String message, String desc);

    void showNotCancelableWarningDialog(String message, String desc, View.OnClickListener okCallback);

    void showNotCancelableWarningDialog(String message, String desc, View.OnClickListener cancelCallback, View.OnClickListener okCallback);

    void showWarningDialog(@StringRes int messageId, DialogInterface.OnClickListener listener);

    void showWarningDialog(String message, DialogInterface.OnClickListener listener);


//    void onUserClickedTarget(String materialIntroViewId,View viewId, View.OnClickListener listener);


    void startLoginActivity();

    void startMainActivity();


    void hideKeyboard();

    void finish();

    boolean isAccountSignedIn();
    boolean isRadioSelected();

}
