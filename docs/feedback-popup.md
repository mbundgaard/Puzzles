# Feedback Popup

A gentle popup encouraging users to provide feedback or suggest new games.

## Trigger Logic

- Show **once per week** (7 days)
- Uses `localStorage` key: `feedbackPopupLastShown`
- On page load, check if 7+ days have passed since last shown
- Update timestamp when popup is shown (regardless of user choice)

```javascript
const POPUP_KEY = 'feedbackPopupLastShown';
const POPUP_INTERVAL_DAYS = 7;

function shouldShowFeedbackPopup() {
    const lastShown = localStorage.getItem(POPUP_KEY);
    if (!lastShown) return true;

    const daysSince = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
    return daysSince >= POPUP_INTERVAL_DAYS;
}

function markPopupShown() {
    localStorage.setItem(POPUP_KEY, Date.now().toString());
}
```

## UI Design

Modal popup, consistent with existing modals (info, feedback, win).

```
┌─────────────────────────────────────┐
│                                   ✕ │
│                                     │
│      Hvad synes du om spillene?     │
│                                     │
│    Vi vil meget gerne høre din      │
│    mening eller idéer til nye spil  │
│                                     │
│  ┌─────────────┐  ┌──────────────┐  │
│  │  Ja, gerne  │  │ Måske senere │  │
│  └─────────────┘  └──────────────┘  │
└─────────────────────────────────────┘
```

## Buttons

| Button | Action |
|--------|--------|
| **Ja, gerne** | Close popup → Open existing feedback modal |
| **Måske senere** | Close popup |
| **✕** | Close popup (same as "Måske senere") |

## Behavior

1. Page loads
2. Check `shouldShowFeedbackPopup()`
3. If true, show popup after short delay (500ms)
4. Call `markPopupShown()` immediately when popup is displayed
5. User clicks button or ✕ → close popup
6. If "Ja, gerne" → trigger `openFeedbackModal()` (existing function)

## Styling

- Same glassmorphism style as other modals
- Dark overlay background
- Centered on screen
- Mobile-friendly (responsive width)
- Smooth fade-in animation

## Text (Danish)

- **Title:** "Hvad synes du om spillene?"
- **Body:** "Vi vil meget gerne høre din mening eller idéer til nye spil"
- **Button 1:** "Ja, gerne"
- **Button 2:** "Måske senere"

## Notes

- Popup is shown max once per week, even if dismissed
- No distinction between "Ja, gerne" and "Måske senere" for timing purposes
- Feedback modal handles the actual feedback/suggestion submission
