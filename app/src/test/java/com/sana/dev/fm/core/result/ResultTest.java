package com.sana.dev.fm.core.result;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

public class ResultTest {

    @Test
    public void successResult_containsDataAndNoErrors() {
        Result<String> result = Result.success("test_data");

        assertTrue(result.isSuccess());
        assertFalse(result.isFailure());
        assertEquals("test_data", result.getDataOrNull());
        assertNull(result.getErrorOrNull());
    }

    @Test
    public void failureResult_containsErrorAndNoData() {
        AppError error = new AppError.NetworkError("Network unreachable");
        Result<String> result = Result.failure(error);

        assertFalse(result.isSuccess());
        assertTrue(result.isFailure());
        assertNull(result.getDataOrNull());
        assertEquals(error, result.getErrorOrNull());
        assertEquals("Network unreachable", result.getErrorOrNull().getMessage());
    }

    @Test
    public void map_transformsSuccessData() {
        Result<Integer> success = Result.success(42);
        Result<String> mapped = success.map(Object::toString);

        assertTrue(mapped.isSuccess());
        assertEquals("42", mapped.getDataOrNull());
    }

    @Test
    public void map_propagatesFailure() {
        AppError error = new AppError.NotFoundError("id_123", "Item not found");
        Result<Integer> failure = Result.failure(error);
        Result<String> mapped = failure.map(Object::toString);

        assertTrue(mapped.isFailure());
        assertEquals(error, mapped.getErrorOrNull());
        assertTrue(mapped.getErrorOrNull() instanceof AppError.NotFoundError);
        assertEquals("id_123", ((AppError.NotFoundError) mapped.getErrorOrNull()).getResourceId());
    }

    @Test
    public void appErrorTypes_verifyPayloadsAndIntegrity() {
        AppError.InvalidDataError invalid = new AppError.InvalidDataError("prName", "Name is mandatory");
        assertEquals("prName", invalid.getFieldName());
        assertEquals("Name is mandatory", invalid.getMessage());

        AppError.PermissionDeniedError denied = new AppError.PermissionDeniedError("Admin role required");
        assertEquals("Admin role required", denied.getMessage());

        AppError.UnknownError unknown = new AppError.UnknownError("Unexpected crash");
        assertNotNull(unknown.getMessage());
    }
}
