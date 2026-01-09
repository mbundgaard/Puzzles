<script lang="ts">
	import { t, translate, language, availableLanguages, type Translations, type Language } from '$lib/i18n';
	import ChangelogModal from '$lib/components/ChangelogModal.svelte';
	import AboutModal from '$lib/components/AboutModal.svelte';
	import ShareQRModal from '$lib/components/ShareQRModal.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let translations = $state<Translations>({});
	let currentLang = $state<Language>('da');

	t.subscribe((value) => {
		translations = value;
	});

	language.subscribe((value) => {
		currentLang = value;
	});

	function tr(key: string): string {
		return translate(translations, key);
	}

	function selectLanguage(code: Language) {
		language.set(code);
	}

	function getFlagUrl(countryCode: string): string {
		return `https://flagcdn.com/w40/${countryCode}.png`;
	}

	// Modal states
	let showChangelog = $state(false);
	let showAbout = $state(false);
	let showShareQR = $state(false);

	// Share via SMS
	const appUrl = 'https://mbundgaard.github.io/Puzzles/';

	function shareViaSMS() {
		const message = `Prøv Hjernespil - sjove hjernespil: ${appUrl}`;
		window.location.href = `sms:?body=${encodeURIComponent(message)}`;
	}

	// GitHub link
	const githubUrl = 'https://github.com/mbundgaard/Puzzles';
</script>

<svelte:head>
	<title>{tr('settings.title')} - {tr('app.title')}</title>
</svelte:head>

<PageHeader title={tr('settings.title')} subtitle={tr('settings.subtitle')} />

<div class="settings-page">
	<main>
		<!-- Language Section -->
		<section class="settings-section">
			<h2 class="section-title">{tr('settings.language')}</h2>
			<div class="language-grid">
				{#each availableLanguages as lang}
					<button
						class="language-option"
						class:active={currentLang === lang.code}
						onclick={() => selectLanguage(lang.code)}
					>
						<img class="flag" src={getFlagUrl(lang.countryCode)} alt="" />
						<span class="name">{lang.name}</span>
						{#if currentLang === lang.code}
							<span class="check">✓</span>
						{/if}
					</button>
				{/each}
			</div>
		</section>

		<!-- Share Section -->
		<section class="settings-section">
			<h2 class="section-title">{tr('share.title')}</h2>
			<div class="button-row">
				<button class="action-btn" onclick={() => showShareQR = true}>
					<span class="btn-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="3" width="7" height="7"/>
							<rect x="14" y="3" width="7" height="7"/>
							<rect x="3" y="14" width="7" height="7"/>
							<rect x="14" y="14" width="3" height="3"/>
							<rect x="18" y="14" width="3" height="3"/>
							<rect x="14" y="18" width="3" height="3"/>
							<rect x="18" y="18" width="3" height="3"/>
						</svg>
					</span>
					<span class="btn-label">{tr('share.qr')}</span>
				</button>
				<button class="action-btn" onclick={shareViaSMS}>
					<span class="btn-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
						</svg>
					</span>
					<span class="btn-label">{tr('share.sms')}</span>
				</button>
			</div>
		</section>

		<!-- Menu Items -->
		<section class="settings-section">
			<h2 class="section-title">{tr('settings.info')}</h2>
			<div class="menu-list">
				<button class="menu-item" onclick={() => showChangelog = true}>
					<span class="menu-icon">📋</span>
					<span class="menu-label">{tr('settings.changelog')}</span>
					<span class="menu-arrow">›</span>
				</button>
				<button class="menu-item" onclick={() => showAbout = true}>
					<span class="menu-icon">ℹ️</span>
					<span class="menu-label">{tr('settings.about')}</span>
					<span class="menu-arrow">›</span>
				</button>
				<a href={githubUrl} target="_blank" rel="noopener noreferrer" class="menu-item">
					<span class="menu-icon">
						<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
							<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
						</svg>
					</span>
					<span class="menu-label">{tr('settings.sourceCode')}</span>
					<span class="menu-arrow">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
							<polyline points="15 3 21 3 21 9"/>
							<line x1="10" y1="14" x2="21" y2="3"/>
						</svg>
					</span>
				</a>
			</div>
		</section>
	</main>
</div>

<!-- Modals -->
<ChangelogModal isOpen={showChangelog} onClose={() => showChangelog = false} />
<AboutModal isOpen={showAbout} onClose={() => showAbout = false} />
<ShareQRModal isOpen={showShareQR} onClose={() => showShareQR = false} />

<style>
	.settings-page {
		padding-top: 90px;
		padding-bottom: 20px;
	}

	main {
		padding: 0 20px;
		max-width: 500px;
		margin: 0 auto;
	}

	.settings-section {
		margin-bottom: 24px;
	}

	.section-title {
		font-size: 0.85rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin: 0 0 12px 4px;
	}

	.language-grid {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.language-option {
		display: flex;
		align-items: center;
		gap: 14px;
		width: 100%;
		padding: 14px 16px;
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 14px;
		color: rgba(255, 255, 255, 0.8);
		font-size: 1rem;
		font-family: 'Poppins', sans-serif;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		-webkit-tap-highlight-color: transparent;
	}

	.language-option:active {
		transform: scale(0.98);
	}

	.language-option.active {
		background: rgba(236, 72, 153, 0.15);
		border-color: rgba(236, 72, 153, 0.3);
		color: white;
	}

	.language-option .flag {
		width: 32px;
		height: 24px;
		object-fit: cover;
		border-radius: 4px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.language-option .name {
		flex: 1;
		font-weight: 500;
	}

	.language-option .check {
		color: #ec4899;
		font-weight: 600;
	}

	.button-row {
		display: flex;
		gap: 12px;
	}

	.action-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 20px 16px;
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 14px;
		color: rgba(255, 255, 255, 0.8);
		font-family: 'Poppins', sans-serif;
		cursor: pointer;
		transition: all 0.2s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.action-btn:active {
		transform: scale(0.98);
		background: rgba(255, 255, 255, 0.12);
	}

	.btn-icon {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-icon svg {
		width: 100%;
		height: 100%;
	}

	.btn-label {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.menu-list {
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 14px;
		overflow: hidden;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 14px;
		width: 100%;
		padding: 16px;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.8);
		font-size: 1rem;
		font-family: 'Poppins', sans-serif;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
	}

	.menu-item:not(:last-child) {
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.menu-item:active {
		background: rgba(255, 255, 255, 0.05);
	}

	.menu-icon {
		font-size: 1.2rem;
		width: 28px;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.menu-icon svg {
		width: 20px;
		height: 20px;
	}

	.menu-label {
		flex: 1;
		font-weight: 500;
	}

	.menu-arrow {
		font-size: 1.3rem;
		color: rgba(255, 255, 255, 0.3);
		display: flex;
		align-items: center;
	}
</style>
