# Flutter ProGuard / R8 Rules for HudHud FM

# Audio Playback & Background Service
-keep class com.ryanheise.audioservice.** { *; }
-keep class com.ryanheise.just_audio.** { *; }
-dontwarn com.ryanheise.just_audio.**
-dontwarn com.ryanheise.audioservice.**

# Firebase & Google Services
-keepattributes *Annotation*,InnerClasses,Signature,EnclosingMethod
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Facebook SDK
-keep class com.facebook.** { *; }
-keepclassmembers class * extends com.facebook.FacebookException { *; }
-dontwarn com.facebook.**

# Media & Image Picker
-keep class io.flutter.plugins.imagepicker.** { *; }
