package com.sana.dev.fm.data.mapper;

import com.google.firebase.Timestamp;
import com.sana.dev.fm.data.dto.UserDto;
import com.sana.dev.fm.domain.model.User;

import org.junit.Test;

import java.util.Date;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class UserMapperTest {

    @Test
    public void toDomain_withNullDto_returnsSafeEmptyUser() {
        User user = UserMapper.toDomain(null, "uid_fallback");

        assertNotNull(user);
        assertEquals("uid_fallback", user.getUid());
        assertEquals("", user.getDisplayName());
        assertEquals("", user.getEmail());
        assertEquals("unspecified", user.getGender());
        assertEquals("listener", user.getRole());
        assertFalse(user.isOnline());
        assertFalse(user.isActive());
    }

    @Test
    public void toDomain_withCompleteDto_mapsAllFieldsCorrectly() {
        UserDto dto = new UserDto();
        dto.setUid("uid_555");
        dto.setDisplayName("سالم عبد الله");
        dto.setUsername("salem_fm");
        dto.setEmail("salem@example.com");
        dto.setPhoneNumber("+967771234567");
        dto.setAvatarUrl("https://img.example.com/avatar.webp");
        dto.setBio("مستمع ومحب للبرامج الثقافية");
        dto.setCity("تعز");
        dto.setCountry("اليمن");
        dto.setGender("MALE");
        dto.setAuthProvider("google.com");
        dto.setRole("listener");
        dto.setOnline(true);
        dto.setActive(true);
        dto.setEmailVerified(true);
        dto.setPhoneVerified(true);

        Date now = new Date(1710000000000L);
        dto.setLastActiveAt(new Timestamp(now));
        dto.setCreatedAt(new Timestamp(now));

        User user = UserMapper.toDomain(dto, null);

        assertNotNull(user);
        assertEquals("uid_555", user.getUid());
        assertEquals("سالم عبد الله", user.getDisplayName());
        assertEquals("salem_fm", user.getUsername());
        assertEquals("salem@example.com", user.getEmail());
        assertEquals("+967771234567", user.getPhoneNumber());
        assertEquals("https://img.example.com/avatar.webp", user.getAvatarUrl());
        assertEquals("مستمع ومحب للبرامج الثقافية", user.getBio());
        assertEquals("تعز", user.getCity());
        assertEquals("اليمن", user.getCountry());
        assertEquals("MALE", user.getGender());
        assertEquals("google.com", user.getAuthProvider());
        assertEquals("listener", user.getRole());
        assertTrue(user.isOnline());
        assertTrue(user.isActive());
        assertTrue(user.isEmailVerified());
        assertTrue(user.isPhoneVerified());
        assertEquals(1710000000000L, user.getLastActiveAtMillis());
        assertEquals(1710000000000L, user.getCreatedAtMillis());
    }
}
