<script lang="ts">
	import { t, translate, type Translations } from '$lib/i18n';
	import { submitFeedback } from '$lib/api';
	import { games } from '$lib/games/registry';

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

	type FeedbackCategory = 'general' | 'game' | 'newGame';

	let category = $state<FeedbackCategory>('general');
	let selectedGame = $state('');
	let comment = $state('');
	let submitting = $state(false);
	let submitted = $state(false);
	let errorMessage = $state('');

	// Games sorted alphabetically by translated name
	function getSortedGames() {
		return [...games].sort((a, b) => {
			const nameA = tr(`games.${a.id}.title`);
			const nameB = tr(`games.${b.id}.title`);
			return nameA.localeCompare(nameB);
		});
	}

	$effect(() => {
		if (isOpen) {
			// Reset form when opening
			category = 'general';
			selectedGame = '';
			comment = '';
			submitted = false;
			submitting = false;
			errorMessage = '';
		}
	});

	async function handleSubmit() {
		if (category === 'newGame' && !comment.trim()) {
			errorMessage = tr('feedback.descriptionRequired');
			return;
		}

		submitting = true;
		errorMessage = '';

		try {
			let gameId: string | null = null;
			if (category === 'game' && selectedGame) {
				gameId = selectedGame;
			} else if (category === 'newGame') {
				gameId = '00'; // Special code for new game suggestions
			}

			const result = await submitFeedback(gameId, {
				text: comment.trim() || undefined
			});

			if (result.success) {
				submitted = true;
				setTimeout(() => {
					onClose();
				}, 1500);
			} else {
				errorMessage = result.error || tr('feedback.error');
				submitting = false;
			}
		} catch {
			errorMessage = tr('feedback.error');
			submitting = false;
		}
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
			<button class="close-btn" onclick={onClose} aria-label={tr('leaderboard.close')}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18"/>
					<line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>

			<h2>{tr('feedback.title')}</h2>

			{#if submitted}
				<div class="success">
					<span class="checkmark">✓</span>
					<p>{tr('feedback.sent')}</p>
				</div>
			{:else}
				<div class="form">
					<!-- Category Selection -->
					<div class="field">
						<label>{tr('feedback.category')}</label>
						<div class="category-buttons">
							<button
								class="category-btn"
								class:active={category === 'general'}
								onclick={() => category = 'general'}
							>
								{tr('feedback.categories.general')}
							</button>
							<button
								class="category-btn"
								class:active={category === 'game'}
								onclick={() => category = 'game'}
							>
								{tr('feedback.categories.game')}
							</button>
							<button
								class="category-btn"
								class:active={category === 'newGame'}
								onclick={() => category = 'newGame'}
							>
								{tr('feedback.categories.newGame')}
							</button>
						</div>
					</div>

					<!-- Game Selection (only for game feedback) -->
					{#if category === 'game'}
						<div class="field">
							<label>{tr('feedback.selectGame')}</label>
							<select bind:value={selectedGame}>
								<option value="">--</option>
								{#each getSortedGames() as game}
									<option value={game.number}>{tr(`games.${game.id}.title`)}</option>
								{/each}
							</select>
						</div>
					{/if}

					<!-- Comment -->
					<div class="field">
						<label>{tr('feedback.comment')}</label>
						<textarea
							bind:value={comment}
							placeholder={category === 'newGame' ? tr('feedback.suggestionPlaceholder') : tr('feedback.commentPlaceholder')}
							rows="4"
							disabled={submitting}
						></textarea>
					</div>

					{#if errorMessage}
						<p class="error">{errorMessage}</p>
					{/if}

					<button
						class="submit-btn"
						onclick={handleSubmit}
						disabled={submitting}
					>
						{submitting ? tr('feedback.sending') : tr('feedback.send')}
					</button>
				</div>
			{/if}
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
		padding: 25px;
		max-width: 400px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
		animation: slideUp 0.3s ease;
		border: 1px solid rgba(255, 255, 255, 0.1);
		position: relative;
	}

	.modal::-webkit-scrollbar {
		display: none;
	}

	@keyframes slideUp {
		from { transform: translateY(20px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
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

	h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: white;
		margin: 0 0 20px 0;
		text-align: center;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.field label {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
		font-weight: 500;
	}

	.category-buttons {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.category-btn {
		flex: 1;
		min-width: 100px;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.85rem;
		font-family: 'Poppins', sans-serif;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.category-btn:active {
		transform: scale(0.98);
	}

	.category-btn.active {
		background: rgba(236, 72, 153, 0.2);
		border-color: rgba(236, 72, 153, 0.4);
		color: white;
	}

	select {
		padding: 12px 15px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 10px;
		color: white;
		font-size: 1rem;
		font-family: 'Poppins', sans-serif;
	}

	select option {
		background: #1e1e3f;
		color: white;
	}

	textarea {
		padding: 12px 15px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 10px;
		color: white;
		font-size: 1rem;
		font-family: 'Poppins', sans-serif;
		resize: vertical;
		min-height: 100px;
	}

	textarea::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	textarea:focus {
		outline: none;
		border-color: #ec4899;
	}

	.error {
		color: #ef4444;
		font-size: 0.85rem;
		margin: 0;
		text-align: center;
	}

	.submit-btn {
		padding: 14px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #ec4899 0%, #d946ef 100%);
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

	.success {
		padding: 30px;
		text-align: center;
	}

	.checkmark {
		display: inline-block;
		width: 60px;
		height: 60px;
		line-height: 60px;
		font-size: 1.8rem;
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		border-radius: 50%;
		margin-bottom: 15px;
		animation: scaleIn 0.3s ease;
	}

	@keyframes scaleIn {
		from { transform: scale(0); }
		to { transform: scale(1); }
	}

	.success p {
		color: rgba(255, 255, 255, 0.8);
		font-size: 1.1rem;
		margin: 0;
	}
</style>
