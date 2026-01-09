<script lang="ts">
	import { language, availableLanguages, type Language } from '$lib/i18n';

	let currentLang = $state<Language>('da');

	language.subscribe((value) => {
		currentLang = value;
	});

	function selectLanguage(code: Language) {
		language.set(code);
	}

	function getSelectedIndex(): number {
		return availableLanguages.findIndex(l => l.code === currentLang);
	}
</script>

<div class="language-selector" role="radiogroup" aria-label="Select language">
	<!-- Sliding indicator -->
	<div
		class="indicator"
		style="transform: translateX({getSelectedIndex() * 100}%)"
	></div>

	{#each availableLanguages as lang}
		<button
			class="lang-btn"
			class:active={currentLang === lang.code}
			onclick={() => selectLanguage(lang.code)}
			role="radio"
			aria-checked={currentLang === lang.code}
			aria-label={lang.name}
		>
			<span class="flag">{lang.flag}</span>
		</button>
	{/each}
</div>

<style>
	.language-selector {
		display: flex;
		align-items: center;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 12px;
		padding: 4px;
		position: relative;
		gap: 0;
	}

	.indicator {
		position: absolute;
		left: 4px;
		top: 4px;
		bottom: 4px;
		width: calc((100% - 8px) / 3);
		background: rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		pointer-events: none;
	}

	.lang-btn {
		position: relative;
		z-index: 1;
		width: 44px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: transform 0.15s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.lang-btn:active {
		transform: scale(0.92);
	}

	.flag {
		font-size: 1.3rem;
		opacity: 0.5;
		transition: opacity 0.2s ease, transform 0.2s ease;
	}

	.lang-btn.active .flag {
		opacity: 1;
		transform: scale(1.1);
	}
</style>
