<script lang="ts">
	import { t, translate, type Translations } from '$lib/i18n';

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

	const appVersion = '2.0.0';

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

			<div class="content">
				<div class="logo">ℹ️</div>
				<h2>{tr('app.title')}</h2>
				<p class="version">{tr('about.version')} {appVersion}</p>

				<p class="description">{tr('about.description')}</p>

				<div class="sections">
					<div class="section">
						<h3>🏆 {tr('about.sections.points.title')}</h3>
						<p>{tr('about.sections.points.text')}</p>
					</div>
					<div class="section">
						<h3>⭐ {tr('about.sections.feedback.title')}</h3>
						<p>{tr('about.sections.feedback.text')}</p>
					</div>
					<div class="section">
						<h3>🤖 {tr('about.sections.ai.title')}</h3>
						<p>{tr('about.sections.ai.text')}</p>
					</div>
				</div>

				<div class="made-by">
					{tr('about.madeBy')}
				</div>
			</div>
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
		padding: 30px;
		max-width: 350px;
		width: 100%;
		animation: slideUp 0.3s ease;
		border: 1px solid rgba(255, 255, 255, 0.1);
		position: relative;
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

	.content {
		text-align: center;
	}

	.logo {
		font-size: 4rem;
		margin-bottom: 10px;
	}

	h2 {
		font-size: 1.8rem;
		font-weight: 800;
		background: linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #d946ef 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 5px 0;
	}

	.version {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0 0 20px 0;
	}

	.description {
		font-size: 0.95rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.5;
		margin: 0 0 20px 0;
	}

	.sections {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 24px;
		text-align: left;
	}

	.section {
		padding: 12px 14px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 10px;
	}

	.section h3 {
		font-size: 0.9rem;
		font-weight: 600;
		color: white;
		margin: 0 0 6px 0;
	}

	.section p {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.4;
		margin: 0;
	}

	.made-by {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.6);
	}
</style>
