<script lang="ts">
	import { onMount } from 'svelte';
	import { t, translate, type Translations } from '$lib/i18n';
	import { getNickname, setNickname, isValidNickname, getAgeGroup, setAgeGroup, type AgeGroup } from '$lib/api';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		required?: boolean;
		onCancel?: () => void;
	}

	let { isOpen, onClose, required = false, onCancel }: Props = $props();

	let translations = $state<Translations>({});
	t.subscribe((value) => {
		translations = value;
	});

	function tr(key: string): string {
		return translate(translations, key);
	}

	let name = $state('');
	let ageGroup = $state<AgeGroup>('adult');
	let saved = $state(false);
	let error = $state(false);

	onMount(() => {
		name = getNickname() || '';
		ageGroup = getAgeGroup() || 'adult';
	});

	// Reset state when modal opens
	$effect(() => {
		if (isOpen) {
			name = getNickname() || '';
			ageGroup = getAgeGroup() || 'adult';
			saved = false;
			error = false;
		}
	});

	function handleSave() {
		if (isValidNickname(name)) {
			setNickname(name.trim());
			setAgeGroup(ageGroup);
			saved = true;
			error = false;
			setTimeout(() => {
				onClose();
			}, 800);
		} else {
			error = true;
			saved = false;
		}
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !required) {
			onClose();
		}
	}

	function handleCancel() {
		if (onCancel) {
			onCancel();
		} else {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSave();
		}
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div class="overlay" onclick={handleOverlayClick} role="dialog" aria-modal="true">
		<div class="modal">
			<h2 class="title">{tr('settings.name')}</h2>

			<input
				type="text"
				bind:value={name}
				placeholder={tr('settings.namePlaceholder')}
				class="name-input"
				class:error
				maxlength="20"
				onkeydown={handleKeydown}
			/>

			{#if error}
				<p class="error-text">{tr('win.nameError')}</p>
			{/if}

			<div class="age-toggle">
				<button
					class="age-btn"
					class:active={ageGroup === 'kid'}
					onclick={() => ageGroup = 'kid'}
				>
					<span class="age-icon">👶</span>
					<span class="age-label">{tr('settings.ageKid')}</span>
				</button>
				<button
					class="age-btn"
					class:active={ageGroup === 'adult'}
					onclick={() => ageGroup = 'adult'}
				>
					<span class="age-icon">🧑</span>
					<span class="age-label">{tr('settings.ageAdult')}</span>
				</button>
			</div>

			<button class="save-btn" class:saved onclick={handleSave} disabled={saved}>
				{saved ? tr('settings.nameSaved') : tr('settings.nameSave')}
			</button>

			{#if required}
				<button class="cancel-btn" onclick={handleCancel}>
					{tr('common.cancel')}
				</button>
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
	}

	.modal {
		background: linear-gradient(135deg, #1e1e3f 0%, #2d1f4e 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		padding: 28px;
		width: 100%;
		max-width: 340px;
		text-align: center;
	}

	.title {
		font-size: 1.5rem;
		font-weight: 700;
		background: linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #d946ef 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 20px 0;
	}

	.name-input {
		width: 100%;
		padding: 14px 16px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		color: white;
		font-size: 1rem;
		font-family: 'Poppins', sans-serif;
		text-align: center;
		box-sizing: border-box;
	}

	.name-input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.name-input:focus {
		outline: none;
		border-color: #ec4899;
	}

	.name-input.error {
		border-color: #ef4444;
	}

	.error-text {
		color: #ef4444;
		font-size: 0.85rem;
		margin: 8px 0 0 0;
	}

	.age-toggle {
		display: flex;
		gap: 10px;
		margin-top: 16px;
	}

	.age-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 12px 8px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.age-btn:active {
		transform: scale(0.98);
	}

	.age-btn.active {
		background: rgba(236, 72, 153, 0.2);
		border-color: rgba(236, 72, 153, 0.5);
	}

	.age-icon {
		font-size: 1.5rem;
	}

	.age-label {
		font-size: 0.85rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
	}

	.save-btn {
		margin-top: 20px;
		padding: 14px 32px;
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

	.save-btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.save-btn.saved {
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
	}

	.save-btn:disabled {
		cursor: default;
	}

	.cancel-btn {
		margin-top: 12px;
		padding: 10px 24px;
		font-size: 0.9rem;
		font-family: 'Poppins', sans-serif;
		background: transparent;
		color: rgba(255, 255, 255, 0.5);
		border: none;
		cursor: pointer;
		transition: color 0.2s ease;
	}

	.cancel-btn:active {
		color: rgba(255, 255, 255, 0.8);
	}
</style>
