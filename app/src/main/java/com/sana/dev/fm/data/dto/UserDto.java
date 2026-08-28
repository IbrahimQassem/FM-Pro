package com.sana.dev.fm.data.dto;

import com.google.firebase.Timestamp;
import com.google.firebase.firestore.DocumentId;
import com.google.firebase.firestore.IgnoreExtraProperties;
import com.google.firebase.firestore.ServerTimestamp;

/**
 * Data Transfer Object for Firestore 'users' documents.
 * Fully compatible with canonical schema and legacy fields.
 */
@IgnoreExtraProperties
public class UserDto {
    @DocumentId
    private String uid;
    private String displayName;
    private String username;
    private String email;
    private String phoneNumber;
    private String avatarUrl;
    private String bio;
    private String city;
    private String country;
    private String gender;
    private String authProvider;
    private String role;
    private boolean isOnline = false;
    private boolean isActive = true;
    private boolean isEmailVerified = false;
    private boolean isPhoneVerified = false;

    private Timestamp lastActiveAt;
    @ServerTimestamp
    private Timestamp createdAt;
    @ServerTimestamp
    private Timestamp updatedAt;

    public UserDto() {
    }

    public String getUid() { return uid; }
    public void setUid(String uid) { this.uid = uid; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getAuthProvider() { return authProvider; }
    public void setAuthProvider(String authProvider) { this.authProvider = authProvider; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public boolean isOnline() { return isOnline; }
    public void setOnline(boolean online) { isOnline = online; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { this.isActive = active; }

    public boolean isEmailVerified() { return isEmailVerified; }
    public void setEmailVerified(boolean emailVerified) { isEmailVerified = emailVerified; }

    public boolean isPhoneVerified() { return isPhoneVerified; }
    public void setPhoneVerified(boolean phoneVerified) { isPhoneVerified = phoneVerified; }

    public Timestamp getLastActiveAt() { return lastActiveAt; }
    public void setLastActiveAt(Timestamp lastActiveAt) { this.lastActiveAt = lastActiveAt; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public Timestamp getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Timestamp updatedAt) { this.updatedAt = updatedAt; }

    // --- Legacy Fallback Setters for Interoperability ---
    public void setName(String name) {
        if (this.displayName == null || this.displayName.isEmpty()) {
            this.displayName = name;
        }
    }

    public void setPhotoUrl(String photoUrl) {
        if (this.avatarUrl == null || this.avatarUrl.isEmpty()) {
            this.avatarUrl = photoUrl;
        }
    }

    public void setMobile(String mobile) {
        if (this.phoneNumber == null || this.phoneNumber.isEmpty()) {
            this.phoneNumber = mobile;
        }
    }

    public void setNickNme(String nickNme) {
        if (this.username == null || this.username.isEmpty()) {
            this.username = nickNme;
        }
    }

    public void setDisabled(boolean disabled) {
        this.isActive = !disabled;
    }

    public void setUserId(String userId) {
        if (this.uid == null || this.uid.isEmpty()) {
            this.uid = userId;
        }
    }

    public void setUserType(String userType) {
        if (this.role == null || this.role.isEmpty()) {
            this.role = "admin".equalsIgnoreCase(userType) ? "admin" : "listener";
        }
    }

    public void setVerified(boolean verified) {
        this.isEmailVerified = verified;
    }
}
