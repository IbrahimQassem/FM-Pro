allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
    if (project.name == "audio_session") {
        plugins.withId("com.android.library") {
            if (!plugins.hasPlugin("org.jetbrains.kotlin.android")) {
                plugins.apply("org.jetbrains.kotlin.android")
            }
        }
    }
    if (project.name == "flutter_facebook_auth") {
        plugins.withId("com.android.library") {
            extensions.configure<com.android.build.api.variant.LibraryAndroidComponentsExtension> {
                // 7.1.6 leaves Java at 11 while Flutter configures Kotlin at 17.
                // Remove this scoped compatibility fix when the plugin aligns both targets.
                finalizeDsl { extension ->
                    extension.compileOptions.sourceCompatibility = JavaVersion.VERSION_17
                    extension.compileOptions.targetCompatibility = JavaVersion.VERSION_17
                }
            }
        }
    }
}



tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
