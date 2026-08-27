package com.sana.dev.fm.domain.comment;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

/**
 * Domain policy for validating comments before submission to Firestore:
 * - Author user ID must be present and non-empty (ownership).
 * - Comment body must be non-empty and within reasonable length limits.
 */
public final class CommentValidationPolicy {

    public static final int MAX_COMMENT_LENGTH = 500;

    public enum ValidationResult {
        VALID,
        EMPTY_TEXT,
        TEXT_TOO_LONG,
        UNAUTHENTICATED
    }

    private CommentValidationPolicy() {
        // Utility class
    }

    @NonNull
    public static ValidationResult validate(@Nullable String userId, @Nullable String commentText) {
        if (userId == null || userId.trim().isEmpty()) {
            return ValidationResult.UNAUTHENTICATED;
        }

        if (commentText == null || commentText.trim().isEmpty()) {
            return ValidationResult.EMPTY_TEXT;
        }

        if (commentText.trim().length() > MAX_COMMENT_LENGTH) {
            return ValidationResult.TEXT_TOO_LONG;
        }

        return ValidationResult.VALID;
    }
}
