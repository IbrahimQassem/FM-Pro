package com.sana.dev.fm.model;

import com.sana.dev.fm.data.mapper.UserMapper;
import com.sana.dev.fm.model.enums.Gender;
import com.sana.dev.fm.model.enums.UserType;

import org.junit.Test;

import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class UserModelContractTest {

    @Test
    public void userModel_bridgesCanonicalAndLegacyProperties() {
        UserModel user = new UserModel();

        // Set using canonical properties
        user.setDisplayName("إبراهيم القاسم");
        user.setAvatarUrl("https://img.com/avatar.webp");
        user.setPhoneNumber("+967775617017");
        user.setUsername("ibrahim_pro");
        user.setRole("admin");
        user.setActive(true);
        user.setUid("uid_canonical_123");

        // Verify canonical and legacy getters return harmonized data
        assertEquals("إبراهيم القاسم", user.getDisplayName());
        assertEquals("إبراهيم القاسم", user.getName());
        assertEquals("https://img.com/avatar.webp", user.getAvatarUrl());
        assertEquals("https://img.com/avatar.webp", user.getPhotoUrl());
        assertEquals("+967775617017", user.getPhoneNumber());
        assertEquals("+967775617017", user.getMobile());
        assertEquals("ibrahim_pro", user.getUsername());
        assertEquals("ibrahim_pro", user.getNickNme());
        assertEquals("admin", user.getRole());
        assertEquals(UserType.ADMIN, user.getUserType());
        assertTrue(user.isActive());
        assertFalse(user.isDisabled());
        assertEquals("uid_canonical_123", user.getUid());
        assertEquals("uid_canonical_123", user.getUserId());
    }

    @Test
    public void userModel_legacySetters_bridgeToCanonicalGetters() {
        UserModel user = new UserModel();

        // Set using legacy setters
        user.setName("سالم علي");
        user.setPhotoUrl("https://img.com/old_photo.jpg");
        user.setMobile("+967770001122");
        user.setNickNme("salem_legacy");
        user.setUserType(UserType.SuperADMIN);
        user.setDisabled(false);
        user.setUserId("uid_legacy_999");

        assertEquals("سالم علي", user.getDisplayName());
        assertEquals("https://img.com/old_photo.jpg", user.getAvatarUrl());
        assertEquals("+967770001122", user.getPhoneNumber());
        assertEquals("salem_legacy", user.getUsername());
        assertEquals("superadmin", user.getRole());
        assertTrue(user.isActive());
        assertFalse(user.isDisabled());
        assertEquals("uid_legacy_999", user.getUid());
    }

    @Test
    public void toCanonicalFirestoreMap_generatesStandardContractMap() {
        UserModel user = new UserModel();
        user.setUserId("user_test_01");
        user.setName("محمد طارق");
        user.setEmail("tareq@hudhudfm.com");
        user.setMobile("+967773334455");
        user.setPhotoUrl("https://img.com/tareq.webp");
        user.setGender(Gender.MALE);
        user.setUserType(UserType.USER);
        user.setVerified(true);
        user.setCity("صنعاء");
        user.setCountry("اليمن");

        Map<String, Object> map = UserMapper.toCanonicalFirestoreMap(user, true);

        assertNotNull(map);
        assertEquals("user_test_01", map.get("id"));
        assertEquals("user_test_01", map.get("uid"));
        assertEquals("محمد طارق", map.get("displayName"));
        assertEquals("tareq@hudhudfm.com", map.get("email"));
        assertEquals("tareq", map.get("username"));
        assertEquals("+967773334455", map.get("phoneNumber"));
        assertEquals("https://img.com/tareq.webp", map.get("avatarUrl"));
        assertEquals("listener", map.get("role"));
        assertEquals("صنعاء", map.get("city"));
        assertEquals("اليمن", map.get("country"));
        assertEquals("MALE", map.get("gender"));
        assertEquals(true, map.get("isActive"));
        assertEquals(true, map.get("isVerified"));
        assertNotNull(map.get("createdAt"));
        assertNotNull(map.get("updatedAt"));
    }
}
