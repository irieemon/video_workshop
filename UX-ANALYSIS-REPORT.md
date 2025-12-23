# Scenra Studio - New User UX Analysis Report

**Date**: December 23, 2025
**Tester**: New User Simulation (via Claude)
**Application**: Scenra Studio - AI-powered video production platform

---

## Executive Summary

I explored Scenra Studio as a completely new user, navigating through all major features. The application has a solid foundation with impressive AI capabilities, but several UX issues could confuse or frustrate new users.

**Overall Rating**: 7/10 - Good core functionality, needs UX polish

---

## 1. Landing Page & First Impressions

### Positives
- Clean, modern design with clear value proposition
- "AI-powered creative production platform" messaging is clear
- Three key features highlighted (AI Agent Collaboration, Series & Episodes, Optimized Prompts)
- Clear CTAs: "Get Started" and "Sign In"

### Issues & Confusion Points

| Issue | Severity | Description |
|-------|----------|-------------|
| **Branding Inconsistency** | Medium | Landing page says "Scenra Studio" but the subtitle mentions "Scenra Prompt Studio" - which is it? |
| **No Product Demo** | Low | New users have no visual preview of what the product actually does |
| **Missing Pricing Info** | Medium | No indication of free vs paid before signing up |

---

## 2. Authentication Flow

### Positives
- Standard signup form with clear requirements (password complexity shown)
- OAuth options (Google, GitHub) available
- Terms of Service and Privacy Policy links present
- Email confirmation flow is implemented

### Issues & Confusion Points

| Issue | Severity | Description |
|-------|----------|-------------|
| **Password Visibility Toggle Missing** | Low | No way to view password while typing |
| **No Password Strength Indicator** | Low | Only static text about requirements, no visual feedback |
| **Email Confirmation UX** | Medium | After signup, user sees "Check your email" but was auto-logged in (confusing mixed signals) |

---

## 3. Dashboard & Onboarding

### Positives
- Welcome banner explains new features clearly
- Empty states have helpful CTAs ("Create Your First Video", "Create Your First Series")
- Stats cards show key metrics (Total Videos, Active Series, This Month)
- AI consultation counter in sidebar shows remaining usage

### Issues & Confusion Points

| Issue | Severity | Description |
|-------|----------|-------------|
| **No Guided Onboarding** | High | New users are dropped into dashboard with no walkthrough or tutorial |
| **Banner Overload** | Medium | Large welcome banner takes up significant screen real estate |
| **Unclear Navigation Hierarchy** | Medium | "Dashboard" link in nav goes to same page as sidebar "Dashboard" - redundant |
| **"AI Consultations: 10 left"** | High | What is an AI consultation? When do they get used? No explanation |
| **Theme Toggle Duplicated** | Low | Theme toggle appears in both sidebar and settings page |

---

## 4. Video Creation Flow

### Positives
- Clear form with helpful placeholder text
- Platform selection (TikTok, Instagram, Both) is intuitive
- Inline series creation saves navigation
- "Generate with AI" action is prominent

### Issues & Confusion Points

| Issue | Severity | Description |
|-------|----------|-------------|
| **Disabled Button Mystery** | High | "Generate with AI" button stays disabled with no indication of what's required. Turns out you need to select a platform, but no visual indicator shows this |
| **Platform Selection No Visual Feedback** | High | Clicking TikTok/Instagram doesn't visually indicate selection - buttons look the same selected vs unselected |
| **Series Dropdown Confusion** | Medium | Dropdown shows "Select a series" but it's not required - confusing |
| **Optional Fields Appear After Series Selection** | Medium | Episode, Characters, Settings sections suddenly appear after selecting series - jarring |
| **No Character/Setting Limits Explained** | Low | "No characters defined for this series yet" but no explanation of what characters do |

---

## 5. AI Agent Roundtable

### Positives
- Impressive multi-agent collaboration with distinct personas (Director, Cinematographer, Editor, Colorist, Platform Expert)
- Detailed responses show genuine expertise
- Generated Sora prompt is extremely comprehensive
- "Copy Prompt" and "Copy All" for hashtags are useful utilities
- Hashtag recommendations are platform-optimized

### Issues & Confusion Points

| Issue | Severity | Description |
|-------|----------|-------------|
| **No Progress Indication** | High | During generation, just "AI Film Crew Collaborating" with no progress bar or estimated time |
| **Overwhelming Output** | High | The generated prompt is MASSIVE (2000+ words) - overwhelming for new users who might just want something simple |
| **No Editing Capability** | Medium | Users can copy the prompt but can't edit or refine it within the app |
| **"Round 1" Suggests Multiple Rounds** | Medium | UI shows "Round 1: Initial Analysis" but there's no Round 2 - misleading |
| **Duplicate Hashtags** | Low | The hashtag list has duplicates (e.g., #SunsetCinematography appears twice) |
| **"Generate with Sora" Button** | High | This button appears but clicking it likely requires premium - no indication until you try |
| **Technical Jargon** | Medium | Terms like "ARRI Alexa Mini LF", "ProRes 4444 XQ", "IRE" may confuse non-professionals |

---

## 6. Videos List

### Positives
- Good filtering options (Series, Platform, Status, Sort)
- Search functionality present
- Video cards show key info (title, status, series, platform, date)
- Stats at top provide overview

### Issues & Confusion Points

| Issue | Severity | Description |
|-------|----------|-------------|
| **Title Truncation Without Tooltip** | Low | Long video titles are cut off with "..." but no way to see full title without clicking |
| **Status Badge "generated" Unclear** | Medium | What does "generated" mean? Is it a draft? Published? Ready for Sora? |
| **Menu Button (three dots) Has No Visible Options** | Low | The menu button exists but isn't clearly interactive |

---

## 7. Series Management

### Positives
- Series detail page is comprehensive
- Episode management available
- Character and Settings/Locations for continuity
- Visual Assets upload capability
- Character Relationships feature (though requires 2+ characters)

### Issues & Confusion Points

| Issue | Severity | Description |
|-------|----------|-------------|
| **"other" Badge Meaning** | High | Series shows "other" badge - what does this mean? No explanation |
| **"Standalone" Badge** | Medium | What's the difference between standalone and non-standalone series? |
| **"Continuity: Enforced • Breaks Allowed"** | High | This is contradictory and confusing - is continuity enforced or are breaks allowed? |
| **"Sora Visual Consistency" Section** | Medium | References "Sora 2 Best Practices" link but purpose is unclear |
| **No Videos Shown in Series View** | Medium | The series detail page doesn't show videos belonging to this series |
| **Episode Count Shows 0** | Low | Shows "0 episodes" but the video I created should count as something? Or are episodes separate from videos? |

---

## 8. Settings Page

### Positives
- Clean layout with clear sections
- Usage stats clearly displayed
- Theme toggle present
- Sign out accessible

### Issues & Confusion Points

| Issue | Severity | Description |
|-------|----------|-------------|
| **"Projects: 0/3" Confusion** | High | I created a series and video, but projects shows 0 - are projects different from series? |
| **"Videos this month: 1/10" vs Sidebar "10 left"** | Medium | Sidebar shows "AI Consultations: 10 left" but settings shows different metrics - confusing relationship |
| **No Account Deletion Option** | Low | Users may want to delete their account but no option exists |
| **No Notification Settings** | Low | No way to manage email preferences |

---

## 9. Upgrade Page

### Positives
- Clear pricing comparison (Free vs Pro)
- Features listed for each tier
- "Coming Soon" disclaimer is honest

### Issues & Confusion Points

| Issue | Severity | Description |
|-------|----------|-------------|
| **"Coming Soon" After Clicking Upgrade** | High | If upgrade isn't functional, the "Upgrade to Premium" CTA shouldn't be so prominent throughout the app |
| **Free Plan Shows "5 projects"** | Medium | But earlier I saw 3 projects limit in settings - inconsistency |
| **"Sora video generation" Listed as Pro Feature** | Medium | But "Generate with Sora" button appears for free users - misleading |

---

## 10. Concept Agent (AI-Assisted Series Creation)

### Positives
- Conversational interface is welcoming
- Phase indicator shows progress
- Helpful initial prompt

### Issues & Confusion Points

| Issue | Severity | Description |
|-------|----------|-------------|
| **Discovability** | High | This feature is hidden behind "AI-Assisted" link that looks like a tag, not a CTA |
| **Modal Covers Everything** | Low | The full-screen modal doesn't let you reference other content while creating |
| **No Context of What Will Be Created** | Medium | User doesn't know what a "comprehensive series concept" includes until they go through it |

---

## 11. General Navigation & Global Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| **No Breadcrumbs** | Medium | Deep pages like video roundtable have only "Back to Videos" - no breadcrumb trail |
| **No Help/Documentation Link** | High | No way to access help, docs, or tutorials |
| **No Keyboard Shortcuts** | Low | Power users have no keyboard navigation |
| **No Search Across All Content** | Medium | Search only works within Videos page, not globally |
| **Notifications Area Always Empty** | Low | Two notification regions visible but never used during testing |
| **No Loading Skeletons** | Medium | Page transitions show blank states before content loads |

---

## Priority Recommendations

### Critical (Fix Immediately)
1. **Add visual feedback for platform selection** - Users don't know if button is selected
2. **Explain "AI Consultations"** - Tooltip or help text needed
3. **Add progress indicator for AI generation** - Users need to know it's working
4. **Add onboarding flow** - First-time user tutorial or guided setup
5. **Clarify terminology** - Projects vs Series vs Episodes relationship

### High Priority
6. Simplify AI output with "Simple" vs "Detailed" modes
7. Fix duplicate hashtags
8. Make Concept Agent discoverable
9. Remove/gray out non-functional upgrade CTAs
10. Add help documentation link

### Medium Priority
11. Add breadcrumb navigation
12. Show videos in series detail view
13. Add loading skeletons
14. Fix metric inconsistencies (projects count, limits)
15. Explain continuity settings

---

## Screenshots Captured

All screenshots saved to `./ux-screenshots/`:
1. `01-landing-page.png` - Initial landing page
2. `02-signup-page.png` - Signup form
3. `03-login-page.png` - Login form
4. `04-dashboard-new-user.png` - Empty dashboard
5. `05-create-video-form.png` - Video creation form
6. `06-create-video-with-series.png` - Form after series selection
7. `07-ai-roundtable-processing.png` - AI agents working
8. `08-ai-roundtable-complete.png` - Full AI roundtable output
9. `09-videos-list.png` - Videos listing page
10. `10-series-list.png` - Series listing page
11. `11-series-detail.png` - Series detail view
12. `12-settings.png` - Settings page
13. `13-upgrade-page.png` - Upgrade/pricing page
14. `14-concept-agent.png` - AI concept agent dialog

---

## Conclusion

Scenra Studio has genuinely impressive AI capabilities - the multi-agent roundtable produces remarkably detailed, professional-grade prompts. However, the UX needs significant polish to help new users understand and utilize these powerful features effectively.

The main themes of confusion are:
1. **Terminology clarity** - Projects, Series, Episodes, Videos relationships are unclear
2. **Visual feedback** - Many interactions lack clear feedback (button states, progress indicators)
3. **Onboarding** - No guidance for first-time users
4. **Feature discoverability** - Powerful features are hidden or poorly labeled
5. **Metric consistency** - Usage limits shown differently in different places

With focused UX improvements, this could be a truly excellent product that helps creators produce professional video content.
