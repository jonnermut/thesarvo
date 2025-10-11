Doing an android release:

Update VERSION_CODE / VERSION_NAME etc in build.gradle
Run guide downloader in XCode project
Make new obb
./gradlew zipExtension
Push obb to emulator
./gradlew pushExtension

Make APK
./gradlew assembleRelease


Upload APK (from guide/build/outputs/apk/release) to play store
Hit plus button on APK and add extension file