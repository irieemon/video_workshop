# Styling Issue Fix - CSS Not Loading

**Issue**: Dashboard showing unstyled HTML (blue links, no background colors, visible debug text)
**Root Cause**: Browser CSS cache or build cache issue
**Date**: 2025-10-19

---

## Symptoms

From screenshot analysis:
- ✅ Navigation links are blue/underlined (default browser styles)
- ✅ "Toggle menu" text is visible (should be `sr-only` hidden)
- ✅ No button styling or background colors
- ✅ "TE" debug box visible
- ✅ Layout structure correct but no Tailwind CSS applied

---

## Root Cause

**CSS is not loading in the browser** due to one of:

1. **Browser cache** - Old CSS cached, new HTML loaded
2. **Build cache** - `.next` folder has stale build artifacts
3. **Hot reload failure** - Dev server didn't rebuild CSS properly

---

## Fix Steps

### Step 1: Clear Next.js Build Cache

```bash
cd "/Users/sean.mcinerney/Documents/claude projects/sora video generator"
rm -rf .next
```

### Step 2: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 3: Hard Refresh Browser

**Chrome/Edge:**
- Mac: `Cmd + Shift + R`
- Windows: `Ctrl + Shift + R`

**Or clear cache:**
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

### Step 4: Verify CSS Loaded

1. Open DevTools → Network tab
2. Filter by "CSS"
3. Should see `globals.css` loaded (200 status)
4. Check Elements tab → Computed styles should show Tailwind variables

---

## Prevention

### For Development

Always do hard refresh after:
- Changing Tailwind config
- Adding new Tailwind classes
- Modifying `globals.css`
- Switching branches with CSS changes

### For Production

Add cache busting to `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  // Existing config...
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
}
```

---

## Verification Checklist

After fix, verify:
- [ ] Navigation has proper styling (no blue underlines)
- [ ] "Toggle menu" text is hidden (only icon visible)
- [ ] Buttons have background colors
- [ ] Sidebar has `bg-muted/40` background
- [ ] No "TE" debug boxes visible
- [ ] Responsive breakpoints work (resize window)

---

## Expected Appearance

**Desktop:**
- Sidebar on left with sage green accents
- White main content area
- Styled "New Project" button (sage green)
- No visible "Toggle menu" hamburger

**Mobile (<768px):**
- No sidebar visible
- Hamburger menu icon visible (top left)
- Mobile logo "Sora2" visible
- Properly styled navigation

---

## If Issue Persists

### Check 1: Verify Tailwind is Processing

```bash
# In DevTools Console
getComputedStyle(document.body).backgroundColor
# Should return: "rgb(250, 250, 249)" not "rgb(255, 255, 255)"
```

### Check 2: Verify CSS File Exists

```bash
ls -la .next/static/css/
# Should show CSS files
```

### Check 3: Check for Build Errors

```bash
npm run build
# Look for Tailwind/PostCSS errors
```

### Check 4: Verify PostCSS Config

```bash
cat postcss.config.mjs
# Should contain tailwindcss plugin
```

---

## Quick Command Summary

```bash
# Complete fix sequence
rm -rf .next
npm run dev
# Then in browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

**Status**: Fixable with cache clear
**Priority**: 🟡 Medium (visual issue, not functional)
**Estimated Fix Time**: 30 seconds
