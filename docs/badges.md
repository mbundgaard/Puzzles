# Badge System

Badges highlight new or recently updated games on the home page. Badges are dynamically calculated based on game dates in the registry.

## Badge Types

| Badge | Color | Condition |
|-------|-------|-----------|
| NY / NEW / NOUVEAU | Green | Game created within 7 days |
| OPDATERET / UPDATED / MIS À JOUR | Orange | Game updated within 7 days (and not new) |

## How It Works

1. Game registry contains `created` and `updated` dates for each game
2. On render, badges are calculated based on current date
3. Games are auto-sorted: newest/updated first

## Badge Logic

1. Check if game's **Created** date is within 7 days → show NEW badge
2. If created more than 7 days ago, check **Updated** date
3. If **Updated** date is within 7 days → show UPDATED badge
4. If neither condition met → no badge

## Adding a New Game (Badge Steps)

1. Set `created` date to today in the game registry
2. Badge will automatically appear for 7 days

## Updating an Existing Game (Badge Steps)

1. Update the `updated` field in the game registry
2. Update the **Updated** column in README.md to match
3. UPDATED badge will automatically appear for 7 days (if game is older than 7 days)

**Note:** Badges are automatically calculated - no manual badge HTML needed!
