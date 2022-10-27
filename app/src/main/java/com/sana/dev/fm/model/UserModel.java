package com.sana.dev.fm.model;

import androidx.annotation.NonNull;

import com.google.firebase.firestore.ServerTimestamp;


import java.util.Date;

/**
 * Created by Ibrahim on 22/2/18.
 */

public class UserModel extends UserId {
    private String name, email, mobile, password, photoUrl, nickNme, bio, tag, deviceId, stopNote, country, city, deviceToken,notificationToken,otherDate;
    private boolean isVerified, isOnline, isStopped;
    private long lastSignInTimestamp;
    private Gender gender;
    private UserType userType;
//    @ServerTimestamp
    private String createdAt;

    public UserModel() {
    }

    public UserModel(String userId, String name, String email, String mobile, String password, String photoUrl, String deviceToken, String nickNme, String bio, String tag, boolean isVerified, boolean isOnline, boolean isStopped, String deviceId, String stopNote, Gender gender, String country, String city, long lastSignInTimestamp, UserType userType,String createdAt,String notificationToken,String otherDate) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.mobile = mobile;
        this.password = password;
        this.photoUrl = photoUrl;
        this.deviceToken = deviceToken;
        this.nickNme = nickNme;
        this.bio = bio;
        this.tag = tag;
        this.isVerified = isVerified;
        this.isOnline = isOnline;
        this.isStopped = isStopped;
        this.deviceId = deviceId;
        this.stopNote = stopNote;
        this.gender = gender;
        this.country = country;
        this.city = city;
        this.lastSignInTimestamp = lastSignInTimestamp;
        this.userType = userType;
        this.createdAt = createdAt;
        this.notificationToken = notificationToken;
        this.otherDate = otherDate;
    }

    @Override
    public String toString() {
        return "UserModel{" +
                "name='" + name + '\'' +
                ", email='" + email + '\'' +
                ", mobile='" + mobile + '\'' +
                ", password='" + password + '\'' +
                ", photoUrl='" + photoUrl + '\'' +
                ", nickNme='" + nickNme + '\'' +
                ", bio='" + bio + '\'' +
                ", tag='" + tag + '\'' +
                ", deviceId='" + deviceId + '\'' +
                ", stopNote='" + stopNote + '\'' +
                ", country='" + country + '\'' +
                ", city='" + city + '\'' +
                ", deviceToken='" + deviceToken + '\'' +
                ", notificationToken='" + notificationToken + '\'' +
                ", otherDate='" + otherDate + '\'' +
                ", isVerified=" + isVerified +
                ", isOnline=" + isOnline +
                ", isStopped=" + isStopped +
                ", lastSignInTimestamp=" + lastSignInTimestamp +
                ", gender=" + gender +
                ", userType=" + userType +
                ", createdAt=" + createdAt +
                ", userId='" + userId + '\'' +
                '}';
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }

    public String getNickNme() {
        return nickNme;
    }

    public void setNickNme(String nickNme) {
        this.nickNme = nickNme;
    }

    public String getBio() {
        return bio;
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
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getCity() {
        return city;
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

    public String getOtherDate() {
        return otherDate;
    }

    public void setOtherDate(String otherDate) {
        this.otherDate = otherDate;
    }

    public boolean isVerified() {
        return isVerified;
    }

    public void setVerified(boolean verified) {
        isVerified = verified;
    }

    public boolean isOnline() {
        return isOnline;
    }

    public void setOnline(boolean online) {
        isOnline = online;
    }

    public boolean isStopped() {
        return isStopped;
    }

    public void setStopped(boolean stopped) {
        isStopped = stopped;
    }

    public long getLastSignInTimestamp() {
        return lastSignInTimestamp;
    }

    public void setLastSignInTimestamp(long lastSignInTimestamp) {
        this.lastSignInTimestamp = lastSignInTimestamp;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public UserType getUserType() {
        return userType;
    }

    public void setUserType(UserType userType) {
        this.userType = userType;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
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

