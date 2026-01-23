# List Open Issues

Fetch and display all open issues from the GitHub repository.

## Instructions:

1. Fetch issues from: `https://api.github.com/repos/mbundgaard/Puzzles/issues?state=open`

2. Group issues by type in this order:
   - **General Feedback** - site/app feedback (game label is null/empty)
   - **Game Suggestions** - new game ideas (game = "00" or titles starting with "New Game:")
   - **Game Feedback** - feedback about specific games (has a game label like "Game XX - Name")

3. Display using this table format:

```
General Feedback
┌─────┬────────────────────────────────────────────┐
│  #  │                   Title                    │
├─────┼────────────────────────────────────────────┤
│ 82  │ News page should support selected language │
└─────┴────────────────────────────────────────────┘
```

4. Show a summary at the end with total counts per category.
