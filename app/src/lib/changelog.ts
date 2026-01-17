// Changelog entries - sorted by closedAt descending (newest first)
// Add new entries at the TOP of this array
// NOTE: Text is stored in translation files under changelog.[issue] keys

export interface ChangelogEntry {
	issue: number;
	closedAt: string;
	submitter: string;
	game?: string; // Optional game ID (e.g., "24-tangram") for game-specific changes
}

export const changelogEntries: ChangelogEntry[] = [
	{ issue: 98, closedAt: '2026-01-17T10:00:00Z', submitter: 'Martin' },
	{ issue: 100, closedAt: '2026-01-16T15:00:00Z', submitter: 'Martin', game: '28-labyrint' },
	{ issue: 103, closedAt: '2026-01-16T14:30:00Z', submitter: 'Martin', game: '25-saenke-slagskibe' },
	{ issue: 104, closedAt: '2026-01-16T12:00:00Z', submitter: 'Martin', game: '24-tangram' },
	{ issue: 107, closedAt: '2026-01-16T10:30:00Z', submitter: 'Martin', game: '30-halv-12' },
	{ issue: 106, closedAt: '2026-01-16T10:16:00Z', submitter: 'Martin' },
	{ issue: 90, closedAt: '2026-01-11T22:30:00Z', submitter: 'Martin' },
	{ issue: 94, closedAt: '2026-01-11T21:05:00Z', submitter: 'Martin', game: '27-ordsogning' },
	{ issue: 96, closedAt: '2026-01-11T21:00:00Z', submitter: 'Martin', game: '04-quiz-master' },
	{ issue: 97, closedAt: '2026-01-11T20:30:00Z', submitter: 'Martin', game: '04-quiz-master' },
	{ issue: 92, closedAt: '2026-01-11T19:00:00Z', submitter: 'Martin', game: '04-quiz-master' },
	{ issue: 93, closedAt: '2026-01-11T18:00:00Z', submitter: 'Martin', game: '04-quiz-master' },
	{ issue: 91, closedAt: '2026-01-11T14:00:00Z', submitter: 'Martin' },
	{ issue: 89, closedAt: '2026-01-11T12:00:00Z', submitter: 'Martin' },
	{ issue: 55, closedAt: '2026-01-11T00:30:00Z', submitter: 'Sara', game: '04-quiz-master' },
	{ issue: 71, closedAt: '2026-01-10T23:59:00Z', submitter: 'Martin', game: '27-ordsogning' },
	{ issue: 86, closedAt: '2026-01-10T23:54:00Z', submitter: 'Martin' },
	{ issue: 88, closedAt: '2026-01-10T23:44:00Z', submitter: 'Martin' },
	{ issue: 74, closedAt: '2026-01-10T22:15:00Z', submitter: 'Martin', game: '25-saenke-slagskibe' },
	{ issue: 68, closedAt: '2026-01-10T22:00:00Z', submitter: 'Martin', game: '10-ordleg' },
	{ issue: 84, closedAt: '2026-01-10T21:00:00Z', submitter: 'Martin' },
	{ issue: 85, closedAt: '2026-01-10T20:00:00Z', submitter: 'Martin' },
	{ issue: 77, closedAt: '2026-01-10T18:00:00Z', submitter: 'Martin' },
	{ issue: 60, closedAt: '2026-01-10T18:00:00Z', submitter: 'Martin' },
	{ issue: 79, closedAt: '2026-01-10T17:00:00Z', submitter: 'Sara' },
	{ issue: 76, closedAt: '2026-01-10T16:00:00Z', submitter: 'Martin' },
	{ issue: 73, closedAt: '2026-01-10T14:00:00Z', submitter: 'Martin' },
	{ issue: 70, closedAt: '2026-01-10T12:00:00Z', submitter: 'Martin' },
	{ issue: 66, closedAt: '2026-01-09T11:55:00Z', submitter: 'Sara' },
	{ issue: 17, closedAt: '2026-01-09T10:00:00Z', submitter: 'Sara', game: '29-maskevaerk' },
	{ issue: 63, closedAt: '2026-01-09T09:30:00Z', submitter: 'Sara' },
	{ issue: 64, closedAt: '2026-01-09T07:08:00Z', submitter: 'Sara', game: '10-ordleg' },
	{ issue: 65, closedAt: '2026-01-09T07:02:00Z', submitter: 'Sara', game: '10-ordleg' },
	{ issue: 61, closedAt: '2026-01-07T12:00:00Z', submitter: 'Martin' },
	{ issue: 59, closedAt: '2026-01-06T10:00:00Z', submitter: 'Martin' },
	{ issue: 56, closedAt: '2026-01-05T22:00:00Z', submitter: 'Martin' },
	{ issue: 37, closedAt: '2025-12-31T14:30:00Z', submitter: 'Martin' },
	{ issue: 40, closedAt: '2025-12-30T17:10:00Z', submitter: 'Martin', game: '12-roerfoering' },
	{ issue: 41, closedAt: '2025-12-30T16:45:00Z', submitter: 'Martin', game: '12-roerfoering' },
	{ issue: 38, closedAt: '2025-12-30T12:00:00Z', submitter: 'Martin' },
	{ issue: 29, closedAt: '2025-12-29T18:00:00Z', submitter: 'Martin' },
	{ issue: 30, closedAt: '2025-12-29T17:30:00Z', submitter: 'Martin' },
	{ issue: 48, closedAt: '2026-01-05T10:30:00Z', submitter: 'TestUser', game: '28-labyrint' },
	{ issue: 53, closedAt: '2026-01-03T17:20:00Z', submitter: 'Martin', game: '26-gaet-dyret' },
	{ issue: 56, closedAt: '2026-01-03T16:30:00Z', submitter: 'User', game: '27-ordsogning' },
	{ issue: 24, closedAt: '2026-01-03T15:01:00Z', submitter: 'User', game: '27-ordsogning' }
];

// Get changelog entries for a specific game
export function getGameChangelog(gameId: string): ChangelogEntry[] {
	return changelogEntries.filter(entry => entry.game === gameId);
}

// Get the most recent changelog entries for a game (max 3)
export function getRecentGameChangelog(gameId: string, max: number = 3): ChangelogEntry[] {
	return getGameChangelog(gameId).slice(0, max);
}
