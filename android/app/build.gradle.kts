import java.util.Properties

plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val authProviderProperties = Properties().apply {
    val localFile = rootProject.file("auth-providers.properties")
    if (localFile.exists()) {
        localFile.inputStream().use { input -> load(input) }
    }
}
val authProviderProperty: (String) -> String = { name ->
    providers.gradleProperty(name)
        .orElse(authProviderProperties.getProperty(name, "0"))
        .get()
}

android {
    namespace = "com.sanaadev.hudhudfm"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    buildFeatures {
        resValues = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.sanaadev.hudhudfm"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        resValue(
            "string",
            "facebook_app_id",
            authProviderProperty("HUDHUD_FACEBOOK_APP_ID"),
        )
        resValue(
            "string",
            "facebook_client_token",
            authProviderProperty("HUDHUD_FACEBOOK_CLIENT_TOKEN"),
        )
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
