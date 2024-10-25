package com.sana.dev.fm.model;

import android.os.Parcel;
import android.os.Parcelable;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DestinationModel implements Parcelable {
    private String id;
    private String name;
    private String location;
    private String imageUrl;
    private String description;
    private float rating;
    private double price;
    private int duration;
    private int priority;
    private List<String> tags;
    private String region;
    private List<String> images;
    private Map<String, String> schedule;

    public DestinationModel() {
    }

    public DestinationModel(String id, String name, String location, String imageUrl,
                            String description, float rating, double price, int duration,int priority,
                            List<String> tags, String region) {
        this.id = id;
        this.name = name;
        this.location = location;
        this.imageUrl = imageUrl;
        this.description = description;
        this.rating = rating;
        this.price = price;
        this.duration = duration;
        this.priority = priority;
        this.tags = tags;
        this.region = region;
        this.images = new ArrayList<>();
        this.schedule = new HashMap<>();
    }

    // Implement Parcelable methods
    protected DestinationModel(Parcel in) {
        id = in.readString();
        name = in.readString();
        location = in.readString();
        imageUrl = in.readString();
        description = in.readString();
        rating = in.readFloat();
        price = in.readDouble();
        duration = in.readInt();
        priority = in.readInt();
        tags = in.createStringArrayList();
        region = in.readString();
        images = in.createStringArrayList();
    }


    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeString(id);
        dest.writeString(name);
        dest.writeString(location);
        dest.writeString(imageUrl);
        dest.writeString(description);
        dest.writeFloat(rating);
        dest.writeDouble(price);
        dest.writeInt(duration);
        dest.writeInt(priority);
        dest.writeStringList(tags);
        dest.writeString(region);
        dest.writeStringList(images);
    }

    @Override
    public int describeContents() {
        return 0;
    }

    public static final Creator<DestinationModel> CREATOR = new Creator<DestinationModel>() {
        @Override
        public DestinationModel createFromParcel(Parcel in) {
            return new DestinationModel(in);
        }

        @Override
        public DestinationModel[] newArray(int size) {
            return new DestinationModel[size];
        }
    };

    // Getters and setters

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public float getRating() {
        return rating;
    }

    public void setRating(float rating) {
        this.rating = rating;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public int getDuration() {
        return duration;
    }

    public void setDuration(int duration) {
        this.duration = duration;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }

    public Map<String, String> getSchedule() {
        return schedule;
    }

    public void setSchedule(Map<String, String> schedule) {
        this.schedule = schedule;
    }
}
