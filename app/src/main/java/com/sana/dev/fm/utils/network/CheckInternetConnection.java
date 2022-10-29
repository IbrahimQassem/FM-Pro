package com.sana.dev.fm.utils.network;

import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;

import com.sana.dev.fm.utils.LogUtility;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketAddress;

public class CheckInternetConnection  {

    private ConnectionChangeListener connectionChangeListener;

    private HandlerThread mHandlerThread;

    private Handler mConnectionCheckerHandler;

    private int mUpdateInterval = 3000;

    private boolean quite;

    public CheckInternetConnection() {

    }

    private void initHandler() {
        quite = false;
        mHandlerThread = new HandlerThread("MyHandlerThread");
        mHandlerThread.setPriority(3);
        mHandlerThread.start();
        Looper looper = mHandlerThread.getLooper();
        mConnectionCheckerHandler = new Handler(looper);
    }

    public int getUpdateInterval() {
        return mUpdateInterval;
    }

    public void setUpdateInterval(int updateIntervalInMillis) {
        this.mUpdateInterval = updateIntervalInMillis;
    }

    private void updateListenerInMainThread(final boolean connectionAvailability)   {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                connectionChangeListener.onConnectionChanged(connectionAvailability);
            }
        });
    }

    private void sleep(int timeInMilli) {
        try {
            Thread.sleep(timeInMilli);
        }
        catch (Exception e) {
            LogUtility.e(LogUtility.tag(CheckInternetConnection.class), e.toString());
        }
    }

    public void addConnectionChangeListener(ConnectionChangeListener connectionChangeListener) {
        this.connectionChangeListener = connectionChangeListener;
        initHandler();
        mConnectionCheckerHandler.post(new ConnectionCheckRunnable());
    }

    public void removeConnectionChangeListener()    {
        quite = true;
        mHandlerThread.quit();
    }

    class ConnectionCheckRunnable implements Runnable  {

        @Override
        public void run() {

            sleep(1000);

            while (!quite)    {
                try {
                    int timeoutMs = 1500;
                    Socket sock = new Socket();
                    SocketAddress sockaddr = new InetSocketAddress("8.8.8.8", 53);

                    sock.connect(sockaddr, timeoutMs);
                    sock.close();

                    updateListenerInMainThread(true);

                    sleep(mUpdateInterval);

                } catch (IOException e) {

                    updateListenerInMainThread(false);

                    sleep(mUpdateInterval);
                }
            }
        }
    }
}

