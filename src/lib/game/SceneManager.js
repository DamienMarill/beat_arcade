import { Engine, Scene } from '@babylonjs/core';

/**
 * Gère la scène Babylon.js principale
 */
export class SceneManager {
	constructor(canvas) {
		this.canvas = canvas;
		this.engine = new Engine(canvas, true);
		this.scene = new Scene(this.engine);

		this.setupRenderLoop();
		this.handleResize();
	}

	/**
	 * Enregistre une fonction de mise à jour appelée avant chaque rendu
	 */
	registerBeforeRender(callback) {
		this.scene.registerBeforeRender(callback);
	}

	/**
	 * Configure la boucle de rendu
	 */
	setupRenderLoop() {
		this.engine.runRenderLoop(() => {
			this.scene.render();
		});
	}

	/**
	 * Gère le redimensionnement de la fenêtre
	 */
	handleResize() {
		window.addEventListener('resize', () => {
			this.engine.resize();
		});
	}

	/**
	 * Nettoie les ressources
	 */
	dispose() {
		this.scene.dispose();
		this.engine.dispose();
	}

	getScene() {
		return this.scene;
	}

	getEngine() {
		return this.engine;
	}
}