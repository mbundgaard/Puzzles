<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { t, translate, type Translations } from '$lib/i18n';

	let translations = $state<Translations>({});
	t.subscribe((value) => {
		translations = value;
	});

	function tr(key: string): string {
		return translate(translations, key);
	}

	const POPUP_KEY = 'feedbackPopupLastShown';
	const POPUP_INTERVAL_DAYS = 7;

	let showPopup = $state(false);

	function shouldShowFeedbackPopup(): boolean {
		const lastShown = localStorage.getItem(POPUP_KEY);
		if (!lastShown) return true;

		const daysSince = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
		return daysSince >= POPUP_INTERVAL_DAYS;
	}

	function markPopupShown() {
		localStorage.setItem(POPUP_KEY, Date.now().toString());
	}

	onMount(() => {
		if (shouldShowFeedbackPopup()) {
			// Show after short delay
			setTimeout(() => {
				showPopup = true;
				markPopupShown();
			}, 500);
		}
	});

	function close() {
		showPopup = false;
	}

	function openFeedback() {
		showPopup = false;
		goto(`${base}/feedback`);
	}
</script>

{#if showPopup}
	<div class="overlay" onclick={close}>
		<div class="popup" onclick={(e) => e.stopPropagation()}>
			<button class="close-btn" onclick={close}>×</button>
			<h2 class="title">{tr('feedbackPopup.title')}</h2>
			<p class="body">{tr('feedbackPopup.body')}</p>
			<div class="buttons">
				<button class="btn btn-primary" onclick={openFeedback}>{tr('feedbackPopup.yes')}</button>
				<button class="btn btn-secondary" onclick={close}>{tr('feedbackPopup.later')}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 300;
		padding: 20px;
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.popup {
		background: rgba(30, 30, 63, 0.95);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		padding: 32px 28px;
		max-width: 340px;
		width: 100%;
		text-align: center;
		position: relative;
		animation: slideUp 0.3s ease-out;
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

	.close-btn {
		position: absolute;
		top: 12px;
		right: 16px;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.5);
		font-size: 1.8rem;
		cursor: pointer;
		line-height: 1;
		padding: 4px;
		transition: color 0.2s;
	}

	.close-btn:hover {
		color: rgba(255, 255, 255, 0.8);
	}

	.title {
		font-size: 1.3rem;
		font-weight: 700;
		color: white;
		margin: 0 0 12px 0;
	}

	.body {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.95rem;
		line-height: 1.5;
		margin: 0 0 24px 0;
	}

	.buttons {
		display: flex;
		gap: 12px;
	}

	.btn {
		flex: 1;
		padding: 16px 16px;
		border-radius: 12px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
	}

	.btn-primary {
		background: linear-gradient(135deg, #ec4899, #d946ef);
		color: white;
	}

	.btn-primary:active {
		transform: scale(0.98);
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.15);
	}

	.btn-secondary:active {
		background: rgba(255, 255, 255, 0.15);
	}
</style>
