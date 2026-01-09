<script lang="ts">
	import { t, translate, type Translations } from '$lib/i18n';
	import { submitFeedback } from '$lib/api';
	import PageHeader from '$lib/components/PageHeader.svelte';

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

	// Available games for feedback
	const games = [
		{ id: '11', name: 'Kryds og Bolle' }
	];

	function resetForm() {
		category = 'general';
		selectedGame = '';
		comment = '';
		submitted = false;
		submitting = false;
		errorMessage = '';
	}

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
				rating: 5, // Default rating
				text: comment.trim() || undefined
			});

			if (result.success) {
				submitted = true;
			} else {
				errorMessage = result.error || tr('feedback.error');
				submitting = false;
			}
		} catch {
			errorMessage = tr('feedback.error');
			submitting = false;
		}
	}

</script>

<svelte:head>
	<title>{tr('feedback.title')} - {tr('app.title')}</title>
</svelte:head>

<PageHeader title={tr('feedback.title')} subtitle={tr('feedback.subtitle')} />

<div class="feedback-page">
	<main>
		{#if submitted}
			<div class="success-card">
				<span class="checkmark">✓</span>
				<p>{tr('feedback.sent')}</p>
				<button class="new-feedback-btn" onclick={resetForm}>
					{tr('feedback.sendAnother')}
				</button>
			</div>
		{:else}
			<div class="form-card">
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
							class:active={category === 'newGame'}
							onclick={() => category = 'newGame'}
						>
							{tr('feedback.categories.newGame')}
						</button>
						<button
							class="category-btn"
							class:active={category === 'game'}
							onclick={() => category = 'game'}
						>
							{tr('feedback.categories.game')}
						</button>
					</div>
				</div>

				<!-- Game Selection (only for game feedback) -->
				{#if category === 'game'}
					<div class="field">
						<label for="game-select">{tr('feedback.selectGame')}</label>
						<select id="game-select" bind:value={selectedGame}>
							<option value="">--</option>
							{#each games as game}
								<option value={game.id}>{game.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				<!-- Comment -->
				<div class="field">
					<label for="comment">{tr('feedback.comment')}</label>
					<textarea
						id="comment"
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
	</main>
</div>

<style>
	.feedback-page {
		padding-bottom: 20px;
	}

	main {
		padding: 0 20px;
		max-width: 500px;
		margin: 0 auto;
	}

	.form-card {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.success-card {
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 24px;
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
		padding: 12px 14px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.9rem;
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
		padding: 14px 16px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		color: white;
		font-size: 1rem;
		font-family: 'Poppins', sans-serif;
	}

	select option {
		background: #1e1e3f;
		color: white;
	}

	textarea {
		padding: 14px 16px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		color: white;
		font-size: 1rem;
		font-family: 'Poppins', sans-serif;
		resize: vertical;
		min-height: 120px;
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
		font-size: 0.9rem;
		margin: 0;
		text-align: center;
	}

	.submit-btn {
		padding: 16px 30px;
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

	.success-card {
		padding: 40px 24px;
		text-align: center;
	}

	.checkmark {
		display: inline-block;
		width: 70px;
		height: 70px;
		line-height: 70px;
		font-size: 2rem;
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		border-radius: 50%;
		margin-bottom: 20px;
	}

	.success-card p {
		color: rgba(255, 255, 255, 0.8);
		font-size: 1.1rem;
		margin: 0 0 24px 0;
	}

	.new-feedback-btn {
		padding: 12px 24px;
		font-size: 0.95rem;
		font-weight: 500;
		font-family: 'Poppins', sans-serif;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 20px;
		color: white;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.new-feedback-btn:active {
		transform: scale(0.95);
		background: rgba(255, 255, 255, 0.15);
	}
</style>
