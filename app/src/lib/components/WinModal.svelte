<script lang="ts">
	import { getNickname, setNickname, isValidNickname, recordWin } from '$lib/api';
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

	// Load saved nickname when modal opens
	$effect(() => {
		if (isOpen) {
			const saved = getNickname();
			if (saved) {
				nickname = saved;
			}
			submitted = false;
			submitting = false;
			errorMessage = '';
		}
	});

	async function handleSubmit() {
		const trimmedNickname = nickname.trim();

		if (!isValidNickname(trimmedNickname)) {
			errorMessage = tr('win.nameError');
			return;
		}

		submitting = true;
		errorMessage = '';

		setNickname(trimmedNickname);
		const result = await recordWin(gameNumber, trimmedNickname, points);

		if (result.success) {
			submitted = true;
			setTimeout(() => {
				onClose();
			}, 1500);
		} else {
			errorMessage = result.error || tr('win.saveError');
			submitting = false;
		}
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !submitting && !submitted) {
			handleSubmit();
		}
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div class="overlay" onclick={handleOverlayClick} role="dialog" aria-modal="true">
		<div class="modal">
			<h2>{tr('win.title')}</h2>
			<p class="points">+{points} {tr('leaderboard.points')}</p>
			<p class="message">{tr('win.message')}</p>

			{#if submitted}
				<div class="success">
					<span class="checkmark">✓</span>
					<p>{tr('win.saved')}</p>
				</div>
			{:else}
				<div class="nickname-section">
					<label for="nickname-input">{tr('win.nameLabel')}</label>
					<input
						id="nickname-input"
						type="text"
						bind:value={nickname}
						placeholder={tr('win.namePlaceholder')}
						maxlength="20"
						disabled={submitting}
						onkeydown={handleKeydown}
					/>
					{#if errorMessage}
						<p class="error">{errorMessage}</p>
					{/if}
					<button
						class="submit-btn"
						onclick={handleSubmit}
						disabled={submitting}
					>
						{submitting ? tr('win.saving') : tr('win.save')}
					</button>
				</div>
			{/if}

			<button class="skip-btn" onclick={onClose}>
				{submitted ? tr('leaderboard.close') : tr('win.skip')}
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
		margin: 0 0 5px 0;
	}

	.message {
		color: rgba(255, 255, 255, 0.7);
		margin: 0 0 20px 0;
	}

	.nickname-section {
		margin-bottom: 15px;
	}

	.nickname-section label {
		display: block;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 8px;
	}

	.nickname-section input {
		width: 100%;
		padding: 12px 15px;
		font-size: 1rem;
		font-family: 'Poppins', sans-serif;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 10px;
		color: white;
		margin-bottom: 10px;
	}

	.nickname-section input:focus {
		outline: none;
		border-color: #22c55e;
	}

	.nickname-section input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.nickname-section input:disabled {
		opacity: 0.6;
	}

	.error {
		color: #ef4444;
		font-size: 0.85rem;
		margin: -5px 0 10px 0;
	}

	.submit-btn {
		width: 100%;
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

	.submit-btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.skip-btn {
		margin-top: 10px;
		padding: 8px 20px;
		font-size: 0.9rem;
		font-family: 'Poppins', sans-serif;
		background: transparent;
		color: rgba(255, 255, 255, 0.5);
		border: none;
		cursor: pointer;
		transition: color 0.2s ease;
	}

	.skip-btn:active {
		color: rgba(255, 255, 255, 0.8);
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

	.success p {
		color: rgba(255, 255, 255, 0.8);
		margin: 0;
	}
</style>
