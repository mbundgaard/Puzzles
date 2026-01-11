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
			<div class="content">
				<h2>{tr('app.title')}</h2>

				<div class="sections">
					<div class="section">
						<span class="icon">🏆</span>
						<p>{tr('about.sections.points.text')}</p>
					</div>
					<div class="section">
						<span class="icon">⭐</span>
						<p>{tr('about.sections.feedback.text')}</p>
					</div>
					<div class="section">
						<span class="icon">🤖</span>
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
		padding: 24px;
		max-width: 320px;
		width: 100%;
		animation: slideUp 0.3s ease;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	@keyframes slideUp {
		from { transform: translateY(20px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	.content {
		text-align: center;
	}

	h2 {
		font-size: 1.5rem;
		font-weight: 800;
		background: linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #d946ef 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 16px 0;
	}

	.sections {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 16px;
		text-align: left;
	}

	.section {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 10px;
	}

	.icon {
		font-size: 1.1rem;
		flex-shrink: 0;
	}

	.section p {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.85);
		line-height: 1.4;
		margin: 0;
	}

	.made-by {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}
</style>
