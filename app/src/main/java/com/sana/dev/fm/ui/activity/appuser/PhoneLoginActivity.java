package com.sana.dev.fm.ui.activity.appuser;

import android.content.Intent;
import android.os.Bundle;
import android.telephony.PhoneNumberFormattingTextWatcher;
import android.view.View;

import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityPhoneLoginBinding;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;

public class PhoneLoginActivity extends BaseActivity {


    private ActivityPhoneLoginBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        binding = ActivityPhoneLoginBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);
        
        Tools.setSystemBarColor(this, R.color.grey_20);


        binding.editTextPhone.addTextChangedListener(new PhoneNumberFormattingTextWatcher());

      binding.buttonContinue.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String number = binding.editTextPhone.getText().toString().trim();

                if (number.isEmpty()) {
                    binding.editTextPhone.setError(getString(R.string.label_please_enter_your_mobile));
                    binding.editTextPhone.requestFocus();
                    return;
                } else if (!FmUtilize.isValidPhoneNumber(number)) {
                    binding.editTextPhone.setError(getString(R.string.label_please_enter_valid_mobile));
                    binding.editTextPhone.requestFocus();
                    return;
                }
                hideKeyboard();


                binding.countryCode.registerCarrierNumberEditText(binding.editTextPhone);
                String phoneNumber = binding.countryCode.getFullNumberWithPlus();


//                showProgress(getString(R.string.please_wait));
//                String phoneNumber = code + number;
                Intent intent = new Intent(PhoneLoginActivity.this, VerificationPhone.class);
                intent.putExtra(FirebaseConstants.CONST_MOBILE, phoneNumber);
                startActivity(intent);

            }
        });
    }

}