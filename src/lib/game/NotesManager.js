import { MeshBuilder, StandardMaterial, Color3, Animation } from '@babylonjs/core';
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

		console.log(`🏗️ Création de ${this.gameplayData.notes.length} notes...`);

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
		console.log(`✅ ${this.notes.length} notes créées`);
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
	 * Met à jour les notes basé sur le temps audio réel
	 */
	update() {
		// Obtenir le temps audio (peut être négatif pendant le délai de préparation)
		const currentAudioTime = this.audioManager.getCurrentTime();
		const cameraZ = this.cameraController.getPositionZ();

		this.notes.forEach(noteObj => {
			const { mesh, data } = noteObj;
			const noteTime = data.time;

			// Temps avant que la note doive être frappée
			const timeUntilHit = noteTime - currentAudioTime;

			// Spawn la note quand elle entre dans le lookahead
			if (!noteObj.spawned && timeUntilHit <= this.lookaheadTime && timeUntilHit > -this.despawnTime) {
				mesh.setEnabled(true);
				noteObj.spawned = true;
				noteObj.isVisible = true;

				// Log première note
				if (!this.firstNoteShown) {
					this.firstNoteShown = true;
					const rawTime = this.audioManager.getRawCurrentTime();
					const offset = this.audioManager.getAudioOffset();
					console.log(`🎵 PREMIÈRE NOTE SPAWN`);
					console.log(`   Audio brut: ${rawTime.toFixed(3)}s | Offset: ${offset > 0 ? '+' : ''}${offset.toFixed(3)}s | Audio final: ${currentAudioTime.toFixed(3)}s`);
					console.log(`   Note temps: ${noteTime.toFixed(3)}s | Lookahead: ${timeUntilHit.toFixed(3)}s`);
				}
			}

			// Mettre à jour la position de la note visible
			if (noteObj.isVisible && !noteObj.hit && !noteObj.missed) {
				// Position de la barre de frappe (grille)
				const hitBarZ = cameraZ + this.hitDistance;

				// Calculer la position Z basée sur le temps restant
				// Quand timeUntilHit = 0 → note pile sur la barre
				// Quand timeUntilHit > 0 → note devant la barre
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

					// Log pour debug synchro
					if (!noteObj.hitWindowLogged) {
						noteObj.hitWindowLogged = true;
						console.log(`🎯 NOTE EN ZONE FRAPPE - Audio: ${currentAudioTime.toFixed(3)}s | Note attendue: ${noteTime.toFixed(3)}s | Delta: ${(currentAudioTime - noteTime).toFixed(3)}s`);
					}
				}

				// Note manquée
				if (timeUntilHit < -this.despawnTime) {
					mesh.setEnabled(false);
					noteObj.missed = true;
					noteObj.isVisible = false;
					console.log(`❌ Note manquée: ${noteTime.toFixed(2)}s (audio: ${currentAudioTime.toFixed(2)}s)`);
				}
			}
		});

		// Log périodique
		const currentTimeSeconds = Math.floor(currentAudioTime);
		if (currentTimeSeconds !== this.lastLogTime && currentAudioTime > 0) {
			this.lastLogTime = currentTimeSeconds;
			const visibleNotes = this.notes.filter(n => n.isVisible && !n.hit && !n.missed).length;
			const totalHit = this.notes.filter(n => n.hit).length;
			const totalMissed = this.notes.filter(n => n.missed).length;
			console.log(`🎯 Audio: ${currentAudioTime.toFixed(1)}s | Visible: ${visibleNotes} | Hit: ${totalHit} | Missed: ${totalMissed}`);
		}
	}

	/**
	 * Retourne le nombre de notes
	 */
	getNotesCount() {
		return this.notes.length;
	}
}
