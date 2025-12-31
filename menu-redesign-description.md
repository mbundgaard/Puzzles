# Hjernespil Menu Redesign

## Overview
Redesign the main page header to follow standard mobile app patterns. Replace the current 6 scattered icons with a clean header containing only 2 buttons, using an overflow menu (⋮) for secondary actions.

## Changes Required

### 1. App Name Styling
Update the app name to use two colors:
- "Hjerne" → white (#ffffff)
- "spil" → orange (#f59e0b)

### 2. Header Layout
The header should contain (left to right):
- **Logo/App name** (left side)
- **Leaderboard button** 🏆 (right side, always visible)
- **Overflow menu button** ⋮ (right side, far right)

### 3. Overflow Menu (⋮)
When tapped, show a dropdown menu with these items:
1. **📤 Del app** - Opens share dialog (combine current SMS + QR options)
2. --- divider ---
3. **📋 Ændringer** - Changelog
4. **ℹ️ Om appen** - App information
5. --- divider ---
6. **🔄 Opdater** - Refresh

### 4. Remove from Header
Remove these individual icons from the header:
- Refresh icon (moved to overflow menu)
- Share SMS icon (merged into "Del app")
- Share QR icon (merged into "Del app")
- Changelog icon (moved to overflow menu)
- Info icon (moved to overflow menu)

### 5. Keep Unchanged
- Footer with "💡 Ny spil-idé" button stays as-is
- Game list and content area stays as-is

## Visual Specifications

### Header
- Background: #1a1a2e
- Height: ~60px
- Border bottom: 1px solid rgba(255,255,255,0.1)

### Icon Buttons
- Size: 40x40px
- Background: rgba(255,255,255,0.1)
- Border radius: 10px
- Hover: rgba(255,255,255,0.2)

### Overflow Menu
- Background: #2a2a4a
- Border radius: 12px
- Box shadow: 0 10px 40px rgba(0,0,0,0.4)
- Min width: 180px
- Position: Below the ⋮ button, aligned right

### Menu Items
- Padding: 14px 16px
- Font size: 15px
- Color: white
- Hover background: rgba(255,255,255,0.1)
- Icon opacity: 0.7

### Menu Divider
- Height: 1px
- Background: rgba(255,255,255,0.1)
- Margin: 4px 0

## Behavior
1. Tap ⋮ → menu slides in with fade (opacity 0→1, translateY -10px→0)
2. Tap outside menu or tap menu item → menu closes
3. Optional: Add backdrop overlay when menu is open

## Reference
See the accompanying HTML mockup file for visual reference.
