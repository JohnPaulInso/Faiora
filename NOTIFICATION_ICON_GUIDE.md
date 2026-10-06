# Android Notification Icon Guide for Faiora

## The Problem
Your notification icon (the small flame icon on the left of "Faiora") appears small because:
1. Android notification "small icons" must be simple, monochrome silhouettes
2. Complex colored logos don't work well as notification icons
3. The icon needs multiple size versions for different screen densities

## What I've Done

### 1. Added Large Icon Support ✅
- Updated `NativeAlarmScheduler.java` to include `.setLargeIcon()` - this shows your full-color app logo
- Updated `capacitor.config.ts` to include `largeIcon: 'applogo'` for task notifications
- **The large icon appears as a colored square/circle on the RIGHT side of the notification**
- **This makes your branding MUCH more visible!**

### 2. Created Density-Specific Folders ✅
- Created drawable-mdpi, drawable-hdpi, drawable-xhdpi, drawable-xxhdpi, drawable-xxxhdpi folders
- These allow you to provide optimized icons for different screen densities

### 3. Created Alternative Icon Resources ✅
- Created `ic_notification_flame.xml` - a simple vector flame icon that scales perfectly
- Created `ic_notification_logo_large.xml` - an enhanced version with better padding

## How to Make the Small Icon Bigger (Best Methods)

### Method 1: Use Android Asset Studio (RECOMMENDED - Easiest)
1. Go to: https://romannurik.github.io/AndroidAssetStudio/icons-notification.html
2. Upload your `applogo.png` or `applogo_without_bg.png`
3. Adjust the padding slider to make the icon larger (reduce padding = bigger icon)
4. Set the name to `ic_notification_logo`
5. Download the ZIP file
6. Extract and copy all the drawable-* folders to `android/app/src/main/res/`
7. Replace the existing files

**This creates properly sized icons automatically for all densities!**

### Method 2: Use the Vector Flame Icon
Edit `capacitor.config.ts` and change:
```typescript
smallIcon: 'ic_notification_flame',  // Uses the scalable vector version
```

And update `NativeAlarmScheduler.java`:
```java
.setSmallIcon(R.drawable.ic_notification_flame)
```

### Method 3: Manually Create Density-Specific PNG Files
Create these files with your preferred size (less white space = bigger icon):
- `drawable-mdpi/ic_notification_logo.png` - 24x24px
- `drawable-hdpi/ic_notification_logo.png` - 36x36px
- `drawable-xhdpi/ic_notification_logo.png` - 48x48px
- `drawable-xxhdpi/ic_notification_logo.png` - 72x72px
- `drawable-xxxhdpi/ic_notification_logo.png` - 96x96px

**Design Tips:**
- Make the flame/logo fill more of the canvas (reduce padding)
- Keep it simple and bold
- White/transparent works best (Android colors it)
- Test on different Android versions

## Understanding Android Notification Icons

### Small Icon (Left Side)
- Appears in status bar and left of notification
- Must be monochrome (white/transparent)
- Tinted by system to match theme
- Should be simple and recognizable at tiny sizes
- **This is what you're asking about - to make it bigger**

### Large Icon (Right Side) 
- Appears as colored square/circle on RIGHT of notification
- Can be full color
- Shows your full app logo
- **I've now enabled this - it will make your branding more prominent!**

## After Making Changes

1. Rebuild the app:
```bash
npm run build
npx cap sync android
```

2. Open Android Studio and rebuild the APK:
```bash
cd android
./gradlew assembleDebug
```

3. Install and test the new APK

## Recommended Next Steps

1. **Use Android Asset Studio** (Method 1 above) - it's the fastest and most reliable
2. Experiment with padding settings to find the right balance
3. Test on actual devices to see how it looks
4. The large icon I added will help your branding significantly!

## Files Modified
- ✅ `android/app/src/main/java/com/faiora/app/NativeAlarmScheduler.java` - Added large icon
- ✅ `capacitor.config.ts` - Added large icon config
- ✅ Created `android/app/src/main/res/drawable/ic_notification_flame.xml` - Vector alternative
- ✅ Created density-specific folders for optimized icons

---

**The large icon addition will make the biggest immediate difference!** Rebuild and test to see your full-color logo appear prominently in notifications.
