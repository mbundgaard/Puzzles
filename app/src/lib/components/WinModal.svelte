<script lang="ts">
	import { getNickname, recordWin } from '$lib/api';
	import { t, translate, type Translations } from '$lib/i18n';

	interface Props {
		isOpen: boolean;
		points: number;
		gameNumber: string;
		onClose: () => void;
	}

	let { isOpen, points, gameNumber, onClose }: Props = $props();

	let translations = $state<Translations>({});
	t.subscribe((value) => {
		translations = value;
	});

	function tr(key: string): string {
		return translate(translations, key);
	}

	let nickname = $state('');
	let submitting = $state(false);
	let submitted = $state(false);
	let errorMessage = $state('');

	// Reset state when modal closes (handles both button close and external close)
	$effect(() => {
		if (!isOpen) {
			submitted = false;
			submitting = false;
			errorMessage = '';
		}
	});

	// Auto-submit when modal opens
	$effect(() => {
		if (isOpen && !submitting && !submitted) {
			const saved = getNickname();
			if (saved) {
				nickname = saved;
				submitWin(saved);
			}
		}
	});

	async function submitWin(name: string) {
		submitting = true;
		errorMessage = '';

		const result = await recordWin(gameNumber, name, points);

		if (result.success) {
			submitted = true;
		} else {
			errorMessage = result.error || tr('win.saveError');
		}
		submitting = false;
	}

	function handleClose() {
		// Reset state for next time
		submitted = false;
		submitting = false;
		errorMessage = '';
		onClose();
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div class="overlay" onclick={handleOverlayClick} role="dialog" aria-modal="true">
		<div class="modal">
			<h2>{tr('win.title')}</h2>
			<p class="points">+{points} {tr('leaderboard.points')}</p>

			{#if submitting}
				<div class="status">
					<div class="spinner"></div>
					<p>{tr('win.saving')}</p>
				</div>
			{:else if submitted}
				<div class="success">
					<span class="checkmark">✓</span>
					<p class="nickname">{nickname}</p>
					<p class="saved-text">{tr('win.saved')}</p>
				</div>
			{:else if errorMessage}
				<div class="error-state">
					<p class="error">{errorMessage}</p>
				</div>
			{/if}

			<button class="close-btn" onclick={handleClose}>
				{tr('leaderboard.close')}
			</button>
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
		max-width: 350px;
		width: 100%;
		text-align: center;
		animation: popIn 0.3s ease;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	@keyframes popIn {
		from { transform: scale(0.9); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}

	h2 {
		font-size: 1.8rem;
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 5px 0;
	}

	.points {
		font-size: 1.5rem;
		font-weight: 700;
		color: #fbbf24;
		margin: 0 0 20px 0;
	}

	.status {
		padding: 20px;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.2);
		border-top-color: #22c55e;
		border-radius: 50%;
		margin: 0 auto 10px;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.status p {
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
	}

	.success {
		padding: 20px;
	}

	.checkmark {
		display: inline-block;
		width: 50px;
		height: 50px;
		line-height: 50px;
		font-size: 1.5rem;
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		border-radius: 50%;
		margin-bottom: 10px;
		animation: scaleIn 0.3s ease;
	}

	@keyframes scaleIn {
		from { transform: scale(0); }
		to { transform: scale(1); }
	}

	.nickname {
		font-size: 1.2rem;
		font-weight: 600;
		color: white;
		margin: 0 0 5px 0;
	}

	.saved-text {
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
	}

	.error-state {
		padding: 20px;
	}

	.error {
		color: #ef4444;
		margin: 0;
	}

	.close-btn {
		margin-top: 15px;
		padding: 12px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		color: white;
		border: none;
		border-radius: 25px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.close-btn:active {
		transform: scale(0.95);
	}
</style>
