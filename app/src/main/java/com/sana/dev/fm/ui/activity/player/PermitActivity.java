//package com.sana.dev.fm.ui.activity.player;
//
//
//import android.Manifest;
//import android.app.Activity;
//import android.content.Context;
//import android.content.DialogInterface;
//import android.content.pm.PackageManager;
//import android.os.Build;
//import android.os.Bundle;
//import android.widget.Toast;
//
//import androidx.annotation.NonNull;
//import androidx.annotation.Nullable;
//import androidx.appcompat.app.AlertDialog;
//import androidx.appcompat.app.AppCompatActivity;
//import androidx.core.app.ActivityCompat;
//import androidx.core.content.ContextCompat;
//
//
//public class PermitActivity extends AppCompatActivity {
//    public static final int MY_PERMISSIONS_REQUEST_READ_EXTERNAL_STORAGE = 123;
//
//    @Override
//    public void onCreate(@Nullable Bundle savedInstanceState) {
//        super.onCreate(savedInstanceState);
//        if (checkStoragePermission(this)) {
//            showDialog("External storage", this,
//                    Manifest.permission.READ_EXTERNAL_STORAGE);
//        }
//    }
//
//
//    @Override
//    protected void onPostCreate(@Nullable Bundle savedInstanceState) {
//        super.onPostCreate(savedInstanceState);
//        if (checkStoragePermission(this)) {
//            this.finish();
//        }
//    }
//
//
//    @Override
//    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
//        switch (requestCode) {
//            case MY_PERMISSIONS_REQUEST_READ_EXTERNAL_STORAGE:
//                if (grantResults[0] == PackageManager.PERMISSION_GRANTED) {
//                    // do your stuff
//                } else {
//                    Toast.makeText(this, "Permission Denied",
//                            Toast.LENGTH_SHORT).show();
//                }
//                break;
//            default:
//                super.onRequestPermissionsResult(requestCode, permissions,grantResults);
//        }
//    }
//
//
//    public boolean checkStoragePermission(final Context context) {
//        int currentAPIVersion = Build.VERSION.SDK_INT;
//        if (currentAPIVersion >= android.os.Build.VERSION_CODES.M) {
//            if (ContextCompat.checkSelfPermission(context,
//                    Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
//                if (ActivityCompat.shouldShowRequestPermissionRationale(
//                        (Activity) context,
//                        Manifest.permission.READ_EXTERNAL_STORAGE)) {
//                    showDialog("External storage", context,
//                            Manifest.permission.READ_EXTERNAL_STORAGE);
//
//                } else {
//                    ActivityCompat
//                            .requestPermissions(
//                                    (Activity) context,
//                                    new String[]{Manifest.permission.READ_EXTERNAL_STORAGE},
//                                    MY_PERMISSIONS_REQUEST_READ_EXTERNAL_STORAGE);
//                }
//                return true;
//            } else {
//                return false;
//            }
//
//        } else {
//            return false;
//        }
//    }
//
//    public void showDialog(final String msg, final Context context,
//                           final String permission) {
//        AlertDialog.Builder alertBuilder = new AlertDialog.Builder(context);
//        alertBuilder.setCancelable(true);
//        alertBuilder.setTitle("Permission necessary");
//        alertBuilder.setMessage(msg + " permission is necessary");
//        alertBuilder.setPositiveButton(android.R.string.yes,
//                new DialogInterface.OnClickListener() {
//                    public void onClick(DialogInterface dialog, int which) {
//                        ActivityCompat.requestPermissions((Activity) context,
//                                new String[]{permission},
//                                MY_PERMISSIONS_REQUEST_READ_EXTERNAL_STORAGE);
//                    }
//                });
//        AlertDialog alert = alertBuilder.create();
//        alert.show();
//    }
//
//}