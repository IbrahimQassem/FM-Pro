package com.sana.dev.fm.ui.activity.appuser;

import static android.app.Activity.RESULT_OK;
import static com.sana.dev.fm.utils.LogUtility.TAG;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.drawable.Drawable;
import android.net.Uri;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.bumptech.glide.Glide;
import com.bumptech.glide.request.target.CustomTarget;
import com.bumptech.glide.request.transition.Transition;
import com.sana.dev.fm.R;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.yalantis.ucrop.UCrop;

import java.io.File;

public class ProfileImageHelper {
    private static final int PICK_IMAGE_REQUEST_CODE = 100;
    private static final int UCROP_REQUEST_CODE = 200;
    private final Activity activity;

    int targetWidth = 200;
    int targetHeight = 150;

    public ProfileImageHelper(Activity activity) {
        this.activity = activity;
    }

//    public void pickImage() {
//        Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
//        activity.startActivityForResult(intent, PICK_IMAGE_REQUEST_CODE);
//    }

    public void onImageSelect() {
        Intent intent = new Intent();
        intent.setType("image/*");
        intent.setAction(Intent.ACTION_GET_CONTENT);
        activity.startActivityForResult(Intent.createChooser(intent, activity.getString(R.string.click_to_change_image)), PICK_IMAGE_REQUEST_CODE);
    }

    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == PICK_IMAGE_REQUEST_CODE && resultCode == RESULT_OK) {
            if (data != null) {
                Uri selectedImageUri = data.getData();
                startCropActivity(selectedImageUri);
                LogUtility.e(TAG, "PICK_IMAGE_REQUEST_CODE");
            }
        } else if (requestCode == UCROP_REQUEST_CODE && resultCode == RESULT_OK) {
//            Uri croppedImageUri = UCrop.getOutputFileUri(activity);
            Uri croppedImageUri = UCrop.getOutput(data);
            resizeAndUploadImage(croppedImageUri);
            LogUtility.e(TAG, "UCROP_REQUEST_CODE\n" + croppedImageUri);

        }
    }

    private void startCropActivity(Uri selectedImageUri) {
        UCrop.Options options = new UCrop.Options();
        options.setCompressionFormat(Bitmap.CompressFormat.JPEG);
        options.setCompressionQuality(80);
//        options.setAspectRatio(1, 1); // Set desired aspect ratio (optional)

//        UCrop uCrop = UCrop.of(selectedImageUri, Uri.fromFile(new File(activity.getCacheDir(), "profile_temp.jpg"))); // Set output path
        UCrop uCrop = UCrop.of(selectedImageUri, Uri.fromFile(new File(activity.getCacheDir(), activity.getResources().getString(R.string.image_desc, FmUtilize.random()))));

//        UCrop.of(selectedImageUri, Uri.fromFile(new File(activity.getCacheDir(), activity.getResources().getString(R.string.image_desc, FmUtilize.random()))))
//                .withAspectRatio(1, 1)
//                .withOptions(options)
//                .start(activity);

        uCrop = uCrop.withOptions(options);
        uCrop.start(activity, UCROP_REQUEST_CODE);
    }


    private void resizeAndUploadImage(Uri croppedImageUri) {
        Glide.with(activity)
                .asBitmap()
                .load(croppedImageUri)
                .override(targetWidth, targetHeight)
                .centerInside()
                .into(new CustomTarget<Bitmap>() {
                    @Override
                    public void onResourceReady(@NonNull Bitmap bitmap, @Nullable Transition<? super Bitmap> transition) {
                        uploadImageToFirebase(bitmap);
                    }

                    @Override
                    public void onLoadCleared(@Nullable Drawable placeholder) {

                    }

                    @Override
                    public void onLoadFailed(@Nullable Drawable errorDrawable) {
                        // Handle loading error
                    }
                });
    }

    private void uploadImageToFirebase(Bitmap bitmap) {
        // Implement Firebase Storage upload logic here (refer to previous example)
        // Use the provided bitmap for upload
        LogUtility.e(TAG, "Use the provided bitmap for upload");

    }
}

