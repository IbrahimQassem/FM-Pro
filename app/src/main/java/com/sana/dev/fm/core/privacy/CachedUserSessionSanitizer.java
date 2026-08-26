package com.sana.dev.fm.core.privacy;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonSyntaxException;

public final class CachedUserSessionSanitizer {
    private static final String[] SENSITIVE_FIELDS = {
            "password",
            "deviceId",
            "deviceToken",
            "notificationToken",
            "accessToken",
            "idToken",
            "refreshToken"
    };

    private CachedUserSessionSanitizer() {
    }

    public static String sanitize(String json) {
        if (json == null || json.trim().isEmpty()) {
            return null;
        }

        try {
            JsonElement element = JsonParser.parseString(json);
            if (!element.isJsonObject()) {
                return null;
            }

            JsonObject object = element.getAsJsonObject();
            for (String field : SENSITIVE_FIELDS) {
                object.remove(field);
            }
            return object.toString();
        } catch (JsonSyntaxException | IllegalStateException exception) {
            return null;
        }
    }
}
