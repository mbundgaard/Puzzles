<script lang="ts">
	import { onMount } from 'svelte';
	import { t, translate, type Translations } from '$lib/i18n';

	let translations = $state<Translations>({});
	t.subscribe((value) => {
		translations = value;
	});

	function tr(key: string): string {
		return translate(translations, key);
	}

	let showBanner = $state(false);
	let isIOS = $state(false);

	onMount(() => {
		// Check if running as PWA
		const isStandalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator as any).standalone === true;

		if (!isStandalone) {
			// Detect iOS for specific instructions
			isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
			showBanner = true;
		}
	});
</script>

{#if showBanner}
	<div class="install-card">
		<div class="install-icon">📲</div>
		<div class="install-info">
			<div class="install-title">{tr('install.title')}</div>
			{#if isIOS}
				<div class="install-hint">
					{tr('install.iosHint1')}
					<svg class="share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
						<polyline points="16 6 12 2 8 6"/>
						<line x1="12" y1="2" x2="12" y2="15"/>
					</svg>
					{tr('install.iosHint2')}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.install-card {
		display: flex;
		align-items: center;
		gap: 15px;
		padding: 16px 20px;
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
		border: 2px solid rgba(236, 72, 153, 0.6);
		border-radius: 16px;
		color: white;
		box-shadow: 0 0 20px rgba(236, 72, 153, 0.2);
	}

	.install-icon {
		font-size: 2rem;
		width: 50px;
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(236, 72, 153, 0.1);
		border-radius: 12px;
	}

	.install-info {
		flex: 1;
	}

	.install-title {
		font-size: 1.1rem;
		font-weight: 600;
		margin-bottom: 2px;
	}

	.install-hint {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.share-icon {
		display: inline-block;
		width: 1.1em;
		height: 1.1em;
		vertical-align: middle;
		margin: 0 2px;
	}

	@media (min-width: 500px) {
		.install-card {
			flex-direction: column;
			text-align: center;
			padding: 24px 16px;
		}

		.install-icon {
			width: 60px;
			height: 60px;
			font-size: 2.5rem;
		}

		.install-hint {
			margin-top: 4px;
		}
	}
</style>
