# Custom Map Icons

This directory contains custom icons for the AGAP responder dashboard map.

## Required Icons

1. **alert-icon.png** - Icon for Emergency Alerts
   - Recommended size: 30x30px
   - Format: PNG with transparent background
   - Color: Red or orange recommended to indicate urgency

2. **report-icon.png** - Icon for Emergency Reports
   - Recommended size: 30x30px
   - Format: PNG with transparent background
   - Color: Blue or different color to distinguish from alerts

## Icon Specifications

- **Size**: 30x30 pixels
- **Format**: PNG
- **Background**: Transparent
- **Anchor Point**: Bottom center (15, 30)

## Adding Icons

1. Create or download your icon images
2. Resize them to 30x30px
3. Save them as PNG files with transparent backgrounds
4. Place them in this directory:
   - `alert-icon.png`
   - `report-icon.png`

## Fallback

If icons are not found, the map will attempt to load them. If they fail to load, you may see broken image icons. Make sure the files are properly placed in `/public/icons/` directory.

