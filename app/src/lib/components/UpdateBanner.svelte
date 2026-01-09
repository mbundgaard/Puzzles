<script lang="ts">
	import { onMount } from 'svelte';
	import { t, translate, type Translations } from '$lib/i18n';
	import { checkForUpdates } from '$lib/api';

	let translations = $state<Translations>({});
	t.subscribe((value) => {
		translations = value;
	});

	function tr(key: string): string {
		return translate(translations, key);
	}

	let toastMessage = $state('');
	let toastVisible = $state(false);
	let checking = $state(false);

	onMount(() => {
		// Check if we just updated (set before reload)
		if (sessionStorage.getItem('versionUpdated') === 'true') {
			sessionStorage.removeItem('versionUpdated');
			showToast(tr('update.done'));
		}
	});

	function showToast(message: string) {
		toastMessage = message;
		toastVisible = true;
		setTimeout(() => {
			toastVisible = false;
		}, 3000);
	}

	export async function checkVersion(showAlreadyUpdated = true): Promise<void> {
		if (checking) return Promise.resolve();
		checking = true;

		try {
			const hasUpdate = await checkForUpdates();
			if (hasUpdate) {
				sessionStorage.setItem('versionUpdated', 'true');
				location.reload();
			} else if (showAlreadyUpdated) {
				showToast(tr('update.alreadyUpdated'));
			}
		} catch {
			// On error, just reload
			location.reload();
		} finally {
			checking = false;
		}
	}
</script>

{#if toastVisible}
	<div class="toast" class:show={toastVisible}>
		{toastMessage}
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		bottom: 100px;
		left: 50%;
		transform: translateX(-50%) translateY(20px);
		background: rgba(30, 30, 63, 0.95);
		border: 1px solid rgba(236, 72, 153, 0.3);
		border-radius: 12px;
		padding: 12px 24px;
		color: white;
		font-size: 0.9rem;
		z-index: 200;
		opacity: 0;
		transition: all 0.3s ease;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
	}

	.toast.show {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}
</style>
