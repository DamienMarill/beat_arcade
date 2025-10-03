import { DefaultRenderingPipeline } from '@babylonjs/core';

/**
 * Gère le post-processing pour le style néon futuriste
 * Optimisé pour maintenir 60 FPS
 */
export class PostProcessingManager {
	constructor(scene, camera) {
		this.scene = scene;
		this.camera = camera;
		this.pipeline = null;
		this.baseBloomWeight = 0.6; // RÉDUIT de 1.2 à 0.6 pour éviter overload
		this.isEnabled = true;

		this.createPipeline();
	}

	/**
	 * Crée le pipeline de post-processing optimisé
	 */
	createPipeline() {
		// Pipeline HDR pour effets néon
		this.pipeline = new DefaultRenderingPipeline(
			'neonPipeline',
			true, // HDR activé pour bloom intense
			this.scene,
			[this.camera]
		);

		if (!this.pipeline.isSupported) {
			console.warn('⚠️ DefaultRenderingPipeline non supporté sur ce device');
			this.isEnabled = false;
			return;
		}

		// MSAA léger (antialiasing)
		this.pipeline.samples = 2; // 2 au lieu de 4 pour perfs

		// === BLOOM (effet néon principal) ===
		// DÉSACTIVÉ pour performances critiques (18 FPS → besoin 60 FPS)
		this.pipeline.bloomEnabled = false;

		// === CHROMATIC ABERRATION (effet vitesse) ===
		// DÉSACTIVÉ pour performances
		this.pipeline.chromaticAberrationEnabled = false;

		// === IMAGE PROCESSING (couleurs cyberpunk) ===
		this.pipeline.imageProcessingEnabled = true;
		this.pipeline.imageProcessing.contrast = 1.1; // Contraste très léger
		this.pipeline.imageProcessing.exposure = 1.0; // Exposition normale
		this.pipeline.imageProcessing.toneMappingEnabled = false; // Désactivé pour perf

		// === FXAA (antialiasing rapide) ===
		this.pipeline.fxaaEnabled = true; // Garde FXAA (très léger)

		// === SHARPEN (netteté) ===
		// DÉSACTIVÉ pour performances
		this.pipeline.sharpenEnabled = false;

		console.log('✅ Post-processing pipeline créé (MODE PERFORMANCE - bloom/glow désactivés)');
	}

	/**
	 * Modulation du bloom selon le rythme (appelé sur les beats)
	 * @param {number} intensity - Multiplicateur d'intensité (0-1)
	 */
	pulsateBloom(intensity) {
		if (!this.isEnabled || !this.pipeline) return;

		// Calcul intensité avec limite max
		const targetWeight = this.baseBloomWeight + Math.min(intensity * 0.8, 1.2);
		this.pipeline.bloomWeight = targetWeight;
	}

	/**
	 * Reset le bloom à sa valeur de base
	 */
	resetBloom() {
		if (!this.isEnabled || !this.pipeline) return;
		this.pipeline.bloomWeight = this.baseBloomWeight;
	}

	/**
	 * Ajuste l'intensité globale du bloom (pour calibration)
	 * @param {number} intensity - Valeur entre 0 et 2
	 */
	setBloomIntensity(intensity) {
		this.baseBloomWeight = Math.max(0, Math.min(2, intensity));
		if (this.pipeline) {
			this.pipeline.bloomWeight = this.baseBloomWeight;
		}
	}

	/**
	 * Active/désactive le post-processing (pour debug/perf)
	 */
	setEnabled(enabled) {
		this.isEnabled = enabled;
		if (this.pipeline) {
			this.pipeline.bloomEnabled = enabled;
			this.pipeline.chromaticAberrationEnabled = enabled;
			this.pipeline.sharpenEnabled = enabled;
		}
	}

	/**
	 * Ajuste le niveau de chromatic aberration (effet vitesse)
	 * @param {number} amount - Valeur entre 0 et 30
	 */
	setChromaticAberration(amount) {
		if (this.pipeline) {
			this.pipeline.chromaticAberration.aberrationAmount = Math.max(0, Math.min(30, amount));
		}
	}

	/**
	 * Obtient le pipeline pour configurations avancées
	 */
	getPipeline() {
		return this.pipeline;
	}

	/**
	 * Nettoie les ressources
	 */
	dispose() {
		if (this.pipeline) {
			this.pipeline.dispose();
		}
	}
}
