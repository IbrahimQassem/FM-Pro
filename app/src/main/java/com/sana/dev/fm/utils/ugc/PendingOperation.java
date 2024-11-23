package com.sana.dev.fm.utils.ugc;

import java.util.Date;
import java.util.UUID;

public abstract class PendingOperation {
    private final String operationId;
    private final OperationType type;
    private final Date createdAt;
    private final Date expiresAt;
    private int retryCount;
    private final int maxRetries;

    public PendingOperation(OperationType type, int maxRetries, int expiryHours) {
        this.operationId = UUID.randomUUID().toString();
        this.type = type;
        this.createdAt = new Date();
        this.expiresAt = null;//DateUtils.addHours(this.createdAt, expiryHours);
        this.retryCount = 0;
        this.maxRetries = maxRetries;
    }

    public String getOperationId() {
        return operationId;
    }

    public OperationType getType() {
        return type;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public boolean isExpired() {
        return new Date().after(expiresAt);
    }

    public int getRetryCount() {
        return retryCount;
    }

    public void incrementRetryCount() {
        this.retryCount++;
    }

    public int getMaxRetries() {
        return maxRetries;
    }
}
