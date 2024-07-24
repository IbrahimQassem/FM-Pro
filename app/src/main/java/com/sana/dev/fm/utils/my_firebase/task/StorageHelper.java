package com.sana.dev.fm.utils.my_firebase.task;

import android.app.Activity;
import android.graphics.Bitmap;
import android.net.Uri;
import android.provider.MediaStore;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageReference;
import com.google.firebase.storage.UploadTask;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.UUID;

public class StorageHelper {
    private final FirebaseStorage storage;
    private final int MAX_IMAGE_SIZE = FmUtilize.dpToPx(500); // Define your desired max image size in pixels

    public StorageHelper(FirebaseStorage storage) {
        this.storage = storage;
    }

    public interface UserSubmittedCallback {
        void onSuccess(String imageName, String profileImageUrl);

        void onFailure(Exception e);
    }

    public void submitUserInfo(Activity activity, String parentDocId, Uri profileImageUri, UserSubmittedCallback callback) {
        if (profileImageUri == null) {
            callback.onFailure(new Exception("No profile image selected"));
            return;
        }

        resizeAndUploadProfileImage(activity, parentDocId, profileImageUri, callback);
    }

    private void resizeAndUploadProfileImage(Activity activity, String parentDocId, Uri profileImageUri, UserSubmittedCallback callback) {
        try {
            Bitmap bitmap = MediaStore.Images.Media.getBitmap(activity.getContentResolver(), profileImageUri);
            Bitmap resizedBitmap = resizeImage(bitmap, MAX_IMAGE_SIZE);

            // Convert resized bitmap to byte array for upload
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            resizedBitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos);
            byte[] data = baos.toByteArray();

            String imageName = parentDocId + "_" + UUID.randomUUID().toString() + ".jpg";
            StorageReference profileImageRef = storage.getReference().child(AppConstant.General.FB_FM_FOLDER_PATH).child(parentDocId).child(imageName);// Add ".png" extension
//            StorageReference profileImageRef = storage.getReference().child("profile_images/" + UUID.randomUUID().toString());
            profileImageRef.putBytes(data)
                    .addOnSuccessListener(new OnSuccessListener<UploadTask.TaskSnapshot>() {
                        @Override
                        public void onSuccess(UploadTask.TaskSnapshot taskSnapshot) {
                            profileImageRef.getDownloadUrl().addOnCompleteListener(new OnCompleteListener<Uri>() {
                                @Override
                                public void onComplete(@NonNull Task<Uri> task) {
                                    if (task.isSuccessful()) {
                                        String profileImageUrl = task.getResult().toString();
                                        callback.onSuccess(imageName, profileImageUrl);

//                                        createUserAndSaveInfo(name, email, profileImageUrl, callback);
                                    } else {
                                        callback.onFailure(task.getException());
                                    }
                                }
                            });
                        }
                    })
                    .addOnFailureListener(new OnFailureListener() {
                        @Override
                        public void onFailure(@NonNull Exception e) {
                            callback.onFailure(e);
                        }
                    });
        } catch (IOException e) {
            callback.onFailure(e);
        }
    }

    private Bitmap resizeImage(Bitmap bitmap, int maxSize) {
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();

        float scaleFactor = Math.max((float) maxSize / width, (float) maxSize / height);
        int newWidth = Math.round(width * scaleFactor);
        int newHeight = Math.round(height * scaleFactor);

        Bitmap resizedBitmap = Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true);
        bitmap.recycle(); // Release original bitmap memory
        return resizedBitmap;
    }

//    private void createUserAndSaveInfo(String name, String email, String profileImageUrl, UserSubmittedCallback callback) {
//        FirebaseUser user = mAuth.getCurrentUser();
//        if (user != null) {
//            UserProfileChangeRequest profileUpdates = new UserProfileChangeRequest.Builder()
//                    .setDisplayName(name)
//                    .setPhotoUri(Uri.parse(profileImageUrl))
//                    .build();
//
//            user.updateProfile(profileUpdates)
//                    .addOnCompleteListener(new OnCompleteListener<Void>() {
//                        @Override
//                        public void onComplete(@NonNull Task<Void> task) {
//                            if (task.isSuccessful()) {
//                                callback.onSuccess(name, email, profileImageUrl);
//                            } else {
//                                callback.onFailure(task.getException());
//                            }
//                        }
//                    });
//        } else {
//            // Handle case where user is not signed in (e.g., sign up using email/password)
//            callback.onFailure(new Exception("User not signed in"));
//        }
//    }
}
