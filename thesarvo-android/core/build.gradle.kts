plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

kotlin { jvmToolchain(21) }

dependencies {
    implementation(libs.serialization.json)
    testImplementation(libs.junit)
}

// The shared sync vectors live in the peer thesarvo-3 folder of this repo; the test fails (not skips) when they are missing.
tasks.test {
    systemProperty("vectors.dir", rootProject.file("../thesarvo-3/test-vectors/sync").absolutePath)
    testLogging { events("failed"); exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL }
}
