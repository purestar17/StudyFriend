plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// 웹 버전(../../web)을 앱 안에 넣는다. 인터넷 없이도 학습 화면이 열린다.
val webAssets = layout.buildDirectory.dir("generated/webAssets")
val copyWeb by tasks.registering(Sync::class) {
    from(rootProject.file("../web")) {
        exclude("tests/**", "README.md")
    }
    into(webAssets.map { it.dir("web") })
}

android {
    namespace = "com.kidslearn.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.kidslearn.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 6
        versionName = "0.3.1"
    }

    sourceSets["main"].assets.srcDir(webAssets)

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

tasks.named("preBuild") { dependsOn(copyWeb) }

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
