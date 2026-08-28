package com.sana.dev.fm.data.mapper;

import com.google.firebase.Timestamp;
import com.sana.dev.fm.data.dto.UserDto;
import com.sana.dev.fm.domain.model.User;

import java.util.ArrayList;
import java.util.List;

/**
 * Defensive null-safe mapper for UserDto -> User domain model.
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

    private static long toMillis(Timestamp timestamp) {
        if (timestamp == null) return 0;
        return timestamp.toDate().getTime();
    }
}
