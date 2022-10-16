package com.sana.dev.fm.ui.activity;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.PorterDuff.Mode;
import android.os.Bundle;
import android.preference.PreferenceManager;
import android.view.LayoutInflater;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.LinearLayout.LayoutParams;
import android.widget.TextView;

import androidx.viewpager.widget.PagerAdapter;
import androidx.viewpager.widget.ViewPager;
import androidx.viewpager.widget.ViewPager.OnPageChangeListener;

import com.sana.dev.fm.R;
import com.sana.dev.fm.utils.Tools;

public class CardWizardLight extends BaseActivity {
    private static final int MAX_STEP = 3;
    private String[] about_description_array = new String[]{"مرحبا بك عزيزي المستخدم في تطبيق اليمن الأول للقنوات الإذاعية هدهد اف ام", "حدد إذاعتك المفضلة وتابع أحدث البرامج اليومية", /*"Safe and Comfort flight is our priority. Professional crew and services.",*/ "إستمتع بتصفح العديد من البرامج الإذاعية المختلفة على مدار اليوم"};
    private int[] about_images_array = new int[]{R.drawable.img_wizard_1, R.drawable.img_wizard_2, /*R.drawable.img_wizard_3,*/ R.drawable.img_wizard_4};
    private String[] about_title_array = new String[]{"هد هد اف ام", "إذاعتك المفضلة", /*"Flight to Destination",*/ "إستمتع بالتجربة"};
    private MyViewPagerAdapter myViewPagerAdapter;
    private ViewPager viewPager;
    OnPageChangeListener viewPagerPageChangeListener = new OnPageChangeListener() {
        public void onPageScrollStateChanged(int i) {
        }

        public void onPageScrolled(int i, float f, int i2) {
        }

        public void onPageSelected(int i) {
            bottomProgressDots(i);
        }
    };



    public class MyViewPagerAdapter extends PagerAdapter {
        private Button btnNext;
        private LayoutInflater layoutInflater;

        public boolean isViewFromObject(View view, Object obj) {
            return view == obj;
        }

        public Object instantiateItem(ViewGroup viewGroup, int i) {
            @SuppressLint("WrongConstant") LayoutInflater layoutInflater = (LayoutInflater) getSystemService("layout_inflater");
            this.layoutInflater = layoutInflater;
            View inflate = layoutInflater.inflate(R.layout.item_card_wizard_light, viewGroup, false);
            ((TextView) inflate.findViewById(R.id.title)).setText(about_title_array[i]);
            ((TextView) inflate.findViewById(R.id.description)).setText(about_description_array[i]);
            ((ImageView) inflate.findViewById(R.id.civ_logo)).setImageResource(about_images_array[i]);
            this.btnNext = (Button) inflate.findViewById(R.id.btn_next);
            if (i == about_title_array.length - 1) {
                this.btnNext.setText("ابدأ الآن");
            }  else {
                this.btnNext.setText(getResources().getString(R.string.btn_continue));
            }
            this.btnNext.setOnClickListener(new OnClickListener() {
                public void onClick(View view) {
                    int currentItem = viewPager.getCurrentItem() + 1;
                    if (currentItem < MAX_STEP) {
                        viewPager.setCurrentItem(currentItem);
                    } else {
                        Intent intent2 =  BaseActivity.splashPage(CardWizardLight.this, true);
                        startActivity(intent2);
                        finish();
                    }
                }
            });
            viewGroup.addView(inflate);
            return inflate;
        }

        public int getCount() {
            return about_title_array.length;
        }

        public void destroyItem(ViewGroup viewGroup, int i, Object obj) {
            viewGroup.removeView((View) obj);
        }
    }

    /* Access modifiers changed, original: protected */
    public void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        setContentView((int) R.layout.activity_card_wizard_light);
        this.viewPager = (ViewPager) findViewById(R.id.view_pager);
        bottomProgressDots(0);
        MyViewPagerAdapter myViewPagerAdapter = new MyViewPagerAdapter();
        this.myViewPagerAdapter = myViewPagerAdapter;
        this.viewPager.setAdapter(myViewPagerAdapter);
        this.viewPager.addOnPageChangeListener(this.viewPagerPageChangeListener);
        Tools.setSystemBarColor(this, R.color.overlay_light_80);
        Tools.setSystemBarLight(this);

    }

    private void bottomProgressDots(int i) {
        LinearLayout linearLayout = (LinearLayout) findViewById(R.id.layoutDots);
        ImageView[] imageViewArr = new ImageView[4];
        linearLayout.removeAllViews();
        for (int i2 = 0; i2 < MAX_STEP; i2++) {
            imageViewArr[i2] = new ImageView(this);
            LayoutParams layoutParams = new LayoutParams(new ViewGroup.LayoutParams(15, 15));
            layoutParams.setMargins(10, 10, 10, 10);
            imageViewArr[i2].setLayoutParams(layoutParams);
            imageViewArr[i2].setImageResource(R.drawable.shape_circle);
            imageViewArr[i2].setColorFilter(-1, Mode.SRC_IN);
            linearLayout.addView(imageViewArr[i2]);
        }
        imageViewArr[i].setImageResource(R.drawable.shape_circle);
        imageViewArr[i].setColorFilter(getResources().getColor(R.color.colorAccent), Mode.SRC_IN);
    }

    @Override
    public void onBackPressed() {
        SharedPreferences sharedPreferences = PreferenceManager
                .getDefaultSharedPreferences(this);
        sharedPreferences.edit().remove(SplashActivity.LAST_APP_VERSION).commit();
//        sharedPreferences.edit().clear().commit();
        super.onBackPressed();
    }
}
