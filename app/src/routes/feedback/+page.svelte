<script lang="ts">
	import { t, translate, type Translations } from '$lib/i18n';
	import { submitFeedback, uploadImage } from '$lib/api';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { games } from '$lib/games/registry';

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
	let selectedImage = $state<File | null>(null);
	let imagePreview = $state<string | null>(null);
	let uploading = $state(false);

	// Games sorted alphabetically by translated name
	function getSortedGames() {
		return [...games].sort((a, b) => {
			const nameA = tr(`games.${a.id}.title`);
			const nameB = tr(`games.${b.id}.title`);
			return nameA.localeCompare(nameB);
		});
	}

	function resetForm() {
		category = 'general';
		selectedGame = '';
		comment = '';
		submitted = false;
		submitting = false;
		errorMessage = '';
		selectedImage = null;
		imagePreview = null;
		uploading = false;
	}

	function handleImageSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith('image/')) {
			errorMessage = tr('feedback.imageInvalidType');
			return;
		}

		// Validate file size (5 MB)
		if (file.size > 5 * 1024 * 1024) {
			errorMessage = tr('feedback.imageTooLarge');
			return;
		}

		selectedImage = file;
		errorMessage = '';

		// Create preview
		const reader = new FileReader();
		reader.onload = (e) => {
			imagePreview = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	function removeImage() {
		selectedImage = null;
		imagePreview = null;
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
			let gameName: string | null = null;
			if (category === 'game' && selectedGame) {
				gameId = selectedGame;
				// Find the game and get its translated name
				const game = games.find(g => g.number === selectedGame);
				if (game) {
					gameName = tr(`games.${game.id}.title`);
				}
			} else if (category === 'newGame') {
				gameId = '00'; // Special code for new game suggestions
			}

			// Upload image first if selected
			let imageUrl: string | undefined;
			if (selectedImage) {
				uploading = true;
				const uploadResult = await uploadImage(selectedImage);
				uploading = false;

				if (uploadResult.error || !uploadResult.url) {
					errorMessage = tr('feedback.imageUploadError');
					submitting = false;
					return;
				}
				imageUrl = uploadResult.url;
			}

			const result = await submitFeedback(gameId, gameName, {
				text: comment.trim() || undefined,
				imageUrl
			});

			if (result.success) {
				submitted = true;
				// Auto-redirect to home after 2 seconds
				setTimeout(() => {
					goto(base || '/');
				}, 2000);
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
							{#each getSortedGames() as game}
								<option value={game.number}>{tr(`games.${game.id}.title`)}</option>
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

				<!-- Image Attachment -->
				{#if imagePreview}
					<div class="image-preview">
						<img src={imagePreview} alt="Preview" />
						<button type="button" class="remove-image" onclick={removeImage} disabled={submitting}>
							<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
								<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
							</svg>
						</button>
					</div>
				{:else}
					<label class="image-picker" class:disabled={submitting}>
						<input
							type="file"
							accept="image/png,image/jpeg,image/gif,image/webp"
							onchange={handleImageSelect}
							disabled={submitting}
						/>
						<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
							<path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
						</svg>
						<span>{tr('feedback.addImage')}</span>
					</label>
				{/if}

				{#if errorMessage}
					<p class="error">{errorMessage}</p>
				{/if}

				<button
					class="submit-btn"
					onclick={handleSubmit}
					disabled={submitting}
				>
					{#if uploading}
						{tr('feedback.uploading')}
					{:else if submitting}
						{tr('feedback.sending')}
					{:else}
						{tr('feedback.send')}
					{/if}
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
		margin: 0;
	}

	.image-picker {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 20px;
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.image-picker:active:not(.disabled) {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.25);
	}

	.image-picker.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.image-picker input {
		display: none;
	}

	.image-picker svg {
		flex-shrink: 0;
	}

	.image-preview {
		position: relative;
		border-radius: 12px;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.3);
	}

	.image-preview img {
		display: block;
		width: 100%;
		max-height: 200px;
		object-fit: contain;
	}

	.remove-image {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 32px;
		height: 32px;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.6);
		border: none;
		border-radius: 50%;
		color: white;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.remove-image:active:not(:disabled) {
		background: rgba(239, 68, 68, 0.8);
	}

	.remove-image:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

</style>
