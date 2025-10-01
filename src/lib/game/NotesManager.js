import { MeshBuilder, StandardMaterial, Color3, Animation, Vector3 } from '@babylonjs/core';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { GameConfig, DerivedConfig } from './GameConfig.js';

/**
 * Gère la création et l'animation des notes 3D
 * Synchronisation basée sur le temps audio réel
 */
export class NotesManager {
	constructor(scene, cameraController, audioManager) {
		this.scene = scene;
		this.cameraController = cameraController;
		this.audioManager = audioManager;
		this.notes = [];
		this.gameplayData = null;

		// Configuration depuis GameConfig
		this.lookaheadTime = GameConfig.lookaheadTime;
		this.hitWindow = GameConfig.hitWindow;
		this.despawnTime = GameConfig.despawnTime;
		this.speed = GameConfig.cameraSpeed;
		this.cameraSpeedPerSecond = DerivedConfig.cameraSpeedPerSecond;
		this.spawnDistance = GameConfig.spawnDistance;
		this.hitDistance = GameConfig.hitDistance;

		// État
		this.lastLogTime = -1;
		this.firstNoteShown = false;

		// Optimisation: index de la prochaine note à spawn
		this.nextNoteIndex = 0;
	}

	/**
	 * Définit les données de gameplay
	 */
	setGameplayData(data) {
		this.gameplayData = data;
		this.createNotesFromGameplayData();
	}

	/**
	 * Crée toutes les notes 3D depuis les données de gameplay
	 */
	createNotesFromGameplayData() {
		if (!this.gameplayData) return;

		this.gameplayData.notes.forEach((noteData, index) => {
			const note = this.createNote(noteData, index);

			// Position initiale (sera mise à jour dynamiquement)
			note.position.set(
				noteData.position3D.x,
				noteData.position3D.y,
				this.spawnDistance
			);

			note.setEnabled(false);

			this.notes.push({
				mesh: note,
				data: noteData,
				spawned: false,
				hit: false,
				missed: false,
				isVisible: false
			});
		});

		// Trier par temps
		this.notes.sort((a, b) => a.data.time - b.data.time);
	}

	/**
	 * Crée une note 3D
	 */
	createNote(noteData, index) {
		const note = MeshBuilder.CreateBox(`note_${index}`, {
			width: GameConfig.noteSize.width,
			height: GameConfig.noteSize.height,
			depth: GameConfig.noteSize.depth
		}, this.scene);

		// Matériau selon le type
		const material = new StandardMaterial(`noteMat_${index}`, this.scene);
		if (noteData.type === 0) {
			// Rouge
			const red = GameConfig.colors.red;
			material.diffuseColor = new Color3(...red.diffuse);
			material.emissiveColor = new Color3(...red.emissive);
		} else {
			// Bleu
			const blue = GameConfig.colors.blue;
			material.diffuseColor = new Color3(...blue.diffuse);
			material.emissiveColor = new Color3(...blue.emissive);
		}

		material.emissiveIntensity = GameConfig.emissiveIntensity;
		note.material = material;

		// Animation de rotation
		Animation.CreateAndStartAnimation(
			`noteRotation_${index}`,
			note,
			"rotation.y",
			GameConfig.noteRotationSpeed,
			GameConfig.noteRotationSpeed,
			0,
			Math.PI * 2,
			Animation.ANIMATIONLOOPMODE_CYCLE
		);

		return note;
	}

	/**
	 * Tente de frapper une note à la position donnée
	 * Retourne true si une note a été frappée avec succès
	 */
	tryHitNote(gridX, gridY) {
		const currentAudioTime = this.audioManager.getCurrentTime();

		// Chercher une note frappable à cette position
		for (const noteObj of this.notes) {
			// Ignorer les notes déjà frappées/manquées ou invisibles
			if (noteObj.hit || noteObj.missed || !noteObj.isVisible) continue;

			const { data } = noteObj;

			// Vérifier la position
			if (data.x !== gridX || data.y !== gridY) continue;

			// Vérifier la fenêtre temporelle
			const timeUntilHit = data.time - currentAudioTime;
			if (Math.abs(timeUntilHit) <= this.hitWindow) {
				// HIT RÉUSSI !
				this.hitNote(noteObj, timeUntilHit, gridX, gridY);
				return true;
			}
		}

		return false;
	}

	/**
	 * Marque une note comme frappée et applique les effets visuels
	 * @private
	 */
	hitNote(noteObj, timeOffset, gridX, gridY) {
		noteObj.hit = true;
		noteObj.isVisible = false;

		const { mesh, data } = noteObj;

		// IMPORTANT: Utiliser directement les positions de la grille !
		const cameraZ = this.cameraController.getPositionZ();
		const hitBarZ = cameraZ + this.hitDistance;

		// Récupérer les positions monde de la grille depuis GameConfig
		const gridPositions = GameConfig.grid.positions;
		const particlePosition = new Vector3(
			gridPositions.x[gridX],  // Position X exacte de la case de grille
			gridPositions.y[gridY],  // Position Y exacte de la case de grille
			hitBarZ                  // Position Z de la grille (caméra + 5)
		);

		// Créer un système de particules à la position de la grille
		this.createHitParticles(particlePosition, data.type);

		// Jouer le son de hit
		this.audioManager.playHitSound();

		// Désactiver immédiatement la note
		mesh.setEnabled(false);
	}

	/**
	 * Crée un système de particules pour l'effet de frappe
	 * @private
	 */
	createHitParticles(position, noteType) {
		// Couleur selon le type de note
		const colors = GameConfig.colors;
		const noteColor = noteType === 0 ? colors.red : colors.blue;

		// Créer un vrai ParticleSystem Babylon.js
		const particleSystem = new ParticleSystem(`hit_${Date.now()}`, 100, this.scene);

		// Texture simple (un rond blanc)
		particleSystem.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);

		// Position d'émission
		particleSystem.emitter = position;
		particleSystem.minEmitBox = new Vector3(0, 0, 0);
		particleSystem.maxEmitBox = new Vector3(0, 0, 0);

		// Couleurs
		particleSystem.color1 = new Color4(...noteColor.diffuse, 1);
		particleSystem.color2 = new Color4(...noteColor.emissive, 1);
		particleSystem.colorDead = new Color4(0, 0, 0, 0);

		// Taille des particules
		particleSystem.minSize = 0.2;
		particleSystem.maxSize = 0.4;

		// Durée de vie
		particleSystem.minLifeTime = 0.3;
		particleSystem.maxLifeTime = 0.6;

		// Taux d'émission
		particleSystem.emitRate = 200;

		// Blend mode pour effet brillant
		particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

		// Direction (explosion vers le haut et les côtés)
		particleSystem.direction1 = new Vector3(-1, 1, -1);
		particleSystem.direction2 = new Vector3(1, 3, 1);

		// Vitesse
		particleSystem.minEmitPower = 1.5;
		particleSystem.maxEmitPower = 2.5;
		particleSystem.updateSpeed = 0.016;

		// Gravité
		particleSystem.gravity = new Vector3(0, -9.8, 0);

		// Durée d'émission courte (explosion rapide)
		particleSystem.targetStopDuration = 0.1;

		// Auto-destruction après arrêt
		particleSystem.disposeOnStop = true;

		// Démarrer !
		particleSystem.start();
	}

	/**
	 * Met à jour les notes basé sur le temps audio réel
	 * OPTIMISÉ: Ne traite que les notes dans une fenêtre temporelle active
	 */
	update() {
		// Obtenir le temps audio (peut être négatif pendant le délai de préparation)
		const currentAudioTime = this.audioManager.getCurrentTime();
		const cameraZ = this.cameraController.getPositionZ();

		// Spawn de nouvelles notes (optimisation: commence où on s'est arrêté)
		while (this.nextNoteIndex < this.notes.length) {
			const noteObj = this.notes[this.nextNoteIndex];
			const timeUntilHit = noteObj.data.time - currentAudioTime;

			// Si cette note n'est pas encore dans le lookahead, on arrête (notes triées par temps)
			if (timeUntilHit > this.lookaheadTime) {
				break;
			}

			// Spawn la note
			if (!noteObj.spawned) {
				noteObj.mesh.setEnabled(true);
				noteObj.spawned = true;
				noteObj.isVisible = true;
			}

			this.nextNoteIndex++;
		}

		// Mise à jour des notes actives uniquement
		// Fenêtre temporelle: [currentTime - despawnTime, currentTime + lookaheadTime]
		const minTime = currentAudioTime - this.despawnTime;
		const maxTime = currentAudioTime + this.lookaheadTime;

		for (let i = 0; i < this.nextNoteIndex; i++) {
			const noteObj = this.notes[i];
			const noteTime = noteObj.data.time;

			// Skip si hors fenêtre temporelle active
			if (noteTime < minTime || noteTime > maxTime) continue;
			// Skip si déjà traitée
			if (noteObj.hit || noteObj.missed || !noteObj.isVisible) continue;

			const { mesh } = noteObj;
			const timeUntilHit = noteTime - currentAudioTime;

			// Position de la barre de frappe (grille)
			const hitBarZ = cameraZ + this.hitDistance;

			// Calculer la position Z basée sur le temps restant
			const targetZ = hitBarZ + (timeUntilHit * this.cameraSpeedPerSecond);
			mesh.position.z = targetZ;

			// Distance de la barre de frappe
			const distanceFromHitBar = Math.abs(targetZ - hitBarZ);

			// Effets visuels de proximité
			if (timeUntilHit > 0 && timeUntilHit < 1.0) {
				const intensity = Math.max(0, (1.0 - timeUntilHit));
				if (mesh.material) {
					mesh.material.emissiveIntensity = 0.3 + intensity * 0.7;

					if (distanceFromHitBar < 5) {
						const scale = 1 + (5 - distanceFromHitBar) * 0.05;
						mesh.scaling.setAll(scale);
					} else {
						mesh.scaling.setAll(1);
					}
				}
			}

			// Zone de frappe visuelle
			if (Math.abs(timeUntilHit) < this.hitWindow) {
				if (mesh.material) {
					mesh.material.emissiveIntensity = 1.0;
				}
			}

			// Note manquée
			if (timeUntilHit < -this.despawnTime) {
				mesh.setEnabled(false);
				noteObj.missed = true;
				noteObj.isVisible = false;
			}
		}
	}

	/**
	 * Retourne le nombre de notes
	 */
	getNotesCount() {
		return this.notes.length;
	}
}
