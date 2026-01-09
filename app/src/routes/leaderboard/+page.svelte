<script lang="ts">
	import { getLeaderboard, formatPeriod, type LeaderboardEntry } from '$lib/api';
	import { t, translate, type Translations } from '$lib/i18n';
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

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

	onMount(() => {
		loadLeaderboard();
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

	function escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
</script>

<svelte:head>
	<title>{tr('leaderboard.title')} - {tr('app.title')}</title>
</svelte:head>

<PageHeader title={tr('leaderboard.title')} subtitle={period} />

<div class="leaderboard-page">
	<main>
		{#if loading}
			<div class="card message-card">
				<p class="message">{tr('leaderboard.loading')}</p>
			</div>
		{:else if error}
			<div class="card message-card">
				<p class="message">{tr('leaderboard.error')}</p>
				<button class="retry-btn" onclick={loadLeaderboard}>Prøv igen</button>
			</div>
		{:else if entries.length === 0}
			<div class="card message-card">
				<p class="message">{tr('leaderboard.empty')}</p>
			</div>
		{:else}
			<div class="entries">
				{#each entries as entry, i}
					<div class="card entry" class:top-three={i < 3}>
						<span class="rank" class:gold={i === 0} class:silver={i === 1} class:bronze={i === 2}>
							{#if i === 0}🥇{:else if i === 1}🥈{:else if i === 2}🥉{:else}{i + 1}.{/if}
						</span>
						<span class="name">{escapeHtml(entry.nickname)}</span>
						<span class="points">{entry.points} {tr('leaderboard.points')}</span>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>

<style>
	.leaderboard-page {
		padding-top: 90px;
		padding-bottom: 20px;
	}

	main {
		padding: 0 20px;
		max-width: 500px;
		margin: 0 auto;
	}

	.entries {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.card {
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 14px;
	}

	.message-card {
		padding: 30px 20px;
		text-align: center;
	}

	.message {
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.retry-btn {
		margin-top: 12px;
		padding: 10px 24px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 20px;
		color: white;
		font-family: 'Poppins', sans-serif;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.retry-btn:active {
		transform: scale(0.95);
		background: rgba(255, 255, 255, 0.15);
	}

	.entry {
		display: flex;
		align-items: center;
		padding: 12px 16px;
	}

	.entry.top-three {
		background: rgba(255, 255, 255, 0.12);
	}

	.rank {
		font-weight: 700;
		color: rgba(255, 255, 255, 0.5);
		width: 36px;
		font-size: 1rem;
		text-align: center;
	}

	.rank.gold, .rank.silver, .rank.bronze {
		font-size: 1.3rem;
	}

	.name {
		flex: 1;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 500;
		font-size: 1rem;
	}

	.entry.top-three .name {
		font-weight: 600;
	}

	.points {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.9rem;
	}
</style>
