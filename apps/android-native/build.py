from __future__ import annotations
import hashlib
import os
import shutil
import subprocess
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
BUILD = HERE / "build"
CLASSES = BUILD / "classes"
DEX = BUILD / "dex"
ARTIFACTS = REPO / "pilot-artifacts"
SDK = Path(os.environ.get("ANDROID_HOME", r"D:\Android\Sdk"))
JDK = Path(os.environ.get("JAVA_HOME", r"C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"))
PLATFORM = SDK / "platforms" / "android-35" / "android.jar"
BUILD_TOOLS = SDK / "build-tools" / "35.0.0"
JAVAC = JDK / "bin" / "javac.exe"
KEYTOOL = JDK / "bin" / "keytool.exe"
JAVA = JDK / "bin" / "java.exe"
AAPT2 = BUILD_TOOLS / "aapt2.exe"
AAPT = BUILD_TOOLS / "aapt.exe"
ZIPALIGN = BUILD_TOOLS / "zipalign.exe"
D8_JAR = BUILD_TOOLS / "lib" / "d8.jar"
APKSIGNER_JAR = BUILD_TOOLS / "lib" / "apksigner.jar"

def run(*args: object) -> None:
    cmd = [str(x) for x in args]
    print("+", " ".join(cmd))
    subprocess.run(cmd, cwd=HERE, check=True)

def require(path: Path) -> None:
    if not path.exists():
        raise SystemExit(f"Missing required tool: {path}")

def main() -> int:
    for tool in [PLATFORM, JAVAC, KEYTOOL, JAVA, AAPT2, ZIPALIGN, D8_JAR, APKSIGNER_JAR]:
        require(tool)
    shutil.rmtree(BUILD, ignore_errors=True)
    CLASSES.mkdir(parents=True)
    DEX.mkdir(parents=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    compiled_res = BUILD / "compiled-res.zip"
    run(AAPT2, "compile", "--dir", HERE / "res", "-o", compiled_res)
    sources = sorted((HERE / "src").rglob("*.java"))
    run(JAVAC, "-encoding", "UTF-8", "-source", "8", "-target", "8", "-classpath", PLATFORM, "-d", CLASSES, *sources)
    resources_apk = BUILD / "resources.apk"
    run(AAPT2, "link", "-o", resources_apk, "-I", PLATFORM, "--manifest", HERE / "AndroidManifest.xml",
        "--min-sdk-version", "26", "--target-sdk-version", "35", "--version-code", "4",
        "--version-name", "0.2.2-native", compiled_res)
    class_files = sorted(CLASSES.rglob("*.class"))
    if not class_files:
        raise SystemExit("javac produced no class files.")
    run(JAVA, "-cp", D8_JAR, "com.android.tools.r8.D8", "--min-api", "26", "--lib", PLATFORM,
        "--output", DEX, *class_files)
    dex_file = DEX / "classes.dex"
    require(dex_file)
    unsigned_apk = BUILD / "SourceRating-Native-unsigned.apk"
    shutil.copy2(resources_apk, unsigned_apk)
    with zipfile.ZipFile(unsigned_apk, "a", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.write(dex_file, "classes.dex")
    aligned_apk = BUILD / "SourceRating-Native-aligned.apk"
    run(ZIPALIGN, "-f", "4", unsigned_apk, aligned_apk)
    keystore = HERE / "debug.keystore"
    if not keystore.exists():
        run(KEYTOOL, "-genkeypair", "-keystore", keystore, "-storepass", "android",
            "-alias", "androiddebugkey", "-keypass", "android", "-dname", "CN=Android Debug,O=SourceRating,C=US",
            "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000", "-noprompt")
    final_apk = ARTIFACTS / "SourceRating-Native-debug.apk"
    if final_apk.exists():
        final_apk.unlink()
    run(JAVA, "-jar", APKSIGNER_JAR, "sign", "--ks", keystore, "--ks-pass", "pass:android",
        "--key-pass", "pass:android", "--out", final_apk, aligned_apk)
    run(JAVA, "-jar", APKSIGNER_JAR, "verify", "--verbose", "--print-certs", final_apk)
    if AAPT.exists():
        run(AAPT, "dump", "badging", final_apk)
    data = final_apk.read_bytes()
    print(f"APK={final_apk}")
    print(f"SIZE={len(data)}")
    print(f"SHA256={hashlib.sha256(data).hexdigest()}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
