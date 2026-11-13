from pathlib import Path
import re
root = Path("android")
source_root = Path("native/android")
java_root = root / "app/src/main/java/com/athlys/app"
java_root.mkdir(parents=True, exist_ok=True)
for name in ("HealthConnectSyncWorker.kt", "HealthConnectBackgroundPlugin.java"):
    (java_root / name).write_text((source_root / name).read_text())

root_gradle = root / "build.gradle"
source = root_gradle.read_text()
if "kotlin-gradle-plugin" not in source and "org.jetbrains.kotlin.android" not in source:
    buildscript_dependencies = re.search(r"dependencies\s*\{", source)
    if buildscript_dependencies:
        source = source[:buildscript_dependencies.end()] + "\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.0.21'" + source[buildscript_dependencies.end():]
    else:
        source = """buildscript {
    repositories { google(); mavenCentral() }
    dependencies { classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.0.21' }
}
""" + source
root_gradle.write_text(source)

app_gradle = root / "app/build.gradle"
source = app_gradle.read_text()
if "org.jetbrains.kotlin.android" not in source:
    if re.search(r"plugins\s*\{", source):
        source, count = re.subn(r"(plugins\s*\{)", r"\1\n    id 'org.jetbrains.kotlin.android'", source, count=1)
    else:
        source, count = re.subn(r"(?m)^(apply plugin: ['\"]com\.android\.application['\"])$", r"\1\napply plugin: 'org.jetbrains.kotlin.android'", source, count=1)
    if count != 1:
        raise SystemExit("Could not apply Kotlin Android plugin in app/build.gradle")
if "androidx.work:work-runtime-ktx" not in source:
    source = source.replace("dependencies {", "dependencies {\n    implementation 'androidx.work:work-runtime-ktx:2.10.1'\n    implementation 'androidx.security:security-crypto:1.1.0-alpha06'\n", 1)
if "androidx.health.connect:connect-client:1.1.0" not in source:
    source = source.replace("dependencies {", "dependencies {\n    implementation 'androidx.health.connect:connect-client:1.1.0'\n", 1)
app_gradle.write_text(source)

main = java_root / "MainActivity.java"
source = main.read_text()
if "HealthConnectBackgroundPlugin.class" not in source:
    source = source.replace("registerPlugin(IntentLauncherPlugin.class);", "registerPlugin(IntentLauncherPlugin.class);\n              registerPlugin(HealthConnectBackgroundPlugin.class);")
main.write_text(source)

manifest = root / "app/src/main/AndroidManifest.xml"
source = manifest.read_text()
permission = '<uses-permission android:name="android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND" />'
if permission not in source:
    pos = source.find(">", source.find("<manifest"))
    if pos < 0:
        raise SystemExit("Android manifest root not found")
    source = source[:pos + 1] + "\n    " + permission + source[pos + 1:]
manifest.write_text(source)

if "HealthConnectBackgroundPlugin.class" not in main.read_text() or permission not in manifest.read_text():
    raise SystemExit("Native background sync registration or permission is missing")
print("Hourly WorkManager worker, encrypted device-token storage, Capacitor bridge and Health Connect background permission configured.")
