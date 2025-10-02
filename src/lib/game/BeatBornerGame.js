import { SceneManager } from './SceneManager.js';
import { CameraController } from './CameraController.js';
import { TunnelGenerator } from './TunnelGenerator.js';
import { NotesManager } from './NotesManager.js';
import { AudioManager } from './AudioManager.js';
import { LightingManager } from './LightingManager.js';
import { InputManager } from './InputManager.js';
import GridHelper from './GridHelper.js';
import { ScoreManager } from './ScoreManager.js';
import { PathGenerator } from './PathGenerator.js';
import { SpaceshipManager } from './SpaceshipManager.js';
import { GameConfig } from './GameConfig.js';
import { beatSaverService } from '../../services/BeatSaverService.js';
import { beatMapParser } from '../../services/BeatMapParser.js';
import JSZip from 'jszip';

/**
 * Classe principale du jeu Beat Borner
 * Orchestre tous les managers et composants
 */
export class BeatBornerGame {
	constructor(canvas, callbacks = {}, mapId = '3ba6') {
		this.canvas = canvas;
		this.callbacks = callbacks;
		this.mapId = mapId;

		// Managers
		this.sceneManager = null;
		this.cameraController = null;
		this.tunnelGenerator = null;
		this.notesManager = null;
		this.audioManager = null;
		this.lightingManager = null;
		this.inputManager = null;
		this.gridHelper = null;
		this.scoreManager = null;
		this.pathGenerator = null;
		this.spaceshipManager = null;

		// État du jeu
		this.currentMap = null;
		this.gameplayData = null;
		this.isPlaying = false;
		this.isPaused = false;
		this.startTime = 0;
		this.musicEndTime = 0; // Pour gérer le délai de 3s après la fin

		this.init();
	}

	/**
	 * Initialise le jeu
	 */
	/**
	 * Initialise le jeu
	 */
	async init() {
		// Créer la scène
		this.sceneManager = new SceneManager(this.canvas);
		const scene = this.sceneManager.getScene();

		// Créer les contrôleurs (audioManager en premier pour NotesManager)
		this.cameraController = new CameraController(scene);
		this.lightingManager = new LightingManager(scene);
		this.tunnelGenerator = new TunnelGenerator(scene, this.cameraController);
		this.audioManager = new AudioManager({
			onMusicEnded: () => {
				// Marquer le temps de fin pour gérer le délai de 3s
				this.musicEndTime = performance.now();
			}
		});

		// Initialiser le helper de grille (AVANT NotesManager pour qu'il puisse l'utiliser)
		this.gridHelper = new GridHelper(scene, this.cameraController.getCamera(), this.cameraController);

		// Initialiser le vaisseau spatial au centre de la grille
		this.spaceshipManager = new SpaceshipManager(scene, this.cameraController, this.gridHelper);
		await this.spaceshipManager.loadSpaceship();

		// Créer le ScoreManager avec callbacks pour l'UI
		this.scoreManager = new ScoreManager({
			onScoreUpdate: (data) => {
				if (this.callbacks.onScoreUpdate) {
					this.callbacks.onScoreUpdate(data);
				}
			},
			onComboUpdate: (combo, multiplier) => {
				if (this.callbacks.onComboUpdate) {
					this.callbacks.onComboUpdate(combo, multiplier);
				}
			},
			onComboBreak: (previousCombo) => {
				if (this.callbacks.onComboBreak) {
					this.callbacks.onComboBreak(previousCombo);
				}
			}
		});

		// Créer le NotesManager avec callback pour le scoring ET gridHelper
		this.notesManager = new NotesManager(scene, this.cameraController, this.audioManager, this.gridHelper, {
			onNoteHit: (grade, timeOffset, gridX, gridY) => {
				// Enregistrer le hit dans le ScoreManager
				this.scoreManager.registerHit(grade);

				// Callback vers l'UI si nécessaire
				if (this.callbacks.onNoteHit) {
					this.callbacks.onNoteHit(grade, timeOffset, gridX, gridY);
				}
			},
			onNoteMiss: (note, gridX, gridY) => {
				// Enregistrer le miss dans le ScoreManager
				this.scoreManager.registerMiss();

				// Callback vers l'UI si nécessaire
				if (this.callbacks.onNoteMiss) {
					this.callbacks.onNoteMiss(note, gridX, gridY);
				}
			}
		});

		this.inputManager = new InputManager();

		// Connecter les inputs aux notes
		this.setupInputHandling();

		// Enregistrer la boucle de mise à jour
		this.sceneManager.registerBeforeRender(() => this.update());

		// Charger la map sélectionnée
		await this.loadBeatSaverMap(this.mapId);
	}

	/**
	 * Configure la gestion des inputs
	 */
	setupInputHandling() {
		this.inputManager.onKeyPress((x, y, key) => {
			// Déplacer le vaisseau vers la position pressée
			if (this.spaceshipManager) {
				this.spaceshipManager.moveToGridPosition(x, y);
			}

			// Animer le carré de la grille
			if (this.gridHelper) {
				this.gridHelper.pulseGridSquare(x, y);
			}

			if (!this.isPlaying || !this.gameplayData) return;

			// Tenter de frapper une note
			const hit = this.notesManager.tryHitNote(x, y);
			// Le callback onNoteHit est maintenant géré dans NotesManager avec le grade
		});
	}

	/**
	 * Boucle de mise à jour principale
	 */
	update() {
		// Mettre à jour la caméra
		this.cameraController.update();

		// Mettre à jour le tunnel
		this.tunnelGenerator.update();
		this.tunnelGenerator.updateMaterialsAnimation();

		// Mettre à jour la grille
		if (this.gridHelper) {
			this.gridHelper.updateGridPosition();
		}

		// Mettre à jour le vaisseau spatial (animation de vague)
		if (this.spaceshipManager) {
			this.spaceshipManager.update();
		}

		// Mettre à jour le timer du délai audio
		if (this.isPlaying) {
			this.audioManager.updateDelayTimer();

			// Mettre à jour les notes (synchronisées avec l'audio)
			if (this.gameplayData) {
				this.notesManager.update();
			}

			// Vérifier si 3s se sont écoulées après la fin de la musique
			if (this.musicEndTime > 0) {
				const elapsedSinceEnd = (performance.now() - this.musicEndTime) / 1000;
				if (elapsedSinceEnd >= 3.0) {
					this.endGame();
				}
			}
		}
	}

	/**
	 * Charge une map depuis BeatSaver
	 */
	async loadBeatSaverMap(mapId) {
		try {
			// Callback de début de chargement
			if (this.callbacks.onLoadingStart) {
				this.callbacks.onLoadingStart();
			}

			// Récupérer les infos
			this.currentMap = await beatSaverService.getMapById(mapId);

			// Callback avec les infos de la map
			if (this.callbacks.onMapInfoLoaded) {
				this.callbacks.onMapInfoLoaded({
					songName: this.currentMap.metadata.songName,
					artistName: this.currentMap.metadata.songAuthorName,
					mapperName: this.currentMap.metadata.levelAuthorName,
					bpm: this.currentMap.metadata.bpm
				});
			}

			// Télécharger le ZIP
			const response = await fetch(this.currentMap.version.downloadUrl);
			const zipBuffer = await response.arrayBuffer();

			const zip = new JSZip();
			const zipFiles = await zip.loadAsync(zipBuffer);

			// Lire info.dat
			const infoFile = zipFiles.file('info.dat') || zipFiles.file('Info.dat');
			if (!infoFile) throw new Error('info.dat introuvable');

			const infoData = JSON.parse(await infoFile.async('text'));

			// Extraire le songTimeOffset (en MILLISECONDES dans le fichier)
			const songTimeOffsetMs = infoData._songTimeOffset || 0;
			const songTimeOffsetSeconds = songTimeOffsetMs / 1000;

			// Charger la première difficulté
			const firstDifficultySet = infoData._difficultyBeatmapSets?.[0];
			const firstDifficulty = firstDifficultySet?._difficultyBeatmaps?.[0];

			if (!firstDifficulty) throw new Error('Aucune difficulté trouvée');

			const difficultyFile = zipFiles.file(firstDifficulty._beatmapFilename);
			if (!difficultyFile) throw new Error(`Fichier ${firstDifficulty._beatmapFilename} introuvable`);

			const difficultyData = JSON.parse(await difficultyFile.async('text'));

			// Parser les données
			const parsedData = beatMapParser.parseDifficulty(difficultyData);

			this.gameplayData = beatMapParser.optimizeForGameplay(parsedData, this.currentMap.metadata.bpm);

			// Charger l'audio
			await this.loadAudioFromZip(zipFiles);

			// Générer le chemin rythmique basé sur le BPM de la musique
			this.pathGenerator = new PathGenerator(
				this.gameplayData,
				GameConfig.pathConfig,
				this.currentMap.metadata.bpm
			);

			// Connecter le chemin à la caméra, au tunnel, à la grille et aux notes
			this.cameraController.setPathGenerator(this.pathGenerator);
			this.tunnelGenerator.setPathGenerator(this.pathGenerator);
			this.gridHelper.setPathGenerator(this.pathGenerator);
			this.notesManager.setPathGenerator(this.pathGenerator);

			// Créer les notes
			this.notesManager.setGameplayData(this.gameplayData);

			// Appliquer l'offset de la map automatiquement
			if (songTimeOffsetSeconds !== 0) {
				this.audioManager.setAudioOffset(songTimeOffsetSeconds);
			}

			// Callback de fin de chargement
			if (this.callbacks.onLoadingComplete) {
				this.callbacks.onLoadingComplete({
					songName: this.currentMap.metadata.songName,
					notesCount: this.notesManager.getNotesCount()
				});
			}

		} catch (error) {
			console.error('❌ Erreur chargement:', error);
			if (this.callbacks.onLoadingError) {
				this.callbacks.onLoadingError(error);
			}
		}
	}

	/**
	 * Charge l'audio depuis le ZIP
	 */
	async loadAudioFromZip(zipFiles) {
		try {
			console.log('🎮 Map ID:', this.currentMap?.id);
			console.log('🎵 Map:', this.currentMap?.metadata?.songName);
			console.log('⏱️ Durée attendue:', this.currentMap?.metadata?.duration, 'secondes');

			const allFiles = Object.keys(zipFiles.files);
			console.log('🔍 Fichiers dans le ZIP:', allFiles);

			const audioExtensions = ['.ogg', '.mp3', '.wav', '.egg'];
			let audioFile = null;
			let audioFileName = null;

			// Chercher le fichier audio avec noms standards
			for (const extension of audioExtensions) {
				const candidates = [
					`song${extension}`,
					`audio${extension}`,
					`music${extension}`
				];

				for (const candidate of candidates) {
					audioFile = zipFiles.file(candidate);
					if (audioFile) {
						audioFileName = candidate;
						break;
					}
				}
				if (audioFile) break;
			}

			// Si pas trouvé, chercher N'IMPORTE QUEL fichier avec extension audio
			if (!audioFile) {
				console.log('⚠️ Fichier audio standard non trouvé, recherche par extension...');
				for (const fileName of allFiles) {
					const lowerName = fileName.toLowerCase();
					// Vérifier simplement si le fichier a une extension audio
					if (audioExtensions.some(ext => lowerName.endsWith(ext))) {
						audioFile = zipFiles.file(fileName);
						audioFileName = fileName;
						console.log('✅ Trouvé par extension:', fileName);
						break;
					}
				}
			}

			// Fallback vers preview
			if (!audioFile) {
				console.warn('❌ Aucun fichier audio trouvé dans le ZIP!');
				console.warn('🔄 Utilisation de la PREVIEW (10 secondes seulement!)');
				console.warn('📍 Preview URL:', this.currentMap?.version.previewUrl);
				if (this.currentMap?.version.previewUrl) {
					await this.audioManager.loadAudio(this.currentMap.version.previewUrl);
				}
				return;
			}

			console.log('✅ Fichier audio trouvé dans le ZIP:', audioFileName);

			// Charger l'audio depuis le blob
			const audioBlob = await audioFile.async('blob');
			console.log('📦 Taille du blob audio:', (audioBlob.size / 1024 / 1024).toFixed(2), 'MB');
			console.log('📦 Type MIME du blob:', audioBlob.type);

			await this.audioManager.loadAudio(audioBlob);

		} catch (error) {
			console.error('❌ Erreur chargement audio:', error);

			// Fallback
			if (this.currentMap?.version.previewUrl) {
				console.warn('🔄 Fallback vers preview URL (10s seulement!)');
				await this.audioManager.loadAudio(this.currentMap.version.previewUrl);
			}
		}
	}

	/**
	 * Démarre le jeu
	 */
	async startGame() {
		this.startTime = performance.now();
		this.isPlaying = true;

		// Activer la caméra
		this.cameraController.start();

		// Activer les inputs clavier
		this.inputManager.enable();

		// Afficher la grille si activé dans config
		if (GameConfig.showGridGuides) {
			this.gridHelper.showGridGuides();
		}

		// Démarrer le compte à rebours de 3 secondes
		this.audioManager.startDelayTimer();

		// Callback
		if (this.callbacks.onGameStart) {
			this.callbacks.onGameStart();
		}
	}

	/**
	 * Met en pause le jeu
	 */
	/**
	 * Met en pause le jeu
	 */
	pauseGame() {
		if (!this.isPlaying) return;
		
		this.isPlaying = false;
		this.cameraController.stop();
		this.audioManager.pause();
		this.inputManager.disable();

		// Callback pour notifier l'UI
		if (this.callbacks.onGamePause) {
			this.callbacks.onGamePause();
		}
	}

	/**
	 * Reprend le jeu après une pause
	 */
	resumeGame() {
		if (this.isPlaying) return;
		
		this.isPlaying = true;
		this.cameraController.start();
		this.audioManager.resume();
		this.inputManager.enable();

		// Callback pour notifier l'UI
		if (this.callbacks.onGameResume) {
			this.callbacks.onGameResume();
		}
	}

	/**
	 * Obtient le temps de jeu actuel
	 */
	getGameTime() {
		if (!this.isPlaying) return '00:00';

		const currentTime = (performance.now() - this.startTime) / 1000;
		const minutes = Math.floor(currentTime / 60);
		const seconds = Math.floor(currentTime % 60);
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}

	/**
	 * Obtient les infos de la map actuelle
	 */
	getCurrentMapInfo() {
		if (!this.currentMap) return null;

		return {
			songName: this.currentMap.metadata.songName,
			artistName: this.currentMap.metadata.songAuthorName,
			mapperName: this.currentMap.metadata.levelAuthorName,
			bpm: this.currentMap.metadata.bpm
		};
	}

	/**
	 * Ajuste l'offset audio pour calibration manuelle (en millisecondes)
	 * Usage console: game.setAudioOffset(-100) pour avancer notes de 100ms
	 */
	setAudioOffset(offsetMs) {
		const offsetSeconds = offsetMs / 1000;
		this.audioManager.setAudioOffset(offsetSeconds);
	}

	/**
	 * Retourne l'offset audio actuel en millisecondes
	 */
	getAudioOffset() {
		return this.audioManager.getAudioOffset() * 1000;
	}

	/**
	 * Termine le jeu et affiche les résultats
	 */
	endGame() {
		this.isPlaying = false;
		this.cameraController.stop();
		this.inputManager.disable();

		// Récupérer les stats finales
		const finalStats = this.scoreManager.getStats();

		// Callback pour afficher le modal de résultats
		if (this.callbacks.onGameEnd) {
			this.callbacks.onGameEnd(finalStats);
		}
	}

	/**
	 * Nettoie les ressources
	 */
	dispose() {
		if (this.inputManager) this.inputManager.dispose();
		if (this.audioManager) this.audioManager.dispose();
		if (this.spaceshipManager) this.spaceshipManager.dispose();
		if (this.sceneManager) this.sceneManager.dispose();
	}
}