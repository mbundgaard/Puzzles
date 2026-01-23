# Fix Issue

Investigate and fix issue #$ARGUMENTS.

## Workflow:

1. **Fetch issue details** from GitHub API:
   `https://api.github.com/repos/mbundgaard/Puzzles/issues/$ARGUMENTS`

2. **Understand the problem** - Read the issue description and any comments

3. **Find relevant code** - Search the codebase for files related to the issue

4. **Implement the fix** - Make the necessary code changes

5. **After fixing**, run `/deploy $ARGUMENTS` to complete the deployment process

## Important reminders:
- Follow touch-first design (no right-click, no keyboard dependencies)
- All UI text must be translated in da, en, fr
- Test the fix mentally before deploying
