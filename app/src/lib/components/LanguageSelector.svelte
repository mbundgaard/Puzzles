<script lang="ts">
	import { language, availableLanguages, type Language } from '$lib/i18n';

	let isOpen = $state(false);
	let currentLang = $state<Language>('da');

	language.subscribe((value) => {
		currentLang = value;
	});

	function selectLanguage(code: Language) {
		language.set(code);
		isOpen = false;
	}

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.language-selector')) {
			isOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="language-selector">
	<button class="language-btn" onclick={toggleDropdown} aria-label="Select language">
		<span class="flag">{availableLanguages.find(l => l.code === currentLang)?.flag}</span>
		<span class="arrow">{isOpen ? '▲' : '▼'}</span>
	</button>

	{#if isOpen}
		<div class="dropdown">
			{#each availableLanguages as lang}
				<button
					class="dropdown-item"
					class:active={currentLang === lang.code}
					onclick={() => selectLanguage(lang.code)}
				>
					<span class="flag">{lang.flag}</span>
					<span class="name">{lang.name}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.language-selector {
		position: relative;
	}

	.language-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: rgba(128, 128, 128, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		color: white;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.language-btn:active {
		transform: scale(0.95);
	}

	.flag {
		font-size: 1.2rem;
	}

	.arrow {
		font-size: 0.6rem;
		opacity: 0.7;
	}

	.dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		background: rgba(30, 30, 50, 0.95);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		overflow: hidden;
		z-index: 100;
		min-width: 140px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 12px 16px;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.9rem;
		cursor: pointer;
		transition: background 0.2s ease;
		text-align: left;
	}

	.dropdown-item:active,
	.dropdown-item.active {
		background: rgba(236, 72, 153, 0.2);
		color: white;
	}

	.dropdown-item .name {
		font-family: 'Poppins', sans-serif;
	}
</style>
