# Custom Domain Setup Guide

This guide walks you through setting up a custom domain for your Halloween Quiz game on either Netlify (for the PWA) or Streamlit Cloud (for the main app).

## Table of Contents
1. [For Netlify (PWA Deployment)](#netlify-pwa)
2. [For Streamlit Cloud (Main App)](#streamlit-cloud)
3. [DNS Configuration](#dns-configuration)
4. [Troubleshooting](#troubleshooting)

---

## Netlify (PWA)

### Step 1: Deploy PWA to Netlify

1. **Connect your GitHub repository to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Select GitHub and authenticate
   - Choose your `halloween` repository

2. **Configure build settings:**
   - **Build command:** (leave empty - PWA is static)
   - **Publish directory:** `pwa`
   - Click "Deploy site"

3. **Wait for deployment** (usually completes in 2-3 minutes)
   - Your site will be live at `https://<random-id>.netlify.app`

### Step 2: Add Custom Domain to Netlify

1. In your Netlify site dashboard, go to **Domain management**
2. Click **Add custom domain**
3. Enter your custom domain (e.g., `halloween.yoursite.com`)
4. Netlify will ask whether you manage DNS elsewhere or want them to

### Option A: Let Netlify Manage DNS (Recommended)

1. Netlify provides **nameservers** - copy them
2. Go to your domain registrar (GoDaddy, Namecheap, etc.)
3. Update nameservers to Netlify's provided values
4. Wait 24-48 hours for propagation
5. Netlify will automatically provision an SSL certificate

### Option B: Keep DNS with Your Registrar

1. In your registrar's DNS settings, add a **CNAME record:**
   - **Name:** (your subdomain, e.g., `halloween`)
   - **Value:** `<your-netlify-site>.netlify.app`
   - **TTL:** 3600 (or default)

2. Verify in Netlify dashboard (may take 24-48 hours)

### Step 3: Enable HTTPS & SSL

1. Return to Netlify's Domain settings
2. Enable **HTTPS** (Netlify auto-provisions via Let's Encrypt)
3. Force **HTTPS redirects** in Site settings → Build & deploy → Post processing

---

## Streamlit Cloud

### Step 1: Deploy Main App to Streamlit Cloud

1. **Push code to GitHub** (if not already done):
   ```bash
   git add -A
   git commit -m "Add analytics and icons"
   git push origin main
   ```

2. **Deploy to Streamlit Cloud:**
   - Go to [share.streamlit.io](https://share.streamlit.io)
   - Click "New app"
   - Connect to your GitHub (`jamoloto-dev/halloween`)
   - Choose:
     - **Main file path:** `src/web_game_streamlit.py`
     - **Python version:** 3.11
   - Click "Deploy"

3. **Your Streamlit app** will be live at:
   `https://halloween-xxxxx.streamlit.app`

### Step 2: Add Custom Domain to Streamlit Cloud

1. In your Streamlit app, click ⚙️ **Settings** (top right)
2. Go to **General** tab
3. Under **Custom domain**, enter your domain (e.g., `quiz.yoursite.com`)
4. Streamlit will show **CNAME values** to configure

### Step 3: Configure DNS (Streamlit)

1. Go to your domain registrar's DNS settings
2. Add a **CNAME record:**
   - **Name:** (your subdomain, e.g., `quiz`)
   - **Value:** (Streamlit's provided CNAME value)
   - **TTL:** 3600

3. Click Save and wait 24-48 hours for propagation

4. **Verify** in Streamlit settings (green checkmark appears when propagated)

---

## DNS Configuration

### Quick Reference Table

| Deployment | Record Type | Name Example | Value | TTL |
|---|---|---|---|---|
| **Netlify** | CNAME | `halloween` | `sitename.netlify.app` | 3600 |
| **Streamlit** | CNAME | `quiz` | (Streamlit's provided CNAME) | 3600 |
| **Root Domain** | A | `@` | (Registrar's instructions) | 3600 |

### Using Different Subdomains

You can deploy both on the same domain using subdomains:

- **PWA on Netlify:** `halloween.yoursite.com` → points to Netlify
- **Streamlit App:** `quiz.yoursite.com` → points to Streamlit Cloud

### Root Domain Setup

To use your root domain (e.g., `yoursite.com`):

1. **For Netlify:** Might require changing registrar's nameservers
2. **For Streamlit:** Some registrars don't support CNAME on root

**Recommendation:** Use subdomains (e.g., `halloween.`, `quiz.`) instead of root domain.

---

## Troubleshooting

### Domain Not Resolving

1. **Check DNS propagation:**
   - Use [whatsmydns.net](https://whatsmydns.net)
   - Enter your domain and select CNAME record type
   - Should show green ✓ in most locations

2. **Wait longer:** DNS propagation can take 24-48 hours

3. **Check Netlify/Streamlit settings:**
   - Verify you entered the domain exactly as registered
   - Ensure CNAME value matches platform's requirements

### SSL Certificate Issues

1. **Netlify:** Automatically provisions Let's Encrypt (usually instant)
2. **Streamlit:** May take up to 24 hours after DNS propagation
3. **Force HTTPS:**
   - Netlify: Site settings → Build & deploy → Post processing
   - Streamlit: Auto-enabled

### Mixed Content Errors

Ensure your site uses HTTPS everywhere:
- Links in code should use `https://`
- Embedded images/scripts should be HTTPS
- Check browser console for non-HTTPS resources

---

## Environment Variables for Analytics

To enable Google Analytics tracking on your deployed app:

### Streamlit Cloud

1. Go to app **Settings** → **Secrets**
2. Add:
   ```
   GA_MEASUREMENT_ID = "G-YOUR_MEASUREMENT_ID"
   ```

### Netlify (PWA)

1. Go to **Site settings** → **Build & deploy** → **Environment**
2. Add environment variable:
   ```
   GA_ID = "G-YOUR_MEASUREMENT_ID"
   ```
3. Rebuild site to apply changes

Get your `G-XXXXXXXXXX` ID from [Google Analytics](https://analytics.google.com)

---

## Verification

After setup, verify everything works:

1. **Visit your custom domain** in a browser
2. **Check HTTPS:** URL bar should show 🔒 lock icon
3. **Play a round** to ensure game logic works
4. **Check console (F12):** No JavaScript errors
5. **Verify analytics:** Open Google Analytics dashboard to see events

---

## Need Help?

- **Netlify support:** [docs.netlify.com](https://docs.netlify.com)
- **Streamlit Cloud:** [docs.streamlit.io](https://docs.streamlit.io)
- **DNS issues:** Contact your registrar's support
