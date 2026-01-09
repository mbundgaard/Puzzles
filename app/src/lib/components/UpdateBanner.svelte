<script lang="ts">
	import { onMount } from 'svelte';
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import { t, translate, type Translations } from '$lib/i18n';

	let translations = $state<Translations>({});
	t.subscribe((value) => {
		translations = value;
	});

	function tr(key: string): string {
		return translate(translations, key);
	}

	let needRefresh = $state(false);
	let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

	onMount(() => {
		const { needRefresh: needRefreshStore, updateServiceWorker } = useRegisterSW({
			onRegistered(registration) {
				console.log('SW registered:', registration);
			},
			onRegisterError(error) {
				console.error('SW registration error:', error);
			}
		});

		needRefreshStore.subscribe((value) => {
			needRefresh = value;
		});

		updateSW = updateServiceWorker;
	});

	function handleUpdate() {
		if (updateSW) {
			updateSW(true);
		}
	}
</script>

{#if needRefresh}
	<div class="update-banner">
		<span class="update-text">{tr('update.available')}</span>
		<button class="update-btn" onclick={handleUpdate}>
			{tr('update.refresh')}
		</button>
	</div>
{/if}

<style>
	.update-banner {
		position: fixed;
		bottom: 70px;
		left: 16px;
		right: 16px;
		background: linear-gradient(135deg, #1e1e3f 0%, #2d1f4e 100%);
		border: 1px solid rgba(236, 72, 153, 0.3);
		border-radius: 12px;
		padding: 12px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		z-index: 200;
		animation: slideUp 0.3s ease;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
	}

	@keyframes slideUp {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.update-text {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.update-btn {
		padding: 8px 16px;
		background: linear-gradient(135deg, #ec4899 0%, #d946ef 100%);
		border: none;
		border-radius: 8px;
		color: white;
		font-size: 0.85rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		cursor: pointer;
		transition: transform 0.2s ease;
		white-space: nowrap;
	}

	.update-btn:active {
		transform: scale(0.95);
	}
</style>
