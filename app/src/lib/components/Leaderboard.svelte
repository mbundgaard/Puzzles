<script lang="ts">
	import { getLeaderboard, formatPeriod, type LeaderboardEntry } from '$lib/api';
	import { t, translate, type Translations } from '$lib/i18n';

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

	let entries = $state<LeaderboardEntry[]>([]);
	let period = $state('');
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		if (isOpen) {
			loadLeaderboard();
		}
	});

	async function loadLeaderboard() {
		loading = true;
		error = false;

		try {
			const data = await getLeaderboard(null, 10);
			entries = data.entries || [];
			period = data.period ? formatPeriod(data.period) : '';
		} catch {
			error = true;
		} finally {
			loading = false;
		}
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div class="overlay" onclick={handleOverlayClick} role="dialog" aria-modal="true">
		<div class="modal">
			<button class="close-btn" onclick={onClose} aria-label={tr('leaderboard.close')}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18"/>
					<line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>

			<div class="emoji">🏆</div>
			<h3>{tr('leaderboard.title')}</h3>
			{#if period}
				<p class="period">{period}</p>
			{/if}

			<div class="list">
				{#if loading}
					<p class="message">{tr('leaderboard.loading')}</p>
				{:else if error}
					<p class="message">{tr('leaderboard.error')}</p>
				{:else if entries.length === 0}
					<p class="message">{tr('leaderboard.empty')}</p>
				{:else}
					{#each entries as entry, i}
						<div class="entry">
							<span class="rank" class:gold={i === 0} class:silver={i === 1} class:bronze={i === 2}>
								{i + 1}.
							</span>
							<span class="name">{escapeHtml(entry.nickname)}</span>
							<span class="points">{entry.points} {tr('leaderboard.points')}</span>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
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
		padding: 25px;
		max-width: 380px;
		width: 100%;
		text-align: center;
		animation: popIn 0.3s ease;
		border: 1px solid rgba(255, 255, 255, 0.1);
		position: relative;
	}

	@keyframes popIn {
		from { transform: scale(0.9); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}

	.close-btn {
		position: absolute;
		top: 12px;
		right: 12px;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: 50%;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.close-btn:active {
		transform: scale(0.9);
		background: rgba(255, 255, 255, 0.2);
	}

	.emoji {
		font-size: 3rem;
		margin-bottom: 10px;
	}

	h3 {
		font-size: 1.5rem;
		font-weight: 700;
		color: white;
		margin: 0;
	}

	.period {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.9rem;
		margin-top: 4px;
	}

	.list {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 8px;
		max-height: 420px;
		overflow-y: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
		margin-top: 16px;
	}

	.list::-webkit-scrollbar {
		display: none;
	}

	.message {
		color: rgba(255, 255, 255, 0.5);
		padding: 20px;
		text-align: center;
		margin: 0;
	}

	.entry {
		display: flex;
		align-items: center;
		padding: 10px 12px;
		border-radius: 8px;
	}

	.entry:nth-child(odd) {
		background: rgba(255, 255, 255, 0.03);
	}

	.rank {
		font-weight: 700;
		color: rgba(255, 255, 255, 0.5);
		width: 28px;
		font-size: 0.95rem;
	}

	.rank.gold { color: #fbbf24; }
	.rank.silver { color: #9ca3af; }
	.rank.bronze { color: #b45309; }

	.name {
		flex: 1;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 500;
		text-align: left;
	}

	.points {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.85rem;
	}
</style>
