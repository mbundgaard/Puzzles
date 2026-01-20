<script lang="ts">
	import { t, translate, type Translations } from '$lib/i18n';
	import { APP_VERSION } from '$lib/version';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	let translations = $state<Translations>({});
	t.subscribe((value) => {
		translations = value;
	});

	function tr(key: string): string {
		return translate(translations, key);
	}

	const GITHUB_ISSUES_URL = 'https://github.com/mbundgaard/Puzzles/issues/';

	// Changelog entries - sorted by closedAt descending (newest first)
	// Add new entries at the TOP of this array
	// NOTE: Text is stored in translation files under changelog.[issue] keys
	const changelogEntries = [
		{ issue: 113, closedAt: '2026-01-20T07:15:00Z', submitter: 'User' },
		{ issue: 50, closedAt: '2026-01-19T12:00:00Z', submitter: 'TestUser' },
		{ issue: 100, closedAt: '2026-01-16T15:00:00Z', submitter: 'Martin' },
		{ issue: 103, closedAt: '2026-01-16T14:30:00Z', submitter: 'Martin' },
		{ issue: 104, closedAt: '2026-01-16T12:00:00Z', submitter: 'Martin' },
		{ issue: 90, closedAt: '2026-01-11T22:30:00Z', submitter: 'Martin' },
		{ issue: 94, closedAt: '2026-01-11T21:05:00Z', submitter: 'Martin' },
		{ issue: 96, closedAt: '2026-01-11T21:00:00Z', submitter: 'Martin' },
		{ issue: 97, closedAt: '2026-01-11T20:30:00Z', submitter: 'Martin' },
		{ issue: 92, closedAt: '2026-01-11T19:00:00Z', submitter: 'Martin' },
		{ issue: 93, closedAt: '2026-01-11T18:00:00Z', submitter: 'Martin' },
		{ issue: 91, closedAt: '2026-01-11T14:00:00Z', submitter: 'Martin' },
		{ issue: 89, closedAt: '2026-01-11T12:00:00Z', submitter: 'Martin' },
		{ issue: 55, closedAt: '2026-01-11T00:30:00Z', submitter: 'Sara' },
		{ issue: 71, closedAt: '2026-01-10T23:59:00Z', submitter: 'Martin' },
		{ issue: 86, closedAt: '2026-01-10T23:54:00Z', submitter: 'Martin' },
		{ issue: 88, closedAt: '2026-01-10T23:44:00Z', submitter: 'Martin' },
		{ issue: 74, closedAt: '2026-01-10T22:15:00Z', submitter: 'Martin' },
		{ issue: 68, closedAt: '2026-01-10T22:00:00Z', submitter: 'Martin' },
		{ issue: 84, closedAt: '2026-01-10T21:00:00Z', submitter: 'Martin' },
		{ issue: 85, closedAt: '2026-01-10T20:00:00Z', submitter: 'Martin' },
		{ issue: 77, closedAt: '2026-01-10T18:00:00Z', submitter: 'Martin' },
		{ issue: 60, closedAt: '2026-01-10T18:00:00Z', submitter: 'Martin' },
		{ issue: 79, closedAt: '2026-01-10T17:00:00Z', submitter: 'Sara' },
		{ issue: 76, closedAt: '2026-01-10T16:00:00Z', submitter: 'Martin' },
		{ issue: 73, closedAt: '2026-01-10T14:00:00Z', submitter: 'Martin' },
		{ issue: 70, closedAt: '2026-01-10T12:00:00Z', submitter: 'Martin' },
		{ issue: 66, closedAt: '2026-01-09T11:55:00Z', submitter: 'Sara' },
		{ issue: 17, closedAt: '2026-01-09T10:00:00Z', submitter: 'Sara' },
		{ issue: 63, closedAt: '2026-01-09T09:30:00Z', submitter: 'Sara' },
		{ issue: 64, closedAt: '2026-01-09T07:08:00Z', submitter: 'Sara' },
		{ issue: 65, closedAt: '2026-01-09T07:02:00Z', submitter: 'Sara' },
		{ issue: 61, closedAt: '2026-01-07T12:00:00Z', submitter: 'Martin' },
		{ issue: 59, closedAt: '2026-01-06T10:00:00Z', submitter: 'Martin' },
		{ issue: 48, closedAt: '2026-01-05T10:30:00Z', submitter: 'TestUser' },
		{ issue: 53, closedAt: '2026-01-03T17:20:00Z', submitter: 'Martin' },
		{ issue: 56, closedAt: '2026-01-03T16:30:00Z', submitter: 'User' },
		{ issue: 24, closedAt: '2026-01-03T15:01:00Z', submitter: 'User' },
	];

	function formatDate(isoString: string): string {
		return new Date(isoString).toLocaleDateString('en', { month: 'short', day: 'numeric' });
	}

	function formatVersion(): string {
		const date = new Date(APP_VERSION * 1000); // Convert seconds to milliseconds
		const options: Intl.DateTimeFormatOptions = {
			timeZone: 'Europe/Copenhagen',
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		};
		return date.toLocaleString('da-DK', options);
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div class="overlay" onclick={handleOverlayClick} role="dialog" aria-modal="true">
		<div class="modal">
			<div class="header">
				<h2>{tr('settings.changelog')}</h2>
			</div>

			<div class="entries">
				{#each changelogEntries as entry}
					<div class="entry">
						<div class="entry-header">
							<a href="{GITHUB_ISSUES_URL}{entry.issue}" target="_blank" rel="noopener noreferrer" class="github-link" title="Issue #{entry.issue}">
								<svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
									<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
								</svg>
								<span class="date">{formatDate(entry.closedAt)}</span>
							</a>
							<span class="submitter">{entry.submitter}</span>
						</div>
						<p class="entry-text">{tr('changelog.' + entry.issue)}</p>
					</div>
				{/each}
			</div>

			<div class="version">
				{formatVersion()}
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.modal {
		background: linear-gradient(145deg, #1e1e3f 0%, #0f0f23 100%);
		border-radius: 20px;
		padding: 24px;
		max-width: 320px;
		width: 100%;
		max-height: 80vh;
		overflow-y: auto;
		animation: slideUp 0.3s ease;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	@keyframes slideUp {
		from { transform: translateY(20px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	.header {
		text-align: center;
		margin-bottom: 16px;
	}

	h2 {
		font-size: 1.5rem;
		font-weight: 800;
		background: linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #d946ef 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 4px 0;
	}

	.version {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
		text-align: center;
		margin-top: 16px;
	}

	.entries {
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-height: 400px;
		overflow-y: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.entries::-webkit-scrollbar {
		display: none;
	}

	.entry {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 10px;
		padding: 12px 14px;
	}

	.entry-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	.github-link {
		display: flex;
		align-items: center;
		gap: 8px;
		color: rgba(255, 255, 255, 0.5);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.github-link:active {
		color: #a5b4fc;
	}

	.github-icon {
		width: 14px;
		height: 14px;
	}

	.date {
		font-size: 0.8rem;
	}

	.submitter {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.entry-text {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.85);
		line-height: 1.4;
		margin: 0;
	}

</style>
