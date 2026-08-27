package com.sana.dev.fm.domain.comment;

import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class CommentValidationPolicyTest {

    @Test
    public void validate_returnsUnauthenticated_whenUserIdIsNull() {
        assertEquals(
                CommentValidationPolicy.ValidationResult.UNAUTHENTICATED,
                CommentValidationPolicy.validate(null, "تعليق تجريبي")
        );
    }

    @Test
    public void validate_returnsUnauthenticated_whenUserIdIsEmpty() {
        assertEquals(
                CommentValidationPolicy.ValidationResult.UNAUTHENTICATED,
                CommentValidationPolicy.validate("   ", "تعليق تجريبي")
        );
    }

    @Test
    public void validate_returnsEmptyText_whenCommentTextIsNull() {
        assertEquals(
                CommentValidationPolicy.ValidationResult.EMPTY_TEXT,
                CommentValidationPolicy.validate("user_123", null)
        );
    }

    @Test
    public void validate_returnsEmptyText_whenCommentTextIsWhitespaceOnly() {
        assertEquals(
                CommentValidationPolicy.ValidationResult.EMPTY_TEXT,
                CommentValidationPolicy.validate("user_123", "   \n\t  ")
        );
    }

    @Test
    public void validate_returnsTextTooLong_whenExceedsMaxLength() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 501; i++) {
            sb.append("A");
        }
        assertEquals(
                CommentValidationPolicy.ValidationResult.TEXT_TOO_LONG,
                CommentValidationPolicy.validate("user_123", sb.toString())
        );
    }

    @Test
    public void validate_returnsValid_whenInputSatisfiesAllConstraints() {
        assertEquals(
                CommentValidationPolicy.ValidationResult.VALID,
                CommentValidationPolicy.validate("user_123", "برنامج ممتاز جداً ومفيد!")
        );
    }
}
