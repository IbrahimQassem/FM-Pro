package com.sana.dev.fm.model;

//public enum Gender {
//    MALE,
//    FEMALE
//}


public enum Gender {
    MALE("MALE"),
    FEMALE("FEMALE"),
    UNKNOWN("UNKNOWN");

     private String text;

    Gender(String text) {
        this.text = text;
    }

    public String getText() {
        return this.text;
    }

    public boolean equalsName(String otherName) {
        // (otherName == null) check is not needed because name.equals(null) returns false
        return this.text.equals(otherName);
    }

    public static Gender fromString(String text) {
        for (Gender b : Gender.values()) {
            if (b.text.equalsIgnoreCase(text)) {
                return b;
            }
        }
        return null;
    }
}