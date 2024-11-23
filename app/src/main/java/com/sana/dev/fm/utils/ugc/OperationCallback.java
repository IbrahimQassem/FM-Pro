package com.sana.dev.fm.utils.ugc;

public interface OperationCallback {
    void onComplete(String operationId);

    void onFailed(String operationId, String error);
}
