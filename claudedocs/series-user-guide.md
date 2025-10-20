# Series Continuity System - User Guide

**Status**: ✅ Ready to Use
**Version**: 1.0
**Last Updated**: 2025-10-19

## Overview

The Series Continuity System allows you to create video series with consistent characters, settings, and visual styles across multiple episodes. This ensures your series maintains visual and narrative continuity.

## Getting Started

### Accessing Series Management

1. **Navigate to your project** - Go to Dashboard → Projects → Select your project
2. **Click "Manage Series"** - Button in the top-right corner of the project page
3. **Or click "View All"** - If you already have series, click the "View All" link in the Series section

### Navigation Flow

```
Dashboard
  └── Projects
      └── Your Project
          ├── Videos (existing functionality)
          └── Series (NEW!)
              ├── Series List Page
              └── Series Detail Page
                  ├── Characters
                  └── Settings
```

## Creating Your First Series

### Step 1: Create a Series

1. On the **Series page**, click **"New Series"**
2. Fill in the form:
   - **Series Name*** (required) - e.g., "Maya's Journey", "Product Showcase 2024"
   - **Description** (optional) - Brief description of your series
   - **Genre** - Select from:
     - Narrative (story-driven content)
     - Product Showcase (product demos/reviews)
     - Educational (tutorials, how-tos)
     - Brand Content (branded entertainment)
     - Other
3. Click **"Create Series"**

### Step 2: Add Characters

Once your series is created, you'll be on the Series Detail page.

1. In the **Characters** section, click **"Add Character"**
2. Fill in character details:
   - **Character Name*** (required) - e.g., "Maya", "The Host"
   - **Description*** (required) - Physical appearance, clothing, distinctive features
   - **Role** - Select character importance:
     - Protagonist (main character)
     - Supporting (secondary character)
     - Background (minor role)
     - Other
   - **Performance Style** (optional) - e.g., "deliberate and unhurried", "energetic and enthusiastic"
3. Click **"Add Character"**

**Example Character**:
```
Name: Maya
Description: Young woman in her late 20s with shoulder-length dark hair,
wearing casual modern clothing. Warm smile and expressive eyes.
Role: Protagonist
Performance: Deliberate and unhurried, authentic and relatable
```

### Step 3: Add Settings/Locations

1. In the **Settings & Locations** section, click **"Add Setting"**
2. Fill in setting details:
   - **Setting Name*** (required) - e.g., "Coffee Shop", "Maya's Apartment"
   - **Description*** (required) - Detailed description of location, props, mood
   - **Environment Type** - Interior, Exterior, Mixed, Other
   - **Time of Day** (optional) - e.g., "morning", "golden hour", "evening"
   - **Atmosphere** (optional) - e.g., "cozy", "bustling", "serene"
   - **Primary Setting** checkbox - Mark frequently used locations
3. Click **"Add Setting"**

**Example Setting**:
```
Name: Coffee Shop
Description: Cozy neighborhood coffee shop with warm lighting, wooden tables,
plants by the window. Modern minimalist aesthetic with natural materials.
Environment: Interior
Time of Day: morning
Atmosphere: cozy and welcoming
✓ Primary Setting
```

## Managing Your Series

### Editing Characters

1. Navigate to your series detail page
2. Find the character you want to edit
3. Click the **Edit** icon (pencil)
4. Update the details
5. Click **"Update Character"**

### Editing Settings

1. Navigate to your series detail page
2. Find the setting you want to edit
3. Click the **Edit** icon (pencil)
4. Update the details
5. Click **"Update Setting"**

### Deleting Items

- **Characters**: Click the trash icon → Confirm deletion
- **Settings**: Click the trash icon → Confirm deletion
- **Series**: Click the Settings button on series detail page (coming in Phase 2)

**⚠️ Warning**: Deleting characters or settings cannot be undone!

## Understanding Series Features

### Primary Settings

Mark your most frequently used locations as "Primary" (star icon). This helps you:
- Quickly identify main shooting locations
- Prioritize locations in episode planning
- Maintain visual consistency across episodes

### Character Roles

- **Protagonist**: Main character(s) central to your series
- **Supporting**: Important recurring characters
- **Background**: Minor characters with occasional appearances
- **Other**: Specialized or unique character types

### Performance Styles

Use performance style to describe HOW characters move and act:
- "Deliberate and unhurried" - Slow, thoughtful movements
- "Energetic and dynamic" - Quick, lively actions
- "Confident and assured" - Strong, purposeful gestures
- "Subtle and nuanced" - Minimal, expressive movements

This helps maintain consistent character behavior across episodes.

## Best Practices

### Character Descriptions

✅ **Good Example**:
```
Young woman in her late 20s, shoulder-length dark hair with natural waves,
wearing a minimalist white button-down and dark jeans. Warm smile, expressive
brown eyes. Silver watch on left wrist. Natural makeup, professional appearance.
```

❌ **Avoid**:
```
Maya is nice and friendly
```

**Tips**:
- Be specific about physical features (hair, eyes, clothing)
- Include distinctive characteristics (accessories, style, posture)
- Describe what makes them recognizable
- Use visual details, not personality traits

### Setting Descriptions

✅ **Good Example**:
```
Modern minimalist apartment with floor-to-ceiling windows overlooking the city.
White walls, light wood floors, green plants throughout. Mid-century modern
furniture in neutral tones. Large dining table serves as workspace. Natural
light from east-facing windows, warm artificial lighting from pendant lamps.
```

❌ **Avoid**:
```
Nice apartment
```

**Tips**:
- Describe the physical space in detail
- Include lighting conditions
- Mention props and furniture
- Specify colors and materials
- Note windows, doors, spatial layout

### Naming Conventions

- **Characters**: Use actual names ("Maya", "Dr. Chen") or roles ("The Host", "Product Expert")
- **Settings**: Use descriptive location names ("Downtown Coffee Shop", "Maya's Kitchen")
- **Series**: Clear, memorable names that describe the content

## Phase 1 Limitations

Currently implemented:
- ✅ Create and manage series
- ✅ Add characters with detailed descriptions
- ✅ Add settings/locations with atmosphere details
- ✅ Edit and delete characters/settings
- ✅ View all series in a project

Coming in Phase 2:
- 📋 Link videos to series as episodes
- 📋 Automatic context injection (characters/settings added to prompts)
- 📋 Character evolution over time
- 📋 Visual style templates
- 📋 Episode ordering and timeline
- 📋 Series-aware video generation

## Troubleshooting

### "Series not found" error
- Verify you're accessing the series from the correct project
- Check that you have permission to access the project
- Try refreshing the page

### Characters/Settings not saving
- Ensure all required fields (marked with *) are filled
- Check that character/setting names are unique within the series
- Verify you have a stable internet connection

### Can't delete a character/setting
- Ensure you own the project and series
- Try refreshing the page and attempting again
- Check browser console for errors

## API Endpoints (for developers)

If you're integrating programmatically:

**Series**:
- `GET /api/projects/{projectId}/series` - List series
- `POST /api/projects/{projectId}/series` - Create series
- `GET /api/series/{seriesId}` - Get series details
- `PATCH /api/series/{seriesId}` - Update series
- `DELETE /api/series/{seriesId}` - Delete series

**Characters**:
- `GET /api/series/{seriesId}/characters` - List characters
- `POST /api/series/{seriesId}/characters` - Create character
- `PATCH /api/series/{seriesId}/characters/{characterId}` - Update
- `DELETE /api/series/{seriesId}/characters/{characterId}` - Delete

**Settings**:
- `GET /api/series/{seriesId}/settings` - List settings
- `POST /api/series/{seriesId}/settings` - Create setting
- `PATCH /api/series/{seriesId}/settings/{settingId}` - Update
- `DELETE /api/series/{seriesId}/settings/{settingId}` - Delete

---

## Need Help?

For technical issues or questions:
1. Check this user guide
2. Review the implementation docs: `claudedocs/phase-1-series-implementation.md`
3. Check the specification: `claudedocs/video-series-continuity-spec.md`

**Happy series creating!** 🎬
