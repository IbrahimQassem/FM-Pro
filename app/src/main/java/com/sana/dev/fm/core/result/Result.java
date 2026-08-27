package com.sana.dev.fm.core.result;

import java.io.Serializable;
import java.util.Objects;

/**
 * Functional result type representing either a successful outcome containing data of type T,
 * or a failure containing an AppError.
 *
 * @param <T> The payload data type
 */
public abstract class Result<T> implements Serializable {

    private Result() {
    }

    public abstract boolean isSuccess();

    public boolean isFailure() {
        return !isSuccess();
    }

    public abstract T getDataOrNull();

    public abstract AppError getErrorOrNull();

    public static <T> Result<T> success(T data) {
        return new Success<>(data);
    }

    public static <T> Result<T> failure(AppError error) {
        return new Failure<>(error);
    }

    public interface Function<I, O> {
        O apply(I input);
    }

    public <R> Result<R> map(Function<T, R> transform) {
        if (isSuccess()) {
            return Result.success(transform.apply(getDataOrNull()));
        } else {
            return Result.failure(getErrorOrNull());
        }
    }

    public static final class Success<T> extends Result<T> {
        private final T data;

        public Success(T data) {
            this.data = data;
        }

        @Override
        public boolean isSuccess() {
            return true;
        }

        @Override
        public T getDataOrNull() {
            return data;
        }

        @Override
        public AppError getErrorOrNull() {
            return null;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            Success<?> success = (Success<?>) o;
            return Objects.equals(data, success.data);
        }

        @Override
        public int hashCode() {
            return Objects.hash(data);
        }

        @Override
        public String toString() {
            return "Success{data=" + data + '}';
        }
    }

    public static final class Failure<T> extends Result<T> {
        private final AppError error;

        public Failure(AppError error) {
            this.error = error != null ? error : new AppError.UnknownError("Unknown error occurred");
        }

        @Override
        public boolean isSuccess() {
            return false;
        }

        @Override
        public T getDataOrNull() {
            return null;
        }

        @Override
        public AppError getErrorOrNull() {
            return error;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            Failure<?> failure = (Failure<?>) o;
            return Objects.equals(error, failure.error);
        }

        @Override
        public int hashCode() {
            return Objects.hash(error);
        }

        @Override
        public String toString() {
            return "Failure{error=" + error + '}';
        }
    }
}
