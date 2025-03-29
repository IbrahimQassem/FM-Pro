package com.sana.dev.fm.utils.playerpro;

import static com.google.android.exoplayer2.ui.PlayerNotificationManager.ACTION_PLAY;
import static com.google.android.exoplayer2.ui.PlayerNotificationManager.ACTION_STOP;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class NotificationReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Intent serviceIntent = new Intent(context, RadioPlayerService.class);

        if(action != null) {
            switch(action) {
                case ACTION_PLAY:
                    serviceIntent.putExtra("ACTION", "PLAY");
                    break;
                case ACTION_STOP:
                    serviceIntent.putExtra("ACTION", "STOP");
                    break;
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}