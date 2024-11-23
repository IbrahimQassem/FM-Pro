package com.sana.dev.fm.utils.ugc;

public class NetworkError extends Exception {
    private final NetworkErrorType type;
    private final String details;
    private final int statusCode;

    public NetworkError(NetworkErrorType type) {
        this(type, null, 0);
    }

    public NetworkError(NetworkErrorType type, String details, int statusCode) {
        super(details);
        this.type = type;
        this.details = details;
        this.statusCode = statusCode;
    }

    public NetworkErrorType getType() {
        return type;
    }

    public String getDetails() {
        return details;
    }

    public int getStatusCode() {
        return statusCode;
    }
}
