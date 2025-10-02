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
	constructor(scene, cameraController, audioManager, gridHelper, callbacks = {}) {
		this.scene = scene;
		this.cameraController = cameraController;
		this.audioManager = audioManager;
		this.gridHelper = gridHelper;
		this.callbacks = callbacks;
		this.notes = [];
		this.gameplayData = null;
		this.pathGenerator = null;

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
	 * Définit le générateur de chemin pour positionner les notes
	 */
	setPathGenerator(pathGenerator) {
		this.pathGenerator = pathGenerator;
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

			// Vérifier la fenêtre temporelle et calculer le grade
			const timeUntilHit = data.time - currentAudioTime;
			const absTimeOffset = Math.abs(timeUntilHit);
			
			// Vérifier si dans la fenêtre de hit (good window = max)
			if (absTimeOffset <= this.hitWindow) {
				// Déterminer le grade selon la précision
				const timingWindows = GameConfig.timingWindows;
				let grade = 'good';
				
				if (absTimeOffset <= timingWindows.perfect) {
					grade = 'perfect';
				} else if (absTimeOffset <= timingWindows.great) {
					grade = 'great';
				}
				
				// HIT RÉUSSI avec grade !
				this.hitNote(noteObj, timeUntilHit, gridX, gridY, grade);
				return true;
			}
		}

		return false;
	}

	/**
	 * Marque une note comme frappée et applique les effets visuels
	 * @private
	 */
	hitNote(noteObj, timeOffset, gridX, gridY, grade = 'good') {
		noteObj.hit = true;
		noteObj.isVisible = false;

		const { mesh, data } = noteObj;

		// Utiliser GridHelper comme source de vérité pour la position des particules
		const particlePosition = this.gridHelper.getGridCellWorldPosition(gridX, gridY);

		// Créer un système de particules avec le grade
		this.createHitParticles(particlePosition, data.type, grade);

		// Jouer le son de hit
		this.audioManager.playHitSound();

		// Désactiver immédiatement la note
		mesh.setEnabled(false);

		// Callback avec le grade et la position pour le scoring et l'UI
		if (this.callbacks.onNoteHit) {
			this.callbacks.onNoteHit(grade, timeOffset, gridX, gridY);
		}
	}

	/**
	 * Crée un système de particules pour l'effet de frappe
	 * @private
	 */
	createHitParticles(position, noteType, grade = 'good') {
		// Couleur selon le type de note (rouge/bleu de base)
		const colors = GameConfig.colors;
		const noteColor = noteType === 0 ? colors.red : colors.blue;
		
		// Couleur selon le grade (or/cyan/vert)
		const gradeColor = GameConfig.gradeColors[grade];
		const particleConfig = GameConfig.particlesByGrade[grade];

		// Créer un vrai ParticleSystem Babylon.js
		const particleSystem = new ParticleSystem(`hit_${Date.now()}`, particleConfig.count, this.scene);

		// Texture simple (un rond blanc)
		particleSystem.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);

		// Position d'émission
		particleSystem.emitter = position;
		particleSystem.minEmitBox = new Vector3(0, 0, 0);
		particleSystem.maxEmitBox = new Vector3(0, 0, 0);

		// Couleurs basées sur le grade (or/cyan/vert) avec légère teinte de la note
		const color1 = new Color4(
			gradeColor.r * 0.8 + noteColor.diffuse[0] * 0.2,
			gradeColor.g * 0.8 + noteColor.diffuse[1] * 0.2,
			gradeColor.b * 0.8 + noteColor.diffuse[2] * 0.2,
			1
		);
		const color2 = new Color4(gradeColor.r, gradeColor.g, gradeColor.b, 1);
		
		particleSystem.color1 = color1;
		particleSystem.color2 = color2;
		particleSystem.colorDead = new Color4(0, 0, 0, 0);

		// Taille des particules selon l'intensité du grade
		const sizeMultiplier = particleConfig.intensity;
		particleSystem.minSize = 0.2 * sizeMultiplier;
		particleSystem.maxSize = 0.4 * sizeMultiplier;

		// Durée de vie
		particleSystem.minLifeTime = 0.3;
		particleSystem.maxLifeTime = 0.6;

		// Taux d'émission adapté au nombre de particules
		particleSystem.emitRate = particleConfig.count * 4;

		// Blend mode pour effet brillant
		particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

		// Direction (explosion vers le haut et les côtés)
		particleSystem.direction1 = new Vector3(-1, 1, -1);
		particleSystem.direction2 = new Vector3(1, 3, 1);

		// Vitesse selon l'intensité
		particleSystem.minEmitPower = 1.5 * particleConfig.intensity;
		particleSystem.maxEmitPower = 2.5 * particleConfig.intensity;
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
		// Fenêtre temporelle : garder les notes assez longtemps pour détecter les miss
		// hitWindow * 3 = assez de temps pour que la note passe le panneau de détection
		const minTime = currentAudioTime - (this.hitWindow * 3);
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

			// Calculer la distance sur le chemin où la note devrait être
			const cameraDistance = this.cameraController.getDistanceTraveled
				? this.cameraController.getDistanceTraveled()
				: cameraZ;
			const noteDistance = cameraDistance + this.hitDistance + (timeUntilHit * this.cameraSpeedPerSecond);

			// Si on a un PathGenerator, utiliser le chemin
			if (this.pathGenerator) {
				// Utiliser GridHelper comme source de vérité pour la position
				const worldPosition = this.gridHelper.getGridCellWorldPositionAtDistance(
					noteObj.data.x,
					noteObj.data.y,
					noteDistance
				);

				mesh.position.copyFrom(worldPosition);

				// Orienter la note pour qu'elle soit perpendiculaire au chemin
				const pathData = this.pathGenerator.getPositionAtDistance(noteDistance);
				const forward = pathData.tangent;
				mesh.rotation.y = Math.atan2(forward.x, forward.z);
			} else {
				// Mode classique : ligne droite
				const targetZ = hitBarZ + (timeUntilHit * this.cameraSpeedPerSecond);
				mesh.position.z = targetZ;
			}

			// Distance de la barre de frappe (calculer depuis la position réelle)
			const distanceFromHitBar = Vector3.Distance(mesh.position, this.cameraController.getCamera().position) - this.hitDistance;

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

			// Note manquée : détection par position (panneau invisible)
			// Distance parcourue pendant hitWindow = zone où la note aurait dû être frappée
			const missDetectionDistance = this.hitWindow * this.cameraSpeedPerSecond;
			const missDetectionZ = hitBarZ - missDetectionDistance;
			
			
			
			// Si la note a dépassé le panneau de détection sans être hit, elle est manquée
			if (mesh.position.z < missDetectionZ) {
				mesh.setEnabled(false);
				noteObj.missed = true;
				noteObj.isVisible = false;
				
				// Callback pour le scoring avec position
				if (this.callbacks.onNoteMiss) {
					this.callbacks.onNoteMiss(noteObj.data, noteObj.data.x, noteObj.data.y);
				}
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
