package com.sana.dev.fm.core.result;

import java.io.Serializable;
import java.util.Objects;

/**
 * Immutable canonical error representation for FM-Pro.
 * Distinguishes recoverable domain and transport failures from unexpected crashes.
 */
public abstract class AppError implements Serializable {
    private final String message;
    private final Throwable cause;

    protected AppError(String message, Throwable cause) {
        this.message = message != null ? message : "";
        this.cause = cause;
    }

    public String getMessage() {
        return message;
    }

    public Throwable getCause() {
        return cause;
    }

    public static final class NetworkError extends AppError {
        public NetworkError(String message, Throwable cause) {
            super(message, cause);
        }

        public NetworkError(String message) {
            super(message, null);
        }
    }

    public static final class NotFoundError extends AppError {
        private final String resourceId;

        public NotFoundError(String resourceId, String message) {
            super(message, null);
            this.resourceId = resourceId != null ? resourceId : "";
        }

        public String getResourceId() {
            return resourceId;
        }
    }

    public static final class InvalidDataError extends AppError {
        private final String fieldName;

        public InvalidDataError(String fieldName, String message) {
            super(message, null);
            this.fieldName = fieldName != null ? fieldName : "";
        }

        public String getFieldName() {
            return fieldName;
        }
    }

    public static final class PermissionDeniedError extends AppError {
        public PermissionDeniedError(String message) {
            super(message, null);
        }

        public PermissionDeniedError(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public static final class UnknownError extends AppError {
        public UnknownError(String message, Throwable cause) {
            super(message, cause);
        }

        public UnknownError(String message) {
            super(message, null);
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AppError appError = (AppError) o;
        return Objects.equals(message, appError.message);
    }

    @Override
    public int hashCode() {
        return Objects.hash(getClass(), message);
    }

    @Override
    public String toString() {
        return getClass().getSimpleName() + "{message='" + message + "'}";
    }
}
