from __future__ import annotations
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import zipfile
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

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
    parser = argparse.ArgumentParser(description="Build the native pilot for an explicitly configured backend.")
    parser.add_argument("--supabase-url", required=True, help="Backend URL; emulator uses http://10.0.2.2:54321")
    parser.add_argument("--supabase-anon-key-file", required=True, type=Path,
                        help="Outside-repo file containing only the public anon/publishable key")
    args = parser.parse_args()
    url = args.supabase_url.rstrip("/")
    parsed = urlsplit(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path:
        parser.error("--supabase-url must be an HTTP(S) origin, without credentials, path, query or fragment")
    if parsed.scheme == "http" and parsed.hostname not in ("10.0.2.2", "127.0.0.1", "localhost"):
        parser.error("HTTP is allowed only for the local backend/emulator")
    key_file = args.supabase_anon_key_file.resolve()
    if key_file.is_relative_to(REPO.resolve()):
        parser.error("keep the public key input file outside the repo")
    key = key_file.read_text(encoding="utf-8-sig").strip()
    if not key or key.startswith("sb_secret_"):
        parser.error("provide a public anon/publishable key, never a secret key")
    if not key.startswith("sb_publishable_"):
        import base64
        try:
            claims = json.loads(base64.urlsafe_b64decode(key.split(".")[1] + "==="))
            if claims.get("role") != "anon":
                raise ValueError("key is not anon")
        except (ValueError, IndexError):
            parser.error("provide a public anon/publishable key, never a service-role key")
    for tool in [PLATFORM, JAVAC, KEYTOOL, JAVA, AAPT2, ZIPALIGN, D8_JAR, APKSIGNER_JAR]:
        require(tool)
    if BUILD.resolve() != HERE.resolve() / "build":
        raise SystemExit("Refusing to remove build output outside the native workspace")
    shutil.rmtree(BUILD, ignore_errors=True)
    CLASSES.mkdir(parents=True)
    DEX.mkdir(parents=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    compiled_res = BUILD / "compiled-res.zip"
    run(AAPT2, "compile", "--dir", HERE / "res", "-o", compiled_res)
    sources = sorted((HERE / "src").rglob("*.java"))
    generated = BUILD / "generated" / "com" / "sourcerating" / "mobile" / "BuildConfig.java"
    generated.parent.mkdir(parents=True)
    generated.write_text(
        "package com.sourcerating.mobile;\nfinal class BuildConfig {\n"
        f"    static final String SUPABASE_URL = {json.dumps(url)};\n"
        f"    static final String SUPABASE_ANON_KEY = {json.dumps(key)};\n}}\n", encoding="utf-8")
    sources.append(generated)
    run(JAVAC, "-encoding", "UTF-8", "-source", "8", "-target", "8", "-classpath", PLATFORM, "-d", CLASSES, *sources)
    resources_apk = BUILD / "resources.apk"
    # Permit HTTP only to the configured local host, keeping the source manifest secure.
    manifest_path = HERE / "AndroidManifest.xml"
    if parsed.scheme == "http":
        android_ns = "http://schemas.android.com/apk/res/android"
        ET.register_namespace("android", android_ns)
        manifest = ET.parse(manifest_path)
        manifest.getroot().find("application").set(f"{{{android_ns}}}networkSecurityConfig", "@xml/local_network_security")
        manifest_path = BUILD / "AndroidManifest.xml"
        manifest.write(manifest_path, encoding="utf-8", xml_declaration=True)
        res_xml = BUILD / "local-res" / "xml"
        res_xml.mkdir(parents=True)
        (res_xml / "local_network_security.xml").write_text(
            '<network-security-config><base-config cleartextTrafficPermitted="false"/>'
            '<domain-config cleartextTrafficPermitted="true"><domain includeSubdomains="false">'
            f'{parsed.hostname}</domain></domain-config></network-security-config>', encoding="utf-8")
        local_res = BUILD / "local-res.zip"
        run(AAPT2, "compile", "--dir", res_xml.parent, "-o", local_res)
        resource_inputs = [compiled_res, local_res]
    else:
        resource_inputs = [compiled_res]
    run(AAPT2, "link", "-o", resources_apk, "-I", PLATFORM, "--manifest", manifest_path,
        "--min-sdk-version", "26", "--target-sdk-version", "35", "--version-code", "4",
        "--version-name", "0.2.2-native", *resource_inputs)
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
    keystore = REPO.parent / "secrets" / "android-debug.keystore"
    keystore.parent.mkdir(parents=True, exist_ok=True)
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
