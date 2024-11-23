package com.sana.dev.fm.utils.ugc;

public class BlockUserOperation extends PendingOperation {
    private final String userId;
    private final String reason;

    public BlockUserOperation(String userId, String reason) {
        super(OperationType.BLOCK_USER, 3, 24); // 3 retries, expires in 24 hours
        this.userId = userId;
        this.reason = reason;
    }

    public String getUserId() {
        return userId;
    }

    public String getReason() {
        return reason;
    }
}
