package com.sana.dev.fm.ui.activity.appuser;

import android.content.Intent;
import android.os.Bundle;
import android.telephony.PhoneNumberFormattingTextWatcher;
import android.view.View;

import androidx.appcompat.widget.AppCompatButton;

import com.google.android.material.textfield.TextInputEditText;
import com.hbb20.CountryCodePicker;
import com.sana.dev.fm.R;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.Tools;

public class PhoneLoginActivity extends BaseActivity {

    TextInputEditText editTextPhone;
    CountryCodePicker country_code;
    AppCompatButton buttonContinue;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_phone_login);
        Tools.setSystemBarColor(this, R.color.grey_20);

        country_code = findViewById(R.id.country_code);
        editTextPhone = findViewById(R.id.editTextPhone);
        buttonContinue = findViewById(R.id.buttonContinue);

        getToolbarArrow().setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        editTextPhone.addTextChangedListener(new PhoneNumberFormattingTextWatcher());

        buttonContinue.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
//                String code = country_code.getText().toString().trim();
                String number = editTextPhone.getText().toString().trim();

                if (number.isEmpty()) {
                    editTextPhone.setError("يرجى إدخال رقم الموبايل");
                    editTextPhone.requestFocus();
                    return;
                } else if (!FmUtilize.isValidPhoneNumber(number)) {
                    editTextPhone.setError("يرجى إدخال رقم موبايل صحيح");
                    editTextPhone.requestFocus();
                    return;
                }
                hideKeyboard();


                country_code.registerCarrierNumberEditText(editTextPhone);
                String phoneNumber = country_code.getFullNumberWithPlus();


//                showProgress(getString(R.string.please_wait));
//                String phoneNumber = code + number;
                Intent intent = new Intent(PhoneLoginActivity.this, VerificationPhone.class);
                intent.putExtra(AppConstant.General.CONST_MOBILE, phoneNumber);
                startActivity(intent);

            }
        });
    }

    @Override
    protected void onStart() {
        super.onStart();

//        if (FirebaseAuth.getInstance().getCurrentUser() != null) {
//            Intent intent = new Intent(this, ProfileWhite.class);
//            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
//            startActivity(intent);
//        }
    }
}