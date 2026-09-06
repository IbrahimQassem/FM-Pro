import java.util.Properties
import java.util.Base64

plugins {
    id("com.android.application")
    kotlin("android")
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
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

val keystoreProperties = Properties().apply {
    val keyFile = rootProject.file("key.properties")
    if (keyFile.exists()) {
        keyFile.inputStream().use { input -> load(input) }
    }
}

android {
    namespace = "com.sanaadev.hudhudfm"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = "28.2.13676358"

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

    signingConfigs {
        create("release") {
            val keyAliasProp = keystoreProperties.getProperty("keyAlias")
            val keyPasswordProp = keystoreProperties.getProperty("keyPassword")
            val storeFileProp = keystoreProperties.getProperty("storeFile")
            val storePasswordProp = keystoreProperties.getProperty("storePassword")

            keyAlias = keyAliasProp
            keyPassword = keyPasswordProp
            storeFile = storeFileProp?.takeIf { it.isNotBlank() }?.let(rootProject::file)
            storePassword = storePasswordProp
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

val releaseDartDefines = providers.gradleProperty("dart-defines").orElse("")
val validateProductionEnvironment = tasks.register("validateProductionEnvironment") {
    group = "verification"
    description = "Rejects release builds targeting a non-production Firestore root."
    doLast {
        val definitions = try {
            releaseDartDefines.get().split(',').filter { it.isNotBlank() }.map {
                String(Base64.getDecoder().decode(it), Charsets.UTF_8)
            }
        } catch (_: IllegalArgumentException) {
            throw GradleException("Release dart-defines must use valid Base64 encoding.")
        }
        check(definitions.filter { it.substringBefore('=') == "FIRESTORE_ROOT" }.all {
            it == "FIRESTORE_ROOT=HudHudOfficial"
        }) {
            "Release FIRESTORE_ROOT must be HudHudOfficial."
        }
    }
}

val validateProductionSigning = tasks.register("validateProductionSigning") {
    group = "verification"
    description = "Rejects missing or debug signing configuration for release builds."
    dependsOn(validateProductionEnvironment)
    doLast {
        val requiredProperties = listOf("keyAlias", "keyPassword", "storeFile", "storePassword")
        check(requiredProperties.all { !keystoreProperties.getProperty(it).isNullOrBlank() }) {
            "Release requires complete production signing in android/key.properties."
        }
        val releaseSigning = android.signingConfigs.getByName("release")
        val debugSigning = android.signingConfigs.getByName("debug")
        check(releaseSigning.storeFile?.isFile == true) {
            "Release requires an existing production keystore."
        }
        check(
            !releaseSigning.keyAlias.equals("androiddebugkey", ignoreCase = true) &&
                releaseSigning.storeFile?.name != "debug.keystore" &&
                releaseSigning.storeFile?.canonicalFile != debugSigning.storeFile?.canonicalFile
        ) {
            "Release must not use the Android debug signing key."
        }
    }
}

tasks.configureEach {
    if (name == "preReleaseBuild" || name == "validateSigningRelease") {
        dependsOn(validateProductionSigning)
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
