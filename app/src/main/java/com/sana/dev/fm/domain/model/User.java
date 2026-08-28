package com.sana.dev.fm.domain.model;

import java.io.Serializable;
import java.util.Objects;

/**
 * Pure canonical domain model for a User.
 * Immutable, null-safe, with no Android/Firebase framework dependencies.
 */
public final class User implements Serializable {
    private final String uid;
    private final String displayName;
    private final String username;
    private final String email;
    private final String phoneNumber;
    private final String avatarUrl;
    private final String bio;
    private final String city;
    private final String country;
    private final String gender;
    private final String authProvider;
    private final String role;
    private final boolean isOnline;
    private final boolean isActive;
    private final boolean isEmailVerified;
    private final boolean isPhoneVerified;
    private final long lastActiveAtMillis;
    private final long createdAtMillis;

    public User(String uid,
                String displayName,
                String username,
                String email,
                String phoneNumber,
                String avatarUrl,
                String bio,
                String city,
                String country,
                String gender,
                String authProvider,
                String role,
                boolean isOnline,
                boolean isActive,
                boolean isEmailVerified,
                boolean isPhoneVerified,
                long lastActiveAtMillis,
                long createdAtMillis) {
        this.uid = uid != null ? uid : "";
        this.displayName = displayName != null ? displayName : "";
        this.username = username != null ? username : "";
        this.email = email != null ? email : "";
        this.phoneNumber = phoneNumber != null ? phoneNumber : "";
        this.avatarUrl = avatarUrl != null ? avatarUrl : "";
        this.bio = bio != null ? bio : "";
        this.city = city != null ? city : "";
        this.country = country != null ? country : "";
        this.gender = gender != null ? gender : "unspecified";
        this.authProvider = authProvider != null ? authProvider : "";
        this.role = role != null ? role : "listener";
        this.isOnline = isOnline;
        this.isActive = isActive;
        this.isEmailVerified = isEmailVerified;
        this.isPhoneVerified = isPhoneVerified;
        this.lastActiveAtMillis = Math.max(0, lastActiveAtMillis);
        this.createdAtMillis = Math.max(0, createdAtMillis);
    }

    public String getUid() { return uid; }
    public String getDisplayName() { return displayName; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getAvatarUrl() { return avatarUrl; }
    public String getBio() { return bio; }
    public String getCity() { return city; }
    public String getCountry() { return country; }
    public String getGender() { return gender; }
    public String getAuthProvider() { return authProvider; }
    public String getRole() { return role; }
    public boolean isOnline() { return isOnline; }
    public boolean isActive() { return isActive; }
    public boolean isEmailVerified() { return isEmailVerified; }
    public boolean isPhoneVerified() { return isPhoneVerified; }
    public long getLastActiveAtMillis() { return lastActiveAtMillis; }
    public long getCreatedAtMillis() { return createdAtMillis; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return isOnline == user.isOnline &&
                isActive == user.isActive &&
                isEmailVerified == user.isEmailVerified &&
                isPhoneVerified == user.isPhoneVerified &&
                lastActiveAtMillis == user.lastActiveAtMillis &&
                createdAtMillis == user.createdAtMillis &&
                Objects.equals(uid, user.uid) &&
                Objects.equals(displayName, user.displayName) &&
                Objects.equals(username, user.username) &&
                Objects.equals(email, user.email) &&
                Objects.equals(phoneNumber, user.phoneNumber) &&
                Objects.equals(avatarUrl, user.avatarUrl) &&
                Objects.equals(bio, user.bio) &&
                Objects.equals(city, user.city) &&
                Objects.equals(country, user.country) &&
                Objects.equals(gender, user.gender) &&
                Objects.equals(authProvider, user.authProvider) &&
                Objects.equals(role, user.role);
    }

    @Override
    public int hashCode() {
        return Objects.hash(uid, displayName, username, email, phoneNumber, avatarUrl,
                bio, city, country, gender, authProvider, role, isOnline, isActive,
                isEmailVerified, isPhoneVerified, lastActiveAtMillis, createdAtMillis);
    }

    @Override
    public String toString() {
        return "User{" +
                "uid='" + uid + '\'' +
                ", displayName='" + displayName + '\'' +
                ", role='" + role + '\'' +
                ", isActive=" + isActive +
                '}';
    }
}
