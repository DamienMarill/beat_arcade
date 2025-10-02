import { FreeCamera, Vector3 } from '@babylonjs/core';
import { GameConfig } from './GameConfig.js';

/**
 * Contrôle la caméra du jeu
 * Suit un chemin rythmique généré par PathGenerator
 */
export class CameraController {
	constructor(scene, speed = GameConfig.cameraSpeed) {
		this.scene = scene;
		this.speed = speed;
		this.isReady = false;
		this.pathGenerator = null;
		this.distanceTraveled = 0;

		this.camera = new FreeCamera('camera', new Vector3(0, 2, 0), scene);
		this.camera.setTarget(new Vector3(0, 2, 10));

		// Désactiver les contrôles manuels pour l'arcade
		this.camera.inputs.clear();
	}

	/**
	 * Définit le générateur de chemin pour les virages rythmiques
	 */
	setPathGenerator(pathGenerator) {
		this.pathGenerator = pathGenerator;
		this.distanceTraveled = 0;
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
	 * Suit le chemin rythmique si un PathGenerator est défini
	 */
	update() {
		if (!this.isReady) return;

		if (this.pathGenerator) {
			// Suivre le chemin rythmique
			this.distanceTraveled += this.speed;

			const pathData = this.pathGenerator.getPositionAtDistance(this.distanceTraveled);

			// Mettre à jour la position
			this.camera.position.copyFrom(pathData.position);

			// Calculer le point de visée (un peu devant sur le chemin)
			const lookAheadDistance = this.distanceTraveled + 5;
			const lookAheadData = this.pathGenerator.getPositionAtDistance(lookAheadDistance);

			// Orienter la caméra vers le point devant
			this.camera.setTarget(lookAheadData.position);
		} else {
			// Mode classique : ligne droite
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

	/**
	 * Retourne la distance parcourue sur le chemin
	 */
	getDistanceTraveled() {
		return this.distanceTraveled;
	}

	/**
	 * Retourne la direction actuelle de la caméra
	 */
	getDirection() {
		return this.camera.getDirection(Vector3.Forward());
	}
}