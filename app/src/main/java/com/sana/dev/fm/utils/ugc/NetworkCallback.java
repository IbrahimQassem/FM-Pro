package com.sana.dev.fm.utils.ugc;

public interface NetworkCallback {
    void onSuccess(Object result);

    void onError(NetworkError error);
}
