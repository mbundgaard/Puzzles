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

	let currentCountryCode = $derived(availableLanguages.find(l => l.code === currentLang)?.countryCode ?? 'dk');

	function getFlagUrl(countryCode: string): string {
		return `https://flagcdn.com/w40/${countryCode}.png`;
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="language-selector">
	<button class="language-btn" onclick={toggleDropdown} aria-label="Select language">
		<img class="flag" src={getFlagUrl(currentCountryCode)} alt="" />
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
					<img class="flag" src={getFlagUrl(lang.countryCode)} alt="" />
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
		gap: 8px;
		padding: 8px 12px;
		background: rgba(0, 0, 0, 0.3);
		border: none;
		border-radius: 12px;
		color: white;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.language-btn:active {
		transform: scale(0.95);
		background: rgba(0, 0, 0, 0.4);
	}

	.flag {
		width: 24px;
		height: 18px;
		object-fit: cover;
		border-radius: 3px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}

	.arrow {
		font-size: 0.5rem;
		opacity: 0.6;
	}

	.dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		background: rgba(20, 20, 35, 0.95);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		overflow: hidden;
		z-index: 100;
		min-width: 150px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		animation: dropIn 0.15s ease-out;
	}

	@keyframes dropIn {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 14px 16px;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.95rem;
		font-family: 'Poppins', sans-serif;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
		-webkit-tap-highlight-color: transparent;
	}

	.dropdown-item:not(:last-child) {
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.dropdown-item:active {
		background: rgba(255, 255, 255, 0.1);
	}

	.dropdown-item.active {
		background: rgba(236, 72, 153, 0.15);
		color: white;
	}

	.dropdown-item .flag {
		width: 28px;
		height: 21px;
	}

	.dropdown-item .name {
		flex: 1;
	}
</style>
