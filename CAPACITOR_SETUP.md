# Capacitor Setup Guide for Mobile Integration

This app is now fully optimized for Capacitor JS mobile integration with:
- Mobile-adaptive layouts that work on phones, tablets, and desktops
- React icons for better performance
- Safe area support for iOS notches and Android navigation
- Touch-friendly UI elements
- Responsive navigation with bottom tab bar on mobile

## Quick Setup

### 1. Install Capacitor Dependencies

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
```

### 2. Initialize Capacitor

```bash
npx cap init
```

When prompted:
- **App ID**: `app.lovable.predictiongiveaway`
- **App Name**: `PredictWin`

### 3. Configure Capacitor

Create or update `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.predictiongiveaway',
  appName: 'PredictWin',
  webDir: 'dist',
  server: {
    url: 'https://a9883069-dc63-4a15-8978-e1043d1c70e1.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0A0B0E",
      showSpinner: false,
    },
  },
};

export default config;
```

### 4. Build Your App

```bash
npm run build
```

### 5. Add Platforms

For iOS (requires macOS with Xcode):
```bash
npx cap add ios
npx cap update ios
```

For Android (requires Android Studio):
```bash
npx cap add android
npx cap update android
```

### 6. Sync Changes

After any code changes:
```bash
npm run build
npx cap sync
```

### 7. Run on Device or Emulator

For iOS:
```bash
npx cap run ios
```

For Android:
```bash
npx cap run android
```

## Mobile-Optimized Features

✅ **Safe Area Support**: Automatically handles iOS notches and Android navigation bars
✅ **Bottom Navigation**: Mobile-first navigation with tab bar at bottom
✅ **Responsive Design**: Adapts to all screen sizes (mobile, tablet, desktop)
✅ **Touch Optimized**: Large tap targets and mobile-friendly interactions
✅ **React Icons**: Lightweight icons for better mobile performance
✅ **No Zoom Issues**: Prevents unwanted zoom on input focus (iOS)
✅ **Smooth Scrolling**: Native-like scroll behavior

## Testing on Different Devices

You can test different screen sizes in Lovable by clicking the device icon above the preview:
- 📱 Mobile view
- 📱 Tablet view  
- 💻 Desktop view

## Production Deployment

When ready for production:

1. Remove the `server` section from `capacitor.config.ts`
2. Build your production assets: `npm run build`
3. Sync to platforms: `npx cap sync`
4. Open in native IDEs and build:
   - iOS: `npx cap open ios` (requires Apple Developer Account)
   - Android: `npx cap open android` (requires Google Play Console)

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS App Store Guidelines](https://developer.apple.com/app-store/guidelines/)
- [Google Play Guidelines](https://play.google.com/console/about/guides/)
