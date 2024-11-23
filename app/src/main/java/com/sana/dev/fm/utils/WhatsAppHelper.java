package com.sana.dev.fm.utils;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.core.content.FileProvider;

import com.sana.dev.fm.R;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.util.ArrayList;

public class WhatsAppHelper {
    private static final String WHATSAPP_PACKAGE = "com.whatsapp";
    private static final String WHATSAPP_BUSINESS_PACKAGE = "com.whatsapp.w4b";

    public static void openWhatsApp(Context context, String phoneNumber, String message) {
        try {
            // Remove any non-numeric characters from phone number
            String formattedNumber = phoneNumber.replaceAll("[^0-9]", "");

//            // Add country code if not present (example for US/Canada)
//            if (!formattedNumber.startsWith("+") && !formattedNumber.startsWith("9")) {
//                formattedNumber = "00967" + formattedNumber;
//            }

            // Create intent with whatsapp URI
            Intent intent = new Intent(Intent.ACTION_VIEW);
            String url = "https://api.whatsapp.com/send?phone=" + formattedNumber;

            if (message != null && !message.isEmpty()) {
                url += "&text=" + URLEncoder.encode(message, "UTF-8");
            }

            intent.setData(Uri.parse(url));

            // Start activity
            context.startActivity(intent);
        } catch (Exception e) {
            // Handle exception (WhatsApp not installed, etc.)
            showWhatsAppNotInstalledDialog(context);
        }
    }

    public static void openWhatsAppBusiness(Context context, String phoneNumber, String message) {
        try {
            String formattedNumber = phoneNumber.replaceAll("[^0-9]", "");

            // Create intent
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setPackage(WHATSAPP_BUSINESS_PACKAGE);

            String url = "https://api.whatsapp.com/send?phone=" + formattedNumber;
            if (message != null && !message.isEmpty()) {
                url += "&text=" + URLEncoder.encode(message, "UTF-8");
            }

            intent.setData(Uri.parse(url));

            // Check if WhatsApp Business is installed
            if (isAppInstalled(context, WHATSAPP_BUSINESS_PACKAGE)) {
                context.startActivity(intent);
            } else {
                // If Business version not installed, try regular WhatsApp
                intent.setPackage(WHATSAPP_PACKAGE);
                if (isAppInstalled(context, WHATSAPP_PACKAGE)) {
                    context.startActivity(intent);
                } else {
                    showWhatsAppNotInstalledDialog(context);
                }
            }
        } catch (Exception e) {
            showWhatsAppNotInstalledDialog(context);
        }
    }

    public static void openDirectChat(Context context, String phoneNumber, String message, boolean useBusiness) {
        try {
            String formattedNumber = phoneNumber.replaceAll("[^0-9]", "");

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setPackage(useBusiness ? WHATSAPP_BUSINESS_PACKAGE : WHATSAPP_PACKAGE);

            // Using whatsapp://send instead of https://api.whatsapp.com/send
            String url = "whatsapp://send?phone=" + formattedNumber;
            if (message != null && !message.isEmpty()) {
                url += "&text=" + URLEncoder.encode(message, "UTF-8");
            }

            intent.setData(Uri.parse(url));

            if (isAppInstalled(context, intent.getPackage())) {
                context.startActivity(intent);
            } else {
                // If requested app not installed, try the other version
                intent.setPackage(useBusiness ? WHATSAPP_PACKAGE : WHATSAPP_BUSINESS_PACKAGE);
                if (isAppInstalled(context, intent.getPackage())) {
                    context.startActivity(intent);
                } else {
                    showWhatsAppNotInstalledDialog(context);
                }
            }
        } catch (Exception e) {
            showWhatsAppNotInstalledDialog(context);
        }
    }

    private static boolean isAppInstalled(Context context, String packageName) {
        try {
            context.getPackageManager().getPackageInfo(packageName, PackageManager.GET_ACTIVITIES);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    private static void showWhatsAppNotInstalledDialog(Context context) {
        new AlertDialog.Builder(context)
                .setTitle(context.getString(R.string.label_whatsapp_not_installed))
                .setMessage(context.getString(R.string.msg_whatsapp_is_not_installed_on_your_device_would_you_like_to_install_it))
                .setPositiveButton(context.getString(R.string.label_install), (dialog, which) -> {
                    try {
                        // Open Play Store
                        context.startActivity(new Intent(Intent.ACTION_VIEW,
                                Uri.parse("market://details?id=" + WHATSAPP_PACKAGE)));
                    } catch (ActivityNotFoundException e) {
                        // If Play Store not installed, open browser
                        context.startActivity(new Intent(Intent.ACTION_VIEW,
                                Uri.parse("https://play.google.com/store/apps/details?id=" + WHATSAPP_PACKAGE)));
                    }
                })
                .setNegativeButton(context.getString(R.string.label_cancel), null)
                .show();
    }

    public static void shareToWhatsApp(Context context, String text) {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TEXT, text);
        intent.setPackage(WHATSAPP_PACKAGE);

        try {
            context.startActivity(intent);
        } catch (Exception e) {
            showWhatsAppNotInstalledDialog(context);
        }
    }

    public static void shareImageToWhatsApp(Context context, Uri imageUri) {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("image/*");
        intent.putExtra(Intent.EXTRA_STREAM, imageUri);
        intent.setPackage(WHATSAPP_PACKAGE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        try {
            context.startActivity(intent);
        } catch (Exception e) {
            showWhatsAppNotInstalledDialog(context);
        }
    }

    public static void shareImageWithTextToWhatsApp(Context context, Uri imageUri, String title, String description) {
        try {
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("image/*");

            // Combine title and description
            String textToShare = "";
            if (title != null && !title.isEmpty()) {
                textToShare += title + "\n\n";
            }
            if (description != null && !description.isEmpty()) {
                textToShare += description;
            }

            // Add text and image to intent
            intent.putExtra(Intent.EXTRA_TEXT, textToShare);
            intent.putExtra(Intent.EXTRA_STREAM, imageUri);

            // Set package to WhatsApp
            intent.setPackage(WHATSAPP_PACKAGE);

            // Grant temporary read permission to WhatsApp
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            // Verify if WhatsApp is installed
            if (isAppInstalled(context, WHATSAPP_PACKAGE)) {
                context.startActivity(Intent.createChooser(intent, "Share via"));
            } else {
                showWhatsAppNotInstalledDialog(context);
            }
        } catch (Exception e) {
            Toast.makeText(context, context.getString(R.string.label_error_occurred_with_val,e.getMessage()), Toast.LENGTH_SHORT).show();
//            Toast.makeText(context, "Error sharing to WhatsApp", Toast.LENGTH_SHORT).show();
            e.printStackTrace();
        }
    }

    // Share multiple images with text
    public static void shareMultipleImagesToWhatsApp(Context context, ArrayList<Uri> imageUris, String title, String description) {
        try {
            Intent intent = new Intent(Intent.ACTION_SEND_MULTIPLE);
            intent.setType("image/*");

            // Combine title and description
            String textToShare = "";
            if (title != null && !title.isEmpty()) {
                textToShare += title + "\n\n";
            }
            if (description != null && !description.isEmpty()) {
                textToShare += description;
            }

            // Add text and images to intent
            intent.putExtra(Intent.EXTRA_TEXT, textToShare);
            intent.putParcelableArrayListExtra(Intent.EXTRA_STREAM, imageUris);

            // Set package to WhatsApp
            intent.setPackage(WHATSAPP_PACKAGE);

            // Grant temporary read permission to WhatsApp
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            if (isAppInstalled(context, WHATSAPP_PACKAGE)) {
                context.startActivity(Intent.createChooser(intent, "Share via"));
            } else {
                showWhatsAppNotInstalledDialog(context);
            }
        } catch (Exception e) {
            Toast.makeText(context, context.getString(R.string.label_error_occurred_with_val,e.getMessage()), Toast.LENGTH_SHORT).show();
//            Toast.makeText(context, "Error sharing to WhatsApp", Toast.LENGTH_SHORT).show();
            e.printStackTrace();
        }
    }

    // Share image from resources
    public static void shareResourceImageToWhatsApp(Context context, int resourceId, String title, String description) {
        try {
            // Convert resource to file
            Uri imageUri = getUriFromResourceId(context, resourceId);
            shareImageWithTextToWhatsApp(context, imageUri, title, description);
        } catch (Exception e) {
            Toast.makeText(context, context.getString(R.string.label_error_occurred_with_val,e.getMessage()), Toast.LENGTH_SHORT).show();
//            Toast.makeText(context, "Error sharing to WhatsApp", Toast.LENGTH_SHORT).show();
            e.printStackTrace();
        }
    }

    // Share image from Bitmap
    public static void shareBitmapToWhatsApp(Context context, Bitmap bitmap, String title, String description) {
        try {
            Uri imageUri = getUriFromBitmap(context, bitmap);
            shareImageWithTextToWhatsApp(context, imageUri, title, description);
        } catch (Exception e) {
            Toast.makeText(context, context.getString(R.string.label_error_occurred_with_val,e.getMessage()), Toast.LENGTH_SHORT).show();
//            Toast.makeText(context, "Error sharing to WhatsApp", Toast.LENGTH_SHORT).show();
            e.printStackTrace();
        }
    }

    // Helper method to convert resource to Uri
    private static Uri getUriFromResourceId(Context context, int resourceId) {
        try {
            File imagesFolder = new File(context.getCacheDir(), "images");
            imagesFolder.mkdirs();
            File file = new File(imagesFolder, "shared_image.png");

            InputStream inputStream = context.getResources().openRawResource(resourceId);
            OutputStream outputStream = new FileOutputStream(file);

            byte[] buf = new byte[1024];
            int len;
            while ((len = inputStream.read(buf)) > 0) {
                outputStream.write(buf, 0, len);
            }
            outputStream.close();
            inputStream.close();

            return FileProvider.getUriForFile(context, context.getApplicationContext().getPackageName() + ".provider", file);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    // Helper method to convert Bitmap to Uri
    private static Uri getUriFromBitmap(Context context, Bitmap bitmap) {
        try {
            File imagesFolder = new File(context.getCacheDir(), "images");
            imagesFolder.mkdirs();
            File file = new File(imagesFolder, "shared_image.png");

            OutputStream stream = new FileOutputStream(file);
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream);
            stream.flush();
            stream.close();

            return FileProvider.getUriForFile(context, context.getApplicationContext().getPackageName() + ".provider", file);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }


    public static boolean isWhatsAppInstalled(Context context) {
        return isAppInstalled(context, WHATSAPP_PACKAGE);
    }

    public static boolean isWhatsAppBusinessInstalled(Context context) {
        return isAppInstalled(context, WHATSAPP_BUSINESS_PACKAGE);
    }

    public static void openWhatsAppSettings(Context context) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + WHATSAPP_PACKAGE));
            context.startActivity(intent);
        } catch (Exception e) {
            showWhatsAppNotInstalledDialog(context);
        }
    }
}