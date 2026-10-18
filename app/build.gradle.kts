buildscript {
    repositories {
        mavenCentral()
    }
    dependencies {
        classpath(libs.kotlin.gradle.plugin)
    }
}

plugins {
    alias(libs.plugins.android.application)
}

abstract class BuildExtension : DefaultTask() {
    @get:InputDirectory
    abstract val source: DirectoryProperty

    @get:InputFile
    abstract val userscript: RegularFileProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    // TODO: Validate
    @TaskAction
    fun build() {
        val out = outputDir.dir("extension").get().asFile
        out.deleteRecursively()
        out.mkdirs()
        source.get().asFile.listFiles()!!
            .filter { it.name != "manifest.json" }
            .forEach { it.copyTo(out.resolve(it.name)) }

        val script = userscript.get().asFile.readText()
        val header = script.substringBefore("// ==/UserScript==")
        val metadata = Regex("""^// @(\S+)\s+(.+)$""", RegexOption.MULTILINE)
            .findAll(header)
            .map { it.groupValues[1] to it.groupValues[2].trim() }
            .toList()

        @Suppress("UNCHECKED_CAST")
        val manifest = groovy.json.JsonSlurper().parse(source.file("manifest.json").get().asFile)
            as MutableMap<String, Any?>
        manifest["version"] = metadata.first { it.first == "version" }.second
        @Suppress("UNCHECKED_CAST")
        val contentScript = (manifest["content_scripts"] as List<MutableMap<String, Any?>>).first()
        contentScript["matches"] = metadata.filter { it.first == "match" }.map { it.second }.distinct()
        out.resolve("manifest.json")
            .writeText(groovy.json.JsonOutput.prettyPrint(groovy.json.JsonOutput.toJson(manifest)))
        out.resolve("userscript.js").writeText("streamChannelerStart(function () {\n$script\n});\n")
    }
}

val userscriptProject = layout.projectDirectory.dir("..")

val buildUserscript = tasks.register<Exec>("buildUserscript") {
    workingDir = userscriptProject.asFile
    val npm = if (System.getProperty("os.name").startsWith("Windows")) "npm.cmd" else "npm"
    commandLine(npm, "run", "build")
    inputs.dir(userscriptProject.dir("src"))
    inputs.dir(userscriptProject.dir("config"))
    inputs.file(userscriptProject.file("package.json"))
    outputs.file(userscriptProject.file("dist/index.prod.user.js"))
}

val buildExtension = tasks.register<BuildExtension>("buildExtension") {
    dependsOn(buildUserscript)
    source.set(layout.projectDirectory.dir("extension"))
    userscript.set(userscriptProject.file("dist/index.prod.user.js"))
}

android {
    namespace = "com.streamchanneler.remote"
    compileSdk {
        version = release(37) {
            minorApiLevel = 2
        }
    }

    defaultConfig {
        applicationId = "com.streamchanneler.remote"
        minSdk = 26
        targetSdk = 37
        versionCode = (providers.gradleProperty("versionCode").orNull ?: "1").toInt()
        versionName = providers.gradleProperty("versionName").orNull ?: "0.1.0"
    }

    splits {
        abi {
            isEnable = true
            reset()
            include("armeabi-v7a", "arm64-v8a", "x86_64")
            isUniversalApk = false
        }
    }

    signingConfigs {
        val keystore = System.getenv("ANDROID_KEYSTORE_PATH")
        if (!keystore.isNullOrBlank()) {
            create("release") {
                storeFile = file(keystore)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.findByName("release")
                ?: signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        jniLibs {
            useLegacyPackaging = true
        }
    }

    buildFeatures {
        buildConfig = true
    }
}

androidComponents {
    onVariants { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(buildExtension, BuildExtension::outputDir)
    }
}

dependencies {
    implementation(libs.geckoview)
    implementation(libs.annotation.experimental)
}
