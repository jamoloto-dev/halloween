# Halloween Quiz PWA

A Progressive Web App (PWA) version of the Halloween Quiz game. This standalone app mirrors the Streamlit version and works on mobile devices with offline support.

## Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Installable**: Add to home screen on Android and iOS (web app mode)
- **Offline Support**: Service worker caches all assets for offline play
- **Same Quiz Logic**: Uses the same questions.json as the Streamlit app
- **Timer & Scoring**: Full countdown timer with auto-advance on timeout
- **Horror Ambience**: Optional looping, low-volume ambience during gameplay
- **Progressive Enhancement**: Works without JavaScript but is enhanced with it

## How to Use

### Online (Recommended for Deployment)

1. Deploy the `pwa/` folder to a static hosting service (Vercel, Netlify, GitHub Pages, etc.)
2. Serve at `https://your-domain.com/` (HTTPS required for PWA)
3. Visitors can add to home screen or install as an app

### Local Development

```bash
# Option 1: Using a simple Python HTTP server
cd halloween/pwa
python -m http.server 8000

# Then visit http://localhost:8000
```

**Note**: Service Worker caching requires HTTPS. Localhost (http://) is exempt for testing.

### Files

- `manifest.json` — PWA app metadata, icons, colors
- `sw.js` — Service Worker for offline support
- `index.html` — App shell (UI)
- `styles.css` — Styling (dark Halloween theme)
- `app.js` — Quiz game logic and state management

## How It Works

1. **Load Questions**: On page load, `app.js` fetches `../assets/questions.json`
2. **Setup Screen**: User enters name, selects categories and difficulty
3. **Game Loop**:
   - Display question and options
   - Start 30-second countdown timer
   - Check answer and update score
   - Auto-advance on timeout or selection
4. **Game Over**: Show final score with "Play Again" button
5. **Horror Ambience**: Optional looping audio if the player enables it

## Installation (Home Screen)

### Android
1. Open the app in Chrome
2. Tap menu (3 dots) → "Install app" or "Add to Home Screen"
3. App installs like a native app

### iOS
1. Open the app in Safari
2. Tap share button
3. Tap "Add to Home Screen"
4. Enter a name and tap "Add"
5. Opens as a full-screen web app

## Customization

- Edit `manifest.json` to change app name, colors, and icon paths
- Edit `styles.css` to change the Halloween theme
- Edit `app.js` to tweak game logic, difficulty multipliers, etc.

## Offline Play

The Service Worker caches:
- HTML, CSS, JS files
- `../assets/questions.json` (questions data)
- Manifest and service worker itself

Once loaded once, the app works offline. Updates require a fresh visit.

## Deployment to Netlify

1. Push the `pwa/` folder to a GitHub repository
2. Sign in to [Netlify](https://netlify.com)
3. Click "New site from Git"
4. Select your repo and set build settings:
   - **Build command**: (leave blank; no build needed)
   - **Publish directory**: `pwa/`
5. Deploy!

The app is now live at `https://your-site.netlify.app/` and installable on mobile.

## Notes

- Icons (192x192 and 512x512 PNGs) should be placed in the root of the deployed site
- Horror ambience is loaded from `/sounds/horror-ambience.mp3` when served by
  the FastAPI application. For a standalone PWA deployment, place an original
  ambience file at that URL (or update the path in `app.js`).
- Questions must be in `../assets/questions.json` with the same schema as Streamlit app
