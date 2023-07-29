package com.sana.dev.fm.utils;

import android.app.Activity;
import android.content.Context;
import android.view.View;

import com.sana.dev.fm.R;

import co.mobiwise.materialintro.animation.MaterialIntroListener;
import co.mobiwise.materialintro.shape.Focus;
import co.mobiwise.materialintro.shape.FocusGravity;
import co.mobiwise.materialintro.shape.ShapeType;
import co.mobiwise.materialintro.view.MaterialIntroView;

public class UserGuide implements MaterialIntroListener {
    public static final String INTRO_FOCUS_1 = "intro_focus_1";
    public static final String INTRO_FOCUS_2 = "intro_focus_2";
    public static final String INTRO_FOCUS_3 = "intro_focus_3";
    private static final int DELAY_TIME = 500;

    Context context;

    public UserGuide(Context context) {
        this.context = context;
    }

    public void showIntro(View view, String id, String text, Focus focusType, ShapeType shape,MaterialIntroListener introListener) {
        if (view != null){
            MaterialIntroView ss = new MaterialIntroView.Builder((Activity) context)
                    .enableDotAnimation(false) //Shows dot animation center of focus area
//                .setMaskColor(context.getResources().getColor(R.color.fab_color_shadow))
                    .setMaskColor(context.getResources().getColor(R.color.mask_color))
                    .setTargetPadding(20) //add 30px padding to focus circle
                    .setTextColor(context.getResources().getColor(R.color.colorPrimaryDark)) //Info dialog's text color is set to black
                    .setIdempotent(true)
                    .enableIcon(false) //Turn off helper icon, default is true
                    .performClick(true) //Trigger click operation when user click focused area.
                    .setFocusGravity(FocusGravity.CENTER)
                    .setFocusType(focusType)
                    .setDelayMillis(DELAY_TIME) // delay the view
                    .enableFadeAnimation(true)
                    .setListener(introListener)
//                .setListener(new MaterialIntroListener() {
//                    @Override
//                    public void onUserClicked(String materialIntroViewId) {
//                        Toast.makeText(context, materialIntroViewId, Toast.LENGTH_SHORT).show();
//                    }
//                })
                    .performClick(true)
                    .dismissOnTouch(true)
                    .setInfoText(text)
                    .setTarget(view)
                    .setShape(shape)
                    .setUsageId(id) //THIS SHOULD BE UNIQUE ID
                    .show();

//        MaterialIntroConfiguration config = new MaterialIntroConfiguration();
//        config.setDelayMillis(1000);
//        config.setFadeAnimationEnabled(true);
//        new PreferencesManager(getApplication()).remove(INTRO_FOCUS_1);
        }


    }

    @Override
    public void onUserClicked(String materialIntroViewId) {

    }

//    private void ShowIntro(String title, String text, int viewId, final int type) {
//
//        new GuideView.Builder(this)
//                .setTitle(title)
//                .setContentText(text)
//                .setTargetView((LinearLayout)findViewById(viewId))
//                .setContentTextSize(12)//optional
//                .setTitleTextSize(14)//optional
//                .setDismissType(GuideView.DismissType.targetView) //optional - default dismissible by TargetView
//                .setGuideListener(new GuideView.GuideListener() {
//                    @Override
//                    public void onDismiss(View view) {
//                        if (type == 1) {
//                            ShowIntro("Editor", "Edit any photo from selected photos than Apply on your video", R.id.button_tool_editor, 6);
//                        } else if (type == 6) {
//                            ShowIntro("Duration", "Set duration between photos", R.id.button_tool_duration, 2);
//                        } else if (type == 2) {
//                            ShowIntro("Filter", "Add filter to video ", R.id.button_tool_effect, 4);
//                        } else if (type == 4) {
//                            ShowIntro("Add Song", "Add your selected song on your video ", R.id.button_tool_music, 3);
//                        } else if (type == 3) {
//                            ShowIntro("Overlay", "Add your selected overlay effect on your video ", R.id.button_tool_overlay, 5);
//                        } else if (type == 5) {
//                            SharePrefUtils.putBoolean("showcase", false);
//                        }
//                    }
//                })
//                .build()
//                .show();
//    }
}
