package com.sana.dev.fm.utils.my_firebase.notification;

import static com.sana.dev.fm.utils.FmUtilize.resizeImage;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.sana.dev.fm.FmApplication;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.NotificationModel;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.PreferencesManager;

import java.io.IOException;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Random;


public class AppFCMMessagingService extends FirebaseMessagingService {
    private static final String TAG = LogUtility.tag(AppFCMMessagingService.class);

    @Override
    public void onNewToken(@NonNull String token) {
        Log.d(TAG, "Refreshed token: " + token);
        sendRegistrationToServer(token);
    }

    private void sendRegistrationToServer(String token) {
        PreferencesManager.getInstance().write(AppConstant.General.FIREBASE_FCM_TOKEN, token);
    }

    private final static String CHANNEL_NOTIFICATION_MESSAGE = "notification_message";

    Handler mHandler;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        mHandler = new Handler(Looper.getMainLooper()) {
            @Override
            public void handleMessage(@NonNull Message message) {
                // This is where you do your work in the UI thread.
                // Your worker tells you in the message what to do.
                Log.i("notification_receive", "yes");
                if (remoteMessage.getNotification() != null) {
                    Log.i("notification_receive", "notification");
                    getMessageFromNotification(remoteMessage.getNotification());
                } else if (remoteMessage.getData().size() > 0) {
                    Log.i("notification_receive", "data");
                    getMessageFromData(remoteMessage.getData());
                }

            }
        };
        workerThread();


    }

    void workerThread() {
        Message message = mHandler.obtainMessage(1, 1);
        message.sendToTarget();
    }


    private void getMessageFromNotification(RemoteMessage.Notification notification) {
        String title = "";
        String body = "";
        String datetime = "";
        String imageUrl = null;

        if (notification.getTitle() != null) {
            title = notification.getTitle();
        }

        if (notification.getBody() != null) {
            body = notification.getBody();
        }
        datetime = FmUtilize.getTDateFormat(new Date());

        if (notification.getImageUrl() != null) {
            imageUrl = String.valueOf(notification.getImageUrl());
        }

        publishAndSaveData(title, body, datetime, imageUrl, null);

    }

    private void getMessageFromData(Map<String, String> data) {
        String title = "";
        String body = "";
        String datetime = "";
        String imageUrl = null;
        String url = null;

        if (data.containsKey("title") && data.get("title") != null) {
            title = data.get("title");
        }

        if (data.containsKey("body") && data.get("body") != null) {
            body = data.get("body");
        }

        if (data.containsKey("datetime") && data.get("datetime") != null) {
            datetime = data.get("datetime");
        } else {
            datetime = FmUtilize.getTDateFormat(new Date());
        }

        if (data.containsKey("image") && data.get("image") != null) {
            imageUrl = data.get("image");
        }

        if (data.containsKey("url") && data.get("url") != null) {
            url = data.get("url");
        }


        publishAndSaveData(title, body, datetime, imageUrl, url);
    }

    private void publishAndSaveData(String title, String body, String datetime, String imageUrl, String url) {
        if (imageUrl != null) {
            try {
//                new DownloadImageTask(builder).execute(imageUri.toString());

                Bitmap bitmap = FmUtilize.downloadImage(this,imageUrl);
                if (bitmap != null) {
                    bitmap = resizeImage(bitmap, 500, 500); // Resize the image
                    publishNotification(title, body, bitmap, url);
                } else {
                    Log.e(TAG, "Failed to download or resize image");
                    publishNotification(title, body, BitmapFactory.decodeResource(getResources(), R.drawable.ic_radio), url);
                }
            } catch (Exception e) {
                LogUtility.e(TAG, e.getMessage());
                publishNotification(title, body, BitmapFactory.decodeResource(getResources(), R.drawable.ic_notification), url);
            }

        } else {
            publishNotification(title, body, null, url);
        }

        storeNotification(title, body, datetime, imageUrl, url);
    }

    private Bitmap downloadImage(String imageUrl) {
        try {
            return FmUtilize.downloadImage(this,imageUrl);
        } catch (Exception e) {
            Log.e(TAG, "Failed to download image: " + e.getMessage());
            return null;
        }
    }

    private Bitmap downloadImageZ(String imageUrl) throws IOException {
        // Implement your image download logic here (e.g., using Glide or Picasso)
        return BitmapFactory.decodeStream(new java.net.URL(imageUrl).openStream());
    }

    private void storeNotification(String title, String body, String datetime, String image, String url) {
        String cachedNotifications = PreferencesManager.getInstance().read(AppConstant.General.FIREBASE_NOTIFICATION, null);

        Type listType = new TypeToken<List<NotificationModel>>() {
        }.getType();
        List<NotificationModel> notificationsList = new ArrayList<>();
        if (cachedNotifications != null) {
            notificationsList = new Gson().fromJson(cachedNotifications, listType);
        }

        NotificationModel notificationModel = new NotificationModel();
        notificationModel.setTitle(title);
        notificationModel.setBody(body);
        notificationModel.setDatetime(datetime);
        notificationModel.setImage(image);
        notificationModel.setSiteUrl(url);
        notificationModel.setRead(false);

        notificationsList.add(0, notificationModel);

        PreferencesManager.getInstance().write(AppConstant.General.FIREBASE_NOTIFICATION, new Gson().toJson(notificationsList));
    }

    private Intent getIntentClickIntent() {
        Intent notificationIntent = IntentHelper.mainActivity(this, true);
        return notificationIntent;
    }

    private void publishNotification(String title, String messageBody, Bitmap bitmap, String url) {


        Intent intentUrl = null;
        if (url != null && !url.isEmpty()) {
            try {
                intentUrl = new Intent(Intent.ACTION_VIEW);
                intentUrl.setData(Uri.parse(url));
                intentUrl.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            } catch (Exception ignored) {
                intentUrl = null;
            }
        }

        Intent intent = getIntentClickIntent();


        Random random = new Random();

        int flag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flag = PendingIntent.FLAG_IMMUTABLE;
        } else {
            flag = PendingIntent.FLAG_UPDATE_CURRENT;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(FmApplication.getInstance(), random.nextInt(), intent, flag);
        PendingIntent pendingIntentUrl = null;
        if (intentUrl != null) {
            pendingIntentUrl = PendingIntent.getActivity(FmApplication.getInstance(), random.nextInt(), intentUrl, flag);
        }


        Notification notification = getNotifications(title, messageBody, bitmap, CHANNEL_NOTIFICATION_MESSAGE, pendingIntent, pendingIntentUrl);

        publishNotification(random.nextInt(), notification);
    }

    public Notification getNotifications(String title,
                                         String message,
                                         Bitmap bitmap,
                                         String channel,
                                         PendingIntent pendingIntent,
                                         PendingIntent pendingIntentUrl) {
        if (title == null) {
            title = FmApplication.getInstance().getString(R.string.app_name);
        }

        Uri notificationsUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        //create notification channel for Android Oreo and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel notificationChannel = new NotificationChannel(channel,
                    FmApplication.getInstance().getString(R.string.app_name),
                    NotificationManager.IMPORTANCE_HIGH);

            notificationChannel.setLightColor(Color.BLUE);
            notificationChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager manager = (NotificationManager) FmApplication.getInstance().getSystemService(Context.NOTIFICATION_SERVICE);
            manager.createNotificationChannel(notificationChannel);
        }

        //create notification builder
        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(FmApplication.getInstance(), channel)
                .setSmallIcon(R.drawable.logo_app)
                .setColor(getResources().getColor(R.color.colorPrimary))
                .setContentTitle(title)
                .setContentText(message)
                .setSound(notificationsUri)
                .setAutoCancel(true)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message));


        if (pendingIntentUrl != null) {
            notificationBuilder.addAction(R.drawable.ic_click,
                    getString(R.string.open_url), pendingIntentUrl);
        }

        if (bitmap != null) {
            notificationBuilder.setLargeIcon(bitmap).
                    setStyle(new NotificationCompat.BigPictureStyle()
                            .bigPicture(bitmap)
                            .bigLargeIcon(null));
        }

        if (pendingIntent != null) {
            notificationBuilder.setContentIntent(pendingIntent);
        }


        return notificationBuilder.build();
    }

    public void publishNotification(int notificationId, Notification notification) {
        NotificationManager notificationManager = (NotificationManager) FmApplication.getInstance().getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(notificationId, notification);
    }
}