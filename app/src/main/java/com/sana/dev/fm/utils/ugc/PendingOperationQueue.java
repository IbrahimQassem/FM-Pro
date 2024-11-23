package com.sana.dev.fm.utils.ugc;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.util.LinkedList;
import java.util.Map;
import java.util.Queue;

public class PendingOperationQueue {
    private static final String PENDING_OPERATIONS_KEY = "pending_ugc_operations";
    private final SharedPreferences preferences;
    private final Gson gson;
    private final Queue<PendingOperation> operationQueue;

    public PendingOperationQueue(Context context) {
        this.preferences = context.getSharedPreferences("ugc_preferences", Context.MODE_PRIVATE);
        this.gson = new GsonBuilder().create();
        this.operationQueue = loadQueue();
    }

    private Queue<PendingOperation> loadQueue() {
        String jsonQueue = preferences.getString(PENDING_OPERATIONS_KEY, "[]");
        Type listType = new TypeToken<LinkedList<PendingOperation>>(){}.getType();
        LinkedList<PendingOperation> loaded = gson.fromJson(jsonQueue, listType);
        return loaded != null ? loaded : new LinkedList<>();
    }

    private void saveQueue() {
        String jsonQueue = gson.toJson(operationQueue);
        preferences.edit().putString(PENDING_OPERATIONS_KEY, jsonQueue).apply();
    }

    public void addOperation(PendingOperation operation) {
        operationQueue.offer(operation);
        saveQueue();
    }

    public PendingOperation peek() {
        return operationQueue.peek();
    }

    public PendingOperation poll() {
        PendingOperation operation = operationQueue.poll();
        saveQueue();
        return operation;
    }

    public boolean isEmpty() {
        return operationQueue.isEmpty();
    }

    public static class PendingOperation {
        private final String operationType;
        private final String commentId;
        private final Map<String, Object> data;
        private final long timestamp;

        public PendingOperation(String operationType, String commentId, Map<String, Object> data) {
            this.operationType = operationType;
            this.commentId = commentId;
            this.data = data;
            this.timestamp = System.currentTimeMillis();
        }

        public String getOperationType() {
            return operationType;
        }

        public String getCommentId() {
            return commentId;
        }

        public Map<String, Object> getData() {
            return data;
        }

        public long getTimestamp() {
            return timestamp;
        }
    }
}