package com.sana.dev.fm.utils.ugc;

public class UnblockUserOperation extends PendingOperation {
    private final String userId;

    public UnblockUserOperation(String userId) {
        super(OperationType.UNBLOCK_USER, 3, 24);
        this.userId = userId;
    }

    public String getUserId() {
        return userId;
    }
}
