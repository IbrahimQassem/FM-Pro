package com.sana.dev.fm.model;


import com.google.firebase.firestore.Exclude;

import java.io.Serializable;

public class Note implements Serializable {
    private String documentId;
    private String title;
    private String description;

//    @ServerTimestamp
//    private Date time;

    public Note() {
        //public no-arg constructor needed
    }

    @Exclude
    public String getDocumentId() {
        return documentId;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
    }

    public Note(String title, String description) {
        this.title = title;
        this.description = description;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }
}