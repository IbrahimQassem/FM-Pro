package com.sana.dev.fm.data.mapper;

import com.google.firebase.Timestamp;
import com.google.firebase.firestore.FieldValue;
import com.sana.dev.fm.data.dto.UserDto;
import com.sana.dev.fm.domain.model.User;
import com.sana.dev.fm.model.UserModel;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Defensive null-safe mapper for UserDto -> User domain model and Canonical Firestore Maps.
 */
public final class UserMapper {

    private UserMapper() {
    }

    public static User toDomain(UserDto dto, String fallbackUid) {
        if (dto == null) {
            return new User(
                    fallbackUid != null ? fallbackUid : "",
                    "", "", "", "", "", "", "", "", "unspecified",
                    "", "listener", false, false, false, false, 0, 0
            );
        }

        String uid = dto.getUid() != null && !dto.getUid().trim().isEmpty()
                ? dto.getUid()
                : (fallbackUid != null ? fallbackUid : "");

        long lastActiveAtMillis = toMillis(dto.getLastActiveAt());
        long createdAtMillis = toMillis(dto.getCreatedAt());

        return new User(
                uid,
                dto.getDisplayName(),
                dto.getUsername(),
                dto.getEmail(),
                dto.getPhoneNumber(),
                dto.getAvatarUrl(),
                dto.getBio(),
                dto.getCity(),
                dto.getCountry(),
                dto.getGender(),
                dto.getAuthProvider(),
                dto.getRole(),
                dto.isOnline(),
                dto.isActive(),
                dto.isEmailVerified(),
                dto.isPhoneVerified(),
                lastActiveAtMillis,
                createdAtMillis
        );
    }

    public static List<User> toDomainList(List<UserDto> dtos) {
        if (dtos == null) return new ArrayList<>();
        List<User> list = new ArrayList<>(dtos.size());
        for (UserDto dto : dtos) {
            if (dto != null) {
                list.add(toDomain(dto, null));
            }
        }
        return list;
    }

    public static Map<String, Object> toCanonicalFirestoreMap(UserModel model, boolean isNewUser) {
        Map<String, Object> map = new HashMap<>();
        if (model == null) return map;

        String uid = model.getUserId() != null ? model.getUserId() : "";
        String name = model.getName() != null ? model.getName() : "";
        String email = model.getEmail() != null ? model.getEmail() : "";
        String phone = model.getPhoneNumber() != null ? model.getPhoneNumber() : "";
        String photo = model.getAvatarUrl() != null ? model.getAvatarUrl() : "";
        String username = model.getUsername() != null && !model.getUsername().isEmpty()
                ? model.getUsername()
                : (email.contains("@") ? email.split("@")[0] : uid);
        String role = model.getRole() != null ? model.getRole() : "listener";
        String city = model.getCity() != null ? model.getCity() : "";
        String country = model.getCountry() != null && !model.getCountry().isEmpty() ? model.getCountry() : "اليمن";
        String gender = model.getGender() != null ? model.getGender().name() : "UNKNOWN";
        String authProvider = model.getOtherData() != null ? model.getOtherData() : "google.com";

        // Canonical contract properties
        map.put("id", uid);
        map.put("uid", uid);
        map.put("displayName", name);
        map.put("username", username);
        map.put("email", email);
        map.put("phoneNumber", phone);
        map.put("avatarUrl", photo);
        map.put("role", role);
        map.put("city", city);
        map.put("country", country);
        map.put("gender", gender);
        map.put("authProvider", authProvider);
        map.put("isActive", model.isActive());
        map.put("isVerified", model.isVerified());
        map.put("isOnline", model.isOnline());

        // Legacy compatibility properties
        map.put("userId", uid);
        map.put("name", name);
        map.put("mobile", phone);
        map.put("photoUrl", photo);
        map.put("nickNme", username);
        map.put("disabled", model.isDisabled());
        map.put("userType", model.getUserType() != null ? model.getUserType().name() : "USER");

        if (isNewUser) {
            map.put("createdAt", FieldValue.serverTimestamp());
        }
        map.put("updatedAt", FieldValue.serverTimestamp());

        return map;
    }

    private static long toMillis(Timestamp timestamp) {
        if (timestamp == null) return 0;
        return timestamp.toDate().getTime();
    }
}
