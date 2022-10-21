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

import androidx.annotation.Nullable;
import androidx.annotation.StringRes;

import com.sana.dev.fm.model.ButtonConfig;


/**
 * Created by Ibrahim on 03.05.18.
 */

public interface BaseView {

    void showProgress(String message);

    void hideProgress();

    void showSnackBar(String message);

    void showSnackBar(View view, int messageId);

    void showToast(String message);

    void showWarningDialog(@Nullable int icon, @Nullable String title, @Nullable String desc, @Nullable View.OnClickListener cancelCallback, @Nullable View.OnClickListener confirmListener);

    void showNotCancelableWarningDialog(@Nullable int icon, @Nullable String title, @Nullable String desc, @Nullable View.OnClickListener cancelCallback, @Nullable View.OnClickListener confirmListener);

//    void showNotCancelableWarningDialog(@Nullable int icon, @Nullable String title, @Nullable String desc, @Nullable ButtonConfig cancelCallback, @Nullable ButtonConfig confirmListener);

    void startMainActivity();

    void hideKeyboard();

    void finish();

    boolean isAccountSignedIn();

    boolean isRadioSelected();

    boolean hasInternetConnection();

}
