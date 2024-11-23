package com.sana.dev.fm.model;

public class UserBlock {
    private String docId;
    private String blockedUserId;
    private String blockedByUserId;
    private long timestamp;
    private String reason;

    public UserBlock() {
        // Required empty constructor for Firestore
    }

    public UserBlock(String docId,String blockedUserId, String blockedByUserId, String reason) {
        this.docId = docId;
        this.blockedUserId = blockedUserId;
        this.blockedByUserId = blockedByUserId;
        this.timestamp = System.currentTimeMillis();
        this.reason = reason;
    }

    // Getters and setters
    // ... (implement all getters and setters)


    public String getDocId() {
        return docId;
    }

    public void setDocId(String docId) {
        this.docId = docId;
    }

    public String getBlockedUserId() {
        return blockedUserId;
    }

    public void setBlockedUserId(String blockedUserId) {
        this.blockedUserId = blockedUserId;
    }

    public String getBlockedByUserId() {
        return blockedByUserId;
    }

    public void setBlockedByUserId(String blockedByUserId) {
        this.blockedByUserId = blockedByUserId;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}