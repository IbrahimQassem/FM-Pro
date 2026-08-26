package com.sana.dev.fm.core.privacy;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.junit.Test;

public class CachedUserSessionSanitizerTest {
    @Test
    public void removesSensitiveFieldsFromCachedSession() {
        String sanitized = CachedUserSessionSanitizer.sanitize(
                "{\"userId\":\"user-1\",\"password\":\"secret\","
                        + "\"deviceId\":\"device\",\"deviceToken\":\"device-token\","
                        + "\"notificationToken\":\"fcm\",\"accessToken\":\"access\","
                        + "\"idToken\":\"id\",\"refreshToken\":\"refresh\"}"
        );

        JsonObject object = JsonParser.parseString(sanitized).getAsJsonObject();
        assertEquals("user-1", object.get("userId").getAsString());
        assertFalse(object.has("password"));
        assertFalse(object.has("deviceId"));
        assertFalse(object.has("deviceToken"));
        assertFalse(object.has("notificationToken"));
        assertFalse(object.has("accessToken"));
        assertFalse(object.has("idToken"));
        assertFalse(object.has("refreshToken"));
    }

    @Test
    public void preservesProfileFieldsNeededByOfflineUi() {
        String sanitized = CachedUserSessionSanitizer.sanitize(
                "{\"name\":\"Listener\",\"email\":\"listener@example.com\","
                        + "\"mobile\":\"123\",\"photoUrl\":\"https://example.com/avatar.png\","
                        + "\"userType\":\"USER\"}"
        );

        JsonObject object = JsonParser.parseString(sanitized).getAsJsonObject();
        assertTrue(object.has("name"));
        assertTrue(object.has("email"));
        assertTrue(object.has("mobile"));
        assertTrue(object.has("photoUrl"));
        assertTrue(object.has("userType"));
    }

    @Test
    public void rejectsInvalidOrNonObjectCacheValues() {
        assertNull(CachedUserSessionSanitizer.sanitize(null));
        assertNull(CachedUserSessionSanitizer.sanitize(""));
        assertNull(CachedUserSessionSanitizer.sanitize("not-json"));
        assertNull(CachedUserSessionSanitizer.sanitize("[]"));
    }
}
