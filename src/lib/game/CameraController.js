import { FreeCamera, Vector3 } from '@babylonjs/core';
import { GameConfig } from './GameConfig.js';

/**
 * Contrôle la caméra du jeu
 */
export class CameraController {
	constructor(scene, speed = GameConfig.cameraSpeed) {
		this.scene = scene;
		this.speed = speed;
		this.isReady = false;

		this.camera = new FreeCamera('camera', new Vector3(0, 2, 0), scene);
		this.camera.setTarget(new Vector3(0, 2, 10));

		// Désactiver les contrôles manuels pour l'arcade
		this.camera.inputs.clear();
	}

	/**
	 * Active le mouvement de la caméra
	 */
	start() {
		this.isReady = true;
	}

	/**
	 * Arrête le mouvement de la caméra
	 */
	stop() {
		this.isReady = false;
	}

	/**
	 * Met à jour la position de la caméra
	 */
	update() {
		if (this.isReady) {
			this.camera.position.z += this.speed;
		}
	}

	/**
	 * Retourne la caméra
	 */
	getCamera() {
		return this.camera;
	}

	/**
	 * Retourne la position Z actuelle
	 */
	getPositionZ() {
		return this.camera.position.z;
	}
}