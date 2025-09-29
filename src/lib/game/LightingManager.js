import { HemisphericLight, Vector3, Color3 } from '@babylonjs/core';

/**
 * Gère l'éclairage de la scène
 */
export class LightingManager {
	constructor(scene) {
		this.scene = scene;
		this.createLights();
	}

	/**
	 * Crée les lumières de la scène
	 */
	createLights() {
		const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
		light.intensity = 0.7;
		light.diffuse = new Color3(0.8, 0.9, 1);

		this.mainLight = light;
	}

	/**
	 * Retourne la lumière principale
	 */
	getMainLight() {
		return this.mainLight;
	}
}