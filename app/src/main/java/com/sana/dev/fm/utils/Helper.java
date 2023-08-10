package com.sana.dev.fm.utils;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.media.MediaPlayer;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.AsyncTask;
import android.util.Log;

import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;

import org.json.JSONObject;
import org.xml.sax.InputSource;
import org.xml.sax.XMLReader;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class Helper {

    private static final boolean DISPLAY_DEBUG = BuildConfig.DEBUG;

    /**
     * Shows a 'no connection' dialog if the user is not online, or a general error if the user is online.
     *
     * @param context context
     * @param message additional message to show
     */
    public static void noConnection(final Activity context, String message) {

        AlertDialog.Builder ab = new AlertDialog.Builder(context);

        if (isOnline(context)) {
            String messageText = "";
            if (message != null && DISPLAY_DEBUG) {
                messageText = "\n\n" + message;
            }

            ab.setMessage(context.getResources().getString(R.string.dialog_connection_description) + messageText);
            ab.setPositiveButton(context.getResources().getString(R.string.label_ok), null);
            ab.setTitle(context.getResources().getString(R.string.dialog_connection_title));
        } else {
            ab.setMessage(context.getResources().getString(R.string.dialog_internet_description));
            ab.setPositiveButton(context.getResources().getString(R.string.label_ok), null);
            ab.setTitle(context.getResources().getString(R.string.dialog_internet_title));
        }

        if (!context.isFinishing()) {
            ab.show();
        }
    }

    /**
     * Returns if the user has an internet connection
     *
     * @param context the context
     */
    public static boolean isOnline(Context context) {
        ConnectivityManager cm = (ConnectivityManager)
                context.getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo ni = cm.getActiveNetworkInfo();

        return ni != null && ni.isConnected();
    }

    /**
     * Returns true if the user is online, and returns false and shows a dialog otherwise
     *
     * @param c Activity to show dialog in.
     */
    public static boolean isOnlineShowDialog(Activity c) {
        if (isOnline(c))
            return true;
        else
            noConnection(c);
        return false;
    }

    /**
     * Shows a 'no connection' dialog if the user is not online, or a general error if the user is online.
     *
     * @param context context
     */
    public static void noConnection(final Activity context) {
        noConnection(context, null);
    }

    //Get JSON from an url and parse it to a JSON Object.
    public static JSONObject getJSONObjectFromUrl(String url) {
        String data = getDataFromUrl(url);

        try {
            return new JSONObject(data);
        } catch (Exception e) {
            LogUtility.e("INFO", "Error parsing JSON. Printing stacktrace now");
            LogUtility.printStackTrace(e);
        }

        return null;
    }

    //Get response from an URL request (GET)
    public static String getDataFromUrl(String url) {
        // Making HTTP request
        Log.v("INFO", "Requesting: " + url);

        StringBuffer chaine = new StringBuffer();
        try {
            URL urlCon = new URL(url);

            //Open a connection
            HttpURLConnection connection = (HttpURLConnection) urlCon
                    .openConnection();
            connection.setRequestProperty("User-Agent", "Universal/2.0 (Android)");
            connection.setRequestMethod("GET");
            connection.setDoInput(true);
            connection.connect();

            //Handle redirecti
            int status = connection.getResponseCode();
            if ((status != HttpURLConnection.HTTP_OK) && (status == HttpURLConnection.HTTP_MOVED_TEMP
                    || status == HttpURLConnection.HTTP_MOVED_PERM
                    || status == HttpURLConnection.HTTP_SEE_OTHER)) {

                // get redirect url from "location" header field
                String newUrl = connection.getHeaderField("Location");
                // get the cookie if need, for login
                String cookies = connection.getHeaderField("Set-Cookie");

                // open the new connnection again
                connection = (HttpURLConnection) new URL(newUrl).openConnection();
                connection.setRequestProperty("Cookie", cookies);
                connection.setRequestProperty("User-Agent", "Universal/2.0 (Android)");
                connection.setRequestMethod("GET");
                connection.setDoInput(true);

                Log.v("INFO", "Redirect to URL : " + newUrl);
            }

            //Get the stream from the connection and read it
            InputStream inputStream = connection.getInputStream();
            BufferedReader rd = new BufferedReader(new InputStreamReader(
                    inputStream));
            String line = "";
            while ((line = rd.readLine()) != null) {
                chaine.append(line);
            }

        } catch (IOException e) {
            // writing exception to log
            LogUtility.printStackTrace(e);
        }

        return chaine.toString();
    }

    public static boolean checkIfRadioOnline(String radioUrl) {
//        AsyncTask<String, Void, Boolean> state = new RetrieveFeedTask().execute(radioUrl);
        boolean state;
        OkHttpClient client = new OkHttpClient();
        Request request = new Request.Builder()
                .url(radioUrl)
                .build();
        try {
            Response response = client.newCall(request).execute();
            if (response.isSuccessful()) {
                // response code 200 indicates the stream is online
                // you can perform additional checks based on your requirements
                Log.d("Radio URL Status", "Stream is online");
                state = true;
            } else {
                Log.d("Radio URL Status", "Stream is offline");
                state = false;
            }
        } catch (IOException e) {
            Log.d("Radio URL Status", "Error checking stream status: " + e.getMessage());
            state = false;
        }

        return state;
    }

    static class RetrieveFeedTask extends AsyncTask<String, Void, Boolean> {

        private Exception exception;

        protected Boolean doInBackground(String... urls) {
            try {
                URL url = new URL(urls[0]);
                return checkIfRadioOnline(urls[0]);
            } catch (Exception e) {
                this.exception = e;
                return false;
            } finally {
            }
        }

        protected void onPostExecute(boolean feed) {
            // TODO: check this.exception
            // TODO: do something with the feed
        }
    }

    public static class CheckStreamTask extends AsyncTask<String, Void, Boolean> {

        @Override
        protected Boolean doInBackground(String... params) {
            String streamUrl = params[0];
            try {
                MediaPlayer mediaPlayer = new MediaPlayer();
                mediaPlayer.setDataSource(streamUrl);
                mediaPlayer.prepareAsync();
                mediaPlayer.setOnPreparedListener(new MediaPlayer.OnPreparedListener() {
                    @Override
                    public void onPrepared(MediaPlayer mp) {
                        // The stream can be played successfully
                        publishProgress();
                        mp.release();
                    }
                });
                mediaPlayer.setOnErrorListener(new MediaPlayer.OnErrorListener() {
                    @Override
                    public boolean onError(MediaPlayer mp, int what, int extra) {
                        // The stream cannot be played
                        return true;
                    }
                });
            } catch (Exception e) {
                // There was an error setting up the MediaPlayer
                return false;
            }
            return false;
        }

        @Override
        protected void onProgressUpdate(Void... values) {
            // Update UI to indicate that stream is playable
        }

        @Override
        protected void onPostExecute(Boolean success) {
            if (!success) {
                // Update UI to indicate that stream is not playable
            }
        }
    }

    public static boolean isInternetUrlConnected(Context context,String v) {
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
        boolean isConnected = activeNetwork != null && activeNetwork.isConnectedOrConnecting();
        if (isConnected) {
            String[] testUrls = new String[] {
                   v
            };
            for (String url : testUrls) {
                try {
                    HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
                    connection.setRequestMethod("HEAD");
                    int responseCode = connection.getResponseCode();
                    if (responseCode != 200) {
                        isConnected = false;
                        break;
                    }
                } catch (Exception e) {
                    isConnected = false;
                    break;
                }
            }
        }
        return isConnected;
    }




}
