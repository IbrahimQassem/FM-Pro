package com.sana.dev.fm.utils.radio_player;

import android.graphics.Bitmap;


import com.sana.dev.fm.utils.radio_player.metadata.Metadata;

import java.util.ArrayList;

public class StaticEventDistributor {

    private static ArrayList<EventListener> listeners;

    public static void registerAsListener(EventListener listener) {
        if (listeners == null) listeners = new ArrayList<>();

        listeners.add(listener);
    }

    public static void unregisterAsListener(EventListener listener) {
        listeners.remove(listener);
    }

    public static void onEvent(String status) {
        if (listeners == null) return;

        for (EventListener listener : listeners) {
            listener.onEvent(status);
        }
    }

    public static void onAudioSessionId(Integer id) {
        if (listeners == null) return;

        for (EventListener listener : listeners) {
            listener.onAudioSessionId(id);
        }
    }

    public static void onMetaDataReceived(Metadata meta, Bitmap image) {
        if (listeners == null) return;

        for (EventListener listener : listeners) {
            listener.onMetaDataReceived(meta, image);
        }
    }


    public interface EventListener {
        void onEvent(String status);

        void onAudioSessionId(Integer i);

        void onMetaDataReceived(Metadata meta, Bitmap image);
    }
}
