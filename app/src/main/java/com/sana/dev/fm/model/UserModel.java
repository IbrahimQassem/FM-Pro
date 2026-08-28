package com.sana.dev.fm.model;

import androidx.annotation.NonNull;

import com.google.firebase.Timestamp;
import com.google.firebase.firestore.DocumentId;
import com.google.firebase.firestore.IgnoreExtraProperties;
import com.google.firebase.firestore.PropertyName;
import com.sana.dev.fm.model.enums.Gender;
import com.sana.dev.fm.model.enums.UserType;

import java.util.Date;

/**
 * Bulletproof, resilient UserModel supporting both canonical Firestore schema and legacy fields.
 */
@IgnoreExtraProperties
public class UserModel extends UserId {
    @DocumentId
    private String uid;
    private String id;
    private String name;
    private String displayName;
    private String email;
    private String mobile;
    private String phoneNumber;
    private String photoUrl;
    private String avatarUrl;
    private String nickNme;
    private String username;
    private String bio;
    private String tag;
    private String deviceId;
    private String stopNote;
    private String country;
    private String city;
    private String deviceToken;
    private String notificationToken;
    private String otherData;
    private String authProvider;
    private String role;
    private boolean isVerified = true;
    private boolean verified = true;
    private boolean isOnline = false;
    private boolean online = false;
    private boolean disabled = false;
    private boolean isActive = true;
    private long lastSignInTimestamp = 0;
    private Gender gender = Gender.UNKNOWN;
    private UserType userType = UserType.USER;
    private AuthMethod authMethod = AuthMethod.EMAIL;
    private Object createdAt;
    private Object updatedAt;
    private Object allowedPermissions;

    public UserModel() {
    }

    public UserModel(String userId, String name, String email, String mobile, String photoUrl,
                     String deviceToken, String nickNme, String bio, String tag, boolean isVerified,
                     boolean isOnline, boolean disabled, String deviceId, String stopNote,
                     Gender gender, String country, String city, long lastSignInTimestamp,
                     UserType userType, AuthMethod authMethod, String createdAt,
                     String notificationToken, String otherData, Object allowedPermissions) {
        this.userId = userId;
        this.uid = userId;
        this.id = userId;
        this.name = name;
        this.displayName = name;
        this.email = email;
        this.mobile = mobile;
        this.phoneNumber = mobile;
        this.photoUrl = photoUrl;
        this.avatarUrl = photoUrl;
        this.deviceToken = deviceToken;
        this.nickNme = nickNme;
        this.username = nickNme;
        this.bio = bio;
        this.tag = tag;
        this.isVerified = isVerified;
        this.verified = isVerified;
        this.isOnline = isOnline;
        this.online = isOnline;
        this.disabled = disabled;
        this.isActive = !disabled;
        this.deviceId = deviceId;
        this.stopNote = stopNote;
        this.gender = gender != null ? gender : Gender.UNKNOWN;
        this.country = country;
        this.city = city;
        this.lastSignInTimestamp = lastSignInTimestamp;
        this.userType = userType != null ? userType : UserType.USER;
        this.role = userType == UserType.SuperADMIN ? "superadmin" : (userType == UserType.ADMIN ? "admin" : "listener");
        this.authMethod = authMethod;
        this.createdAt = createdAt;
        this.notificationToken = notificationToken;
        this.otherData = otherData;
        this.allowedPermissions = allowedPermissions;
    }

    // --- ID & UID ---
    @PropertyName("uid")
    public String getUid() {
        if (uid != null && !uid.isEmpty()) return uid;
        if (userId != null && !userId.isEmpty()) return userId;
        if (id != null && !id.isEmpty()) return id;
        return "";
    }

    @PropertyName("uid")
    public void setUid(String uid) {
        this.uid = uid;
        this.userId = uid;
    }

    @PropertyName("id")
    public String getId() {
        if (id != null && !id.isEmpty()) return id;
        if (userId != null && !userId.isEmpty()) return userId;
        if (uid != null && !uid.isEmpty()) return uid;
        return "";
    }

    @PropertyName("id")
    public void setId(String id) {
        this.id = id;
        this.userId = id;
    }

    @Override
    public String getUserId() {
        if (userId != null && !userId.isEmpty()) return userId;
        if (uid != null && !uid.isEmpty()) return uid;
        if (id != null && !id.isEmpty()) return id;
        return "";
    }

    @Override
    public void setUserId(String userId) {
        this.userId = userId;
        this.uid = userId;
        this.id = userId;
    }

    // --- Display Name / Name ---
    @PropertyName("displayName")
    public String getDisplayName() {
        if (displayName != null && !displayName.isEmpty()) return displayName;
        if (name != null && !name.isEmpty()) return name;
        if (nickNme != null && !nickNme.isEmpty()) return nickNme;
        return "";
    }

    @PropertyName("displayName")
    public void setDisplayName(String displayName) {
        this.displayName = displayName;
        if (this.name == null || this.name.isEmpty()) {
            this.name = displayName;
        }
    }

    public String getName() {
        if (name != null && !name.isEmpty()) return name;
        if (displayName != null && !displayName.isEmpty()) return displayName;
        if (nickNme != null && !nickNme.isEmpty()) return nickNme;
        return "";
    }

    public void setName(String name) {
        this.name = name;
        if (this.displayName == null || this.displayName.isEmpty()) {
            this.displayName = name;
        }
    }

    // --- Email ---
    public String getEmail() {
        return email != null ? email : "";
    }

    public void setEmail(String email) {
        this.email = email;
    }

    // --- Phone Number / Mobile ---
    @PropertyName("phoneNumber")
    public String getPhoneNumber() {
        if (phoneNumber != null && !phoneNumber.isEmpty()) return phoneNumber;
        if (mobile != null && !mobile.isEmpty()) return mobile;
        return "";
    }

    @PropertyName("phoneNumber")
    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
        if (this.mobile == null || this.mobile.isEmpty()) {
            this.mobile = phoneNumber;
        }
    }

    public String getMobile() {
        if (mobile != null && !mobile.isEmpty()) return mobile;
        if (phoneNumber != null && !phoneNumber.isEmpty()) return phoneNumber;
        return "";
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
        if (this.phoneNumber == null || this.phoneNumber.isEmpty()) {
            this.phoneNumber = mobile;
        }
    }

    // --- Avatar URL / Photo URL ---
    @PropertyName("avatarUrl")
    public String getAvatarUrl() {
        if (avatarUrl != null && !avatarUrl.isEmpty()) return avatarUrl;
        if (photoUrl != null && !photoUrl.isEmpty()) return photoUrl;
        return "";
    }

    @PropertyName("avatarUrl")
    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
        if (this.photoUrl == null || this.photoUrl.isEmpty()) {
            this.photoUrl = avatarUrl;
        }
    }

    public String getPhotoUrl() {
        if (photoUrl != null && !photoUrl.isEmpty()) return photoUrl;
        if (avatarUrl != null && !avatarUrl.isEmpty()) return avatarUrl;
        return "";
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
        if (this.avatarUrl == null || this.avatarUrl.isEmpty()) {
            this.avatarUrl = photoUrl;
        }
    }

    // --- Username / NickName ---
    @PropertyName("username")
    public String getUsername() {
        if (username != null && !username.isEmpty()) return username;
        if (nickNme != null && !nickNme.isEmpty()) return nickNme;
        return "";
    }

    @PropertyName("username")
    public void setUsername(String username) {
        this.username = username;
        if (this.nickNme == null || this.nickNme.isEmpty()) {
            this.nickNme = username;
        }
    }

    public String getNickNme() {
        if (nickNme != null && !nickNme.isEmpty()) return nickNme;
        if (username != null && !username.isEmpty()) return username;
        return "";
    }

    public void setNickNme(String nickNme) {
        this.nickNme = nickNme;
        if (this.username == null || this.username.isEmpty()) {
            this.username = nickNme;
        }
    }

    public String getBio() {
        return bio != null ? bio : "";
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getStopNote() {
        return stopNote;
    }

    public void setStopNote(String stopNote) {
        this.stopNote = stopNote;
    }

    public String getCountry() {
        return country != null ? country : "";
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getCity() {
        return city != null ? city : "";
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getDeviceToken() {
        return deviceToken;
    }

    public void setDeviceToken(String deviceToken) {
        this.deviceToken = deviceToken;
    }

    public String getNotificationToken() {
        return notificationToken;
    }

    public void setNotificationToken(String notificationToken) {
        this.notificationToken = notificationToken;
    }

    public String getOtherData() {
        return otherData;
    }

    public void setOtherData(String otherData) {
        this.otherData = otherData;
    }

    public String getAuthProvider() {
        return authProvider != null ? authProvider : (otherData != null ? otherData : "google.com");
    }

    public void setAuthProvider(String authProvider) {
        this.authProvider = authProvider;
    }

    // --- Active / Disabled State ---
    @PropertyName("isActive")
    public boolean isActive() {
        return isActive && !disabled;
    }

    @PropertyName("isActive")
    public void setActive(boolean active) {
        this.isActive = active;
        this.disabled = !active;
    }

    public boolean isDisabled() {
        return disabled || !isActive;
    }

    public void setDisabled(boolean disabled) {
        this.disabled = disabled;
        this.isActive = !disabled;
    }

    public boolean isVerified() {
        return isVerified || verified;
    }

    public void setVerified(boolean verified) {
        this.isVerified = verified;
        this.verified = verified;
    }

    public boolean isOnline() {
        return isOnline || online;
    }

    public void setOnline(boolean online) {
        this.isOnline = online;
        this.online = online;
    }

    public long getLastSignInTimestamp() {
        return lastSignInTimestamp;
    }

    public void setLastSignInTimestamp(Object timestamp) {
        if (timestamp instanceof Number) {
            this.lastSignInTimestamp = ((Number) timestamp).longValue();
        } else if (timestamp instanceof Timestamp) {
            this.lastSignInTimestamp = ((Timestamp) timestamp).toDate().getTime();
        } else if (timestamp instanceof Date) {
            this.lastSignInTimestamp = ((Date) timestamp).getTime();
        }
    }

    public Gender getGender() {
        return gender != null ? gender : Gender.UNKNOWN;
    }

    public void setGender(Object genderObj) {
        if (genderObj instanceof Gender) {
            this.gender = (Gender) genderObj;
        } else if (genderObj instanceof String) {
            String gStr = ((String) genderObj).toUpperCase().trim();
            if ("MALE".equals(gStr)) this.gender = Gender.MALE;
            else if ("FEMALE".equals(gStr)) this.gender = Gender.FEMALE;
            else this.gender = Gender.UNKNOWN;
        } else {
            this.gender = Gender.UNKNOWN;
        }
    }

    // --- Role & UserType ---
    @PropertyName("role")
    public String getRole() {
        if (role != null && !role.isEmpty()) return role;
        if (userType == UserType.SuperADMIN) return "superadmin";
        if (userType == UserType.ADMIN) return "admin";
        return "listener";
    }

    @PropertyName("role")
    public void setRole(String role) {
        this.role = role;
        if ("superadmin".equalsIgnoreCase(role)) {
            this.userType = UserType.SuperADMIN;
        } else if ("admin".equalsIgnoreCase(role) || "editor".equalsIgnoreCase(role)) {
            this.userType = UserType.ADMIN;
        } else {
            this.userType = UserType.USER;
        }
    }

    public UserType getUserType() {
        if (userType != null) return userType;
        if ("superadmin".equalsIgnoreCase(role)) return UserType.SuperADMIN;
        if ("admin".equalsIgnoreCase(role) || "editor".equalsIgnoreCase(role)) return UserType.ADMIN;
        return UserType.USER;
    }

    public void setUserType(Object userTypeObj) {
        if (userTypeObj instanceof UserType) {
            this.userType = (UserType) userTypeObj;
            if (this.userType == UserType.SuperADMIN) this.role = "superadmin";
            else if (this.userType == UserType.ADMIN) this.role = "admin";
            else this.role = "listener";
        } else if (userTypeObj instanceof String) {
            String uStr = ((String) userTypeObj).trim();
            if ("SuperADMIN".equalsIgnoreCase(uStr) || "superadmin".equalsIgnoreCase(uStr)) {
                this.userType = UserType.SuperADMIN;
                this.role = "superadmin";
            } else if ("ADMIN".equalsIgnoreCase(uStr) || "admin".equalsIgnoreCase(uStr) || "editor".equalsIgnoreCase(uStr)) {
                this.userType = UserType.ADMIN;
                this.role = "admin";
            } else {
                this.userType = UserType.USER;
                this.role = "listener";
            }
        }
    }

    public AuthMethod getAuthMethod() {
        return authMethod != null ? authMethod : AuthMethod.EMAIL;
    }

    public void setAuthMethod(Object authMethodObj) {
        if (authMethodObj instanceof AuthMethod) {
            this.authMethod = (AuthMethod) authMethodObj;
        } else if (authMethodObj instanceof String) {
            String aStr = ((String) authMethodObj).toUpperCase().trim();
            if ("GOOGLE".equals(aStr)) this.authMethod = AuthMethod.GOOGLE;
            else if ("FACEBOOK".equals(aStr)) this.authMethod = AuthMethod.FACEBOOK;
            else if ("SMS".equals(aStr) || "PHONE".equals(aStr)) this.authMethod = AuthMethod.SMS;
            else this.authMethod = AuthMethod.EMAIL;
        }
    }

    public String getCreatedAt() {
        if (createdAt == null) return "";
        if (createdAt instanceof String) return (String) createdAt;
        if (createdAt instanceof Timestamp) return ((Timestamp) createdAt).toDate().toString();
        if (createdAt instanceof Date) return ((Date) createdAt).toString();
        return createdAt.toString();
    }

    public void setCreatedAt(Object createdAt) {
        this.createdAt = createdAt;
    }

    public Object getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Object updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Object getAllowedPermissions() {
        return allowedPermissions;
    }

    public void setAllowedPermissions(Object allowedPermissions) {
        this.allowedPermissions = allowedPermissions;
    }
}

class UserId {
    public String userId;
    public <T extends UserId> T withId(@NonNull final String id) {
        this.userId = id;
        return (T) this;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }
}
