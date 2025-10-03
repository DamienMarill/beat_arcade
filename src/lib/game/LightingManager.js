import { HemisphericLight, PointLight, Vector3, Color3, GlowLayer } from '@babylonjs/core';

/**
 * Gère l'éclairage de la scène et les effets de glow
 */
export class LightingManager {
	constructor(scene) {
		this.scene = scene;
		this.glowLayer = null;
		this.accentLights = []; // Lumières colorées dynamiques
		this.createLights();
		this.createAccentLights();
		// GlowLayer désactivé pour performances (trop gourmand)
		// this.createGlowLayer();
	}

	/**
	 * Crée les lumières de la scène
	 */
	createLights() {
		const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
		light.intensity = 0.5; // Réduit pour ambiance sombre néon
		light.diffuse = new Color3(0.6, 0.7, 0.9); // Bleuté pour ambiance froide

		this.mainLight = light;
	}

	/**
	 * Crée des lumières d'accentuation colorées (cyan/magenta)
	 * Positionnées autour de la scène pour créer ambiance néon
	 */
	createAccentLights() {
		// Lumière cyan gauche
		const cyanLight = new PointLight('accentCyan', new Vector3(-5, 3, 0), this.scene);
		cyanLight.diffuse = new Color3(0, 0.8, 1.0); // Cyan vif
		cyanLight.specular = new Color3(0.3, 0.9, 1.0);
		cyanLight.intensity = 0; // Commence éteinte
		cyanLight.range = 15;
		this.accentLights.push(cyanLight);

		// Lumière magenta droite
		const magentaLight = new PointLight('accentMagenta', new Vector3(5, 3, 0), this.scene);
		magentaLight.diffuse = new Color3(1.0, 0.2, 0.8); // Magenta vif
		magentaLight.specular = new Color3(1.0, 0.3, 0.9);
		magentaLight.intensity = 0; // Commence éteinte
		magentaLight.range = 15;
		this.accentLights.push(magentaLight);

		console.log('✨ Lumières d\'accentuation cyan/magenta créées');
	}

	/**
	 * Active une lumière d'accentuation avec effet de pulse
	 * @param {number} index - Index de la lumière (0=cyan, 1=magenta)
	 * @param {number} intensity - Intensité cible (0-2)
	 */
	pulseAccentLight(index, intensity = 1.5) {
		if (index < 0 || index >= this.accentLights.length) return;

		const light = this.accentLights[index];
		light.intensity = intensity;

		// Fade out automatique après 300ms
		setTimeout(() => {
			if (light.intensity > 0) {
				light.intensity = Math.max(0, light.intensity - 0.3);
			}
		}, 100);
	}

	/**
	 * Pulse toutes les lumières d'accentuation simultanément
	 * @param {number} intensity - Intensité du pulse (0-2)
	 */
	pulseAllAccentLights(intensity = 1.0) {
		this.accentLights.forEach(light => {
			light.intensity = intensity;
		});

		// Fade out progressif
		setTimeout(() => {
			this.accentLights.forEach(light => {
				light.intensity = Math.max(0, light.intensity * 0.5);
			});
		}, 150);
	}

	/**
	 * Crée le GlowLayer pour les effets néon
	 * Optimisé pour performances
	 */
	createGlowLayer() {
		// Configuration optimisée pour perf
		this.glowLayer = new GlowLayer('neonGlow', this.scene, {
			mainTextureFixedSize: 256, // 256 au lieu de 512 pour meilleures perfs
			blurKernelSize: 16 // 16 au lieu de 32 pour performances
		});

		this.glowLayer.intensity = 0.4; // RÉDUIT de 1.5 à 0.4 pour éviter overload

		console.log('✅ GlowLayer créé (optimisé pour performances max)');
	}

	/**
	 * Ajoute un effet de glow à un mesh spécifique
	 * @param {Mesh} mesh - Le mesh à faire briller
	 * @param {Color3} color - Couleur du glow
	 * @param {number} intensity - Intensité du glow (0-1)
	 */
	addGlowToMesh(mesh, color, intensity = 1.0) {
		if (!this.glowLayer) return;
		this.glowLayer.addMesh(mesh, color, intensity);
	}

	/**
	 * Retire l'effet de glow d'un mesh
	 * @param {Mesh} mesh - Le mesh à retirer du glow
	 */
	removeGlowFromMesh(mesh) {
		if (!this.glowLayer) return;
		this.glowLayer.removeMesh(mesh);
	}

	/**
	 * Ajuste l'intensité globale du glow layer
	 * @param {number} intensity - Nouvelle intensité (0-3)
	 */
	setGlowIntensity(intensity) {
		if (this.glowLayer) {
			this.glowLayer.intensity = Math.max(0, Math.min(3, intensity));
		}
	}

	/**
	 * Retourne la lumière principale
	 */
	getMainLight() {
		return this.mainLight;
	}

	/**
	 * Retourne le GlowLayer
	 */
	getGlowLayer() {
		return this.glowLayer;
	}

	/**
	 * Nettoie les ressources
	 */
	dispose() {
		// Nettoyer les lumières d'accentuation
		this.accentLights.forEach(light => light.dispose());
		this.accentLights = [];

		if (this.glowLayer) {
			this.glowLayer.dispose();
		}
	}
}