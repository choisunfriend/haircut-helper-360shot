# Today's style peek — 앱 빌드 안내

Capacitor 8.6.2 기준. `appId`는 저장소 설정을 그대로 썼습니다 (`kr.gyeol.haircuthelper`).
앱 이름만 **Today's style peek**으로 바꿨습니다.

이 폴더에는 `node_modules/`와 `www/`가 빠져 있습니다. 둘 다 아래 0·1단계에서 만들어집니다.

---

## 0. 준비물

| | 안드로이드 APK | iOS IPA |
|---|---|---|
| OS | 윈도우 / 맥 / 리눅스 아무거나 | **맥 전용** |
| 필요한 것 | Android Studio (SDK 포함), JDK 21 | Xcode, Apple Developer 계정($99/년) |
| 결과물 | `.apk` / `.aab` | `.ipa` (TestFlight 또는 App Store) |

Node.js 22 이상이 필요합니다.

---

## 1. 웹 자산 넣기

`www/`에는 **haircut-helper-360shot 저장소의 내용 전체**가 들어가야 합니다.
Changeclothes 브랜치가 아닙니다 — 그쪽에는 `vendor/`와 `mediapipe/models/`가 없어서
오프라인으로 돌아가지 않습니다.

```bash
git clone https://github.com/choisunfriend/haircut-helper-360shot.git /tmp/360shot
rm -rf www && mkdir www
cp -r /tmp/360shot/. www/
rm -rf www/.git
```

그리고 이 zip의 `pwa/` 폴더에 든 4가지를 `www/` 위에 덮어씁니다
(`index.html`, `manifest.json`, `sw.js`, `icons/`).
저장소에 이미 PWA 파일을 올리셨다면 1단계만으로 충분합니다.

`www/index.html`이 있고 용량이 60MB쯤 되면 맞습니다.

```bash
npm install
npx cap sync
```

`cap sync`가 `www/`를 `android/app/src/main/assets/public/`과
`ios/App/App/public/`으로 복사합니다. **웹 쪽을 고칠 때마다 다시 돌려야 합니다.**

---

## 2. 안드로이드 APK

```bash
cd android
./gradlew assembleDebug          # 테스트용. android/app/build/outputs/apk/debug/
```

홍보용으로 배포하려면 서명된 릴리스가 필요합니다.

```bash
keytool -genkey -v -keystore tsp-release.keystore \
  -alias tsp -keyalg RSA -keysize 2048 -validity 10000
```

`android/keystore.properties` (이 파일은 **절대 깃에 올리지 마세요**):

```properties
storeFile=../tsp-release.keystore
storePassword=비밀번호
keyAlias=tsp
keyPassword=비밀번호
```

`android/app/build.gradle`의 `android { }` 안에 추가:

```gradle
def kp = new Properties()
def kpf = rootProject.file('keystore.properties')
if (kpf.exists()) kp.load(new FileInputStream(kpf))

signingConfigs {
    release {
        if (kpf.exists()) {
            storeFile file(kp['storeFile'])
            storePassword kp['storePassword']
            keyAlias kp['keyAlias']
            keyPassword kp['keyPassword']
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false        // 웹 자산이라 코드 축소는 의미 없습니다
    }
}
```

```bash
./gradlew assembleRelease        # APK — 링크로 직접 배포할 때
./gradlew bundleRelease          # AAB — 구글 플레이에 올릴 때
```

**키스토어 파일과 비밀번호를 잃어버리면 같은 앱으로 업데이트를 못 올립니다.** 따로 백업해 두세요.

### 용량

웹 자산이 61MB라 APK가 70MB 내외로 나옵니다. 구글 플레이 APK 한도(100MB)에는 들어가지만,
줄이고 싶으면 `www/vendor/mediapipe/wasm/vision_wasm_nosimd_internal.wasm`(8.7MB)을
빼는 방법이 있습니다. 요즘 기기는 전부 SIMD를 지원하지만, 아주 구형에서 세그멘테이션이
동작하지 않게 되니 테스트 후 판단하세요.

---

## 3. iOS

맥에서만 됩니다.

```bash
npx cap open ios                 # Xcode가 열립니다
```

Xcode에서:
1. App 타깃 → Signing & Capabilities → 본인 Team 선택
2. Bundle Identifier가 `kr.gyeol.haircuthelper`인지 확인
3. Product → Archive → Distribute App → TestFlight

홍보용으로 몇 명에게만 보여줄 거라면 TestFlight가 가장 빠릅니다(심사가 가볍습니다).
App Store 정식 등록은 심사가 더 깁니다.

**맥이 없다면 iOS는 PWA로 가세요.** 사파리에서 열고 공유 → "홈 화면에 추가"를 하면
전체화면으로 뜨고 카메라도 동작합니다. 이 zip의 `pwa/`가 그 용도입니다.

---

## 이미 적용해 둔 것

**안드로이드**
- `AndroidManifest.xml` — `CAMERA` 권한 추가 (WebView의 `getUserMedia`에 필요),
  카메라 없는 기기도 설치되도록 `uses-feature ... required="false"`,
  `MainActivity`를 `screenOrientation="portrait"`로 고정
- `strings.xml` — 앱 이름 `Today's style peek`
- 런처 아이콘 5개 밀도 + 둥근 아이콘 + adaptive icon 전경,
  adaptive 배경색을 흰색에서 앱 배경색 `#1B1816`으로 변경
- 스플래시 10장(세로/가로 × 5밀도)

**iOS**
- `Info.plist` — `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`,
  `NSPhotoLibraryAddUsageDescription` 추가. **이게 없으면 카메라가 아예 안 열리고
  심사에서도 거절됩니다.**
- 세로 고정, `UIRequiredDeviceCapabilities`를 `armv7` → `arm64`로 수정
- AppIcon 1024×1024(알파 없는 불투명 — App Store 요구사항), 스플래시 3종

**공통**
- `capacitor.config.json` — `androidScheme: https`. `getUserMedia`는 보안 컨텍스트에서만
  동작하므로 이 값이 중요합니다.

---

## 확인이 필요한 부분

**안드로이드 카메라 권한 팝업.** Capacitor의 WebView가 `onPermissionRequest`를 받아
런타임 권한을 요청하도록 돼 있고 매니페스트 선언도 넣었지만, 실기기에서 직접 돌려보지는
못했습니다. 첫 실행에서 권한 팝업이 안 뜨고 카메라가 검게 나오면 `@capacitor/camera`
플러그인을 추가해 앱 시작 시 권한을 먼저 요청하는 방식으로 바꾸면 됩니다.

**서비스워커.** 네이티브 껍질 안에서는 등록을 건너뛰도록 `index.html`에 가드를 넣었습니다
(`capacitor://` 스킴에서는 서비스워커가 동작하지 않고, 네이티브는 자산을 이미 들고 있어
필요도 없습니다). PWA로 열 때만 등록됩니다.
