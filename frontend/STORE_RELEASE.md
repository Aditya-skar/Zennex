# SIMSOR – App Store & Play Store release guide

App ID: `com.simsor.app`  
Display name: **SIMSOR**  
Version: **1.0.0** (build / versionCode **1**)

This project is configured for store builds. You still need developer accounts, signing keys, and listing assets.

---

## 0) Accounts (one-time)

| Store | Need |
|-------|------|
| **Google Play** | [Play Console](https://play.google.com/console) developer account (~$25 one-time) |
| **Apple App Store** | [Apple Developer Program](https://developer.apple.com/programs/) (~$99/year) + Mac + Xcode |

---

## 1) Prepare release web build

```bash
cd frontend
cp .env.example .env
# For production API (HTTPS required on devices):
# VITE_API_URL=https://api.yourdomain.com

npm run icons:store
npm run release:sync
```

`release:sync` = production Vite build + `cap sync` into `android/` and `ios/`.

---

## 2) Google Play (Android App Bundle)

### Signing key (one-time)

```bash
cd frontend/android
keytool -genkey -v -keystore simsor-release.keystore -alias simsor -keyalg RSA -keysize 2048 -validity 10000
cp keystore.properties.example keystore.properties
# edit keystore.properties with your passwords + path
```

**Never commit** `*.keystore`, `*.jks`, or `keystore.properties`.

### Build AAB

```bash
cd frontend
npm run release:android
```

Output:

`android/app/build/outputs/bundle/release/app-release.aab`

### Play Console checklist

- [ ] Create app → package name **`com.simsor.app`** (must match forever)
- [ ] Upload **AAB** (not APK) for production / closed testing
- [ ] Store listing: title, short + full description, screenshots
- [ ] Icon: `resources/android/play-store-icon-512.png` (512×512)
- [ ] Feature graphic: 1024×500 (create separately)
- [ ] Privacy policy URL (required if location / account data)
- [ ] Data safety form (location, photos, account)
- [ ] Content rating questionnaire
- [ ] Target audience / news apps declarations
- [ ] Countries + pricing
- [ ] App category (e.g. Social / Sports)

### Permissions declared

- `INTERNET`
- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` (map / nearby events)

---

## 3) Apple App Store (iOS)

**Must be done on a Mac.**

```bash
cd frontend
npm run release:sync
npm run cap:ios
```

In Xcode:

1. Select target **App** → Signing & Capabilities  
2. Team = your Apple Developer team  
3. Bundle ID = **`com.simsor.app`**  
4. Version `1.0.0`, Build `1`  
5. Archive → **Distribute App** → App Store Connect  

### App Store Connect checklist

- [ ] Create app with bundle id `com.simsor.app`
- [ ] Screenshots for required device sizes (6.7", 6.5", 5.5" as prompted)
- [ ] App icon: `resources/ios/AppStore-1024.png` (1024×1024, no alpha)
- [ ] Privacy Policy URL
- [ ] App Privacy nutrition labels (Location, Photos, Contact Info if accounts)
- [ ] Age rating
- [ ] Export compliance: **ITSAppUsesNonExemptEncryption = NO** already set (standard HTTPS)
- [ ] Review notes + demo account if login is required

### Privacy strings (Info.plist)

Already set for location, camera, and photo library.

---

## 4) Store assets to prepare

| Asset | Size | Path / note |
|-------|------|-------------|
| Play icon | 512×512 | `resources/android/play-store-icon-512.png` |
| App Store icon | 1024×1024 | `resources/ios/AppStore-1024.png` |
| Feature graphic | 1024×500 | design separately |
| Screenshots | phone frames | Home, Explore map, Discover, Chat, Profile |
| Privacy policy | public HTTPS URL | host on your site |

Generate icons anytime:

```bash
npm run icons:store
```

---

## 5) Backend before production

- Ship with `VITE_API_URL=https://…` (HTTPS)
- Cleartext HTTP is blocked on release Android except emulator localhost domains
- Auth endpoints are stubbed in `src/api/endpoints.ts`

---

## 6) Version bumps

| Place | Field |
|-------|--------|
| `package.json` | `"version": "1.0.0"` |
| Android `app/build.gradle` | `versionName` / `versionCode` (or `-PVERSION_NAME=` / `-PVERSION_CODE=`) |
| iOS Xcode | Marketing Version / Current Project Version |

Each store upload needs a **higher** `versionCode` / iOS build number.

---

## 7) Quick commands

```bash
npm run icons:store          # icons + splash from logo.png
npm run release:sync         # web build + cap sync
npm run release:android      # signed AAB (needs keystore.properties)
npm run cap:ios              # open Xcode (Mac)
```

---

## Known constraints

- **iOS builds require macOS + Xcode** (Windows can edit/sync only).
- First Play / App Store review often takes 1–7 days.
- Keep `com.simsor.app` forever — changing it creates a new store listing.
