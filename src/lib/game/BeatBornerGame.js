import { SceneManager } from './SceneManager.js';
import { CameraController } from './CameraController.js';
import { TunnelGenerator } from './TunnelGenerator.js';
import { NotesManager } from './NotesManager.js';
import { AudioManager } from './AudioManager.js';
import { LightingManager } from './LightingManager.js';
import { InputManager } from './InputManager.js';
import GridHelper from './GridHelper.js';
import { GameConfig } from './GameConfig.js';
import { beatSaverService } from '../../services/BeatSaverService.js';
import { beatMapParser } from '../../services/BeatMapParser.js';
import JSZip from 'jszip';

/**
 * Classe principale du jeu Beat Borner
 * Orchestre tous les managers et composants
 */
export class BeatBornerGame {
	constructor(canvas, callbacks = {}) {
		this.canvas = canvas;
		this.callbacks = callbacks;

		// Managers
		this.sceneManager = null;
		this.cameraController = null;
		this.tunnelGenerator = null;
		this.notesManager = null;
		this.audioManager = null;
		this.lightingManager = null;
		this.inputManager = null;
		this.gridHelper = null;

		// État du jeu
		this.currentMap = null;
		this.gameplayData = null;
		this.isPlaying = false;
		this.startTime = 0;

		this.init();
	}

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
		this.audioManager = new AudioManager();
		this.notesManager = new NotesManager(scene, this.cameraController, this.audioManager);
		this.inputManager = new InputManager();

		// Initialiser le helper de grille
		this.gridHelper = new GridHelper(scene, this.cameraController.getCamera());

		// Connecter les inputs aux notes
		this.setupInputHandling();

		// Enregistrer la boucle de mise à jour
		this.sceneManager.registerBeforeRender(() => this.update());

		// Charger la map
		await this.loadBeatSaverMap('3ba6');
	}

	/**
	 * Configure la gestion des inputs
	 */
	setupInputHandling() {
		this.inputManager.onKeyPress((x, y, key) => {
			// Animer le carré de la grille
			if (this.gridHelper) {
				this.gridHelper.pulseGridSquare(x, y);
			}

			if (!this.isPlaying || !this.gameplayData) return;

			// Tenter de frapper une note
			const hit = this.notesManager.tryHitNote(x, y);

			if (hit) {
				// Callback optionnel pour l'UI
				if (this.callbacks.onNoteHit) {
					this.callbacks.onNoteHit({ x, y, key });
				}
			} else {
				console.log(`❌ MISS - Aucune note à (${x}, ${y}) avec touche [${key.toUpperCase()}]`);
			}
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

		// Mettre à jour le timer du délai audio
		if (this.isPlaying) {
			this.audioManager.updateDelayTimer();

			// Mettre à jour les notes (synchronisées avec l'audio)
			if (this.gameplayData) {
				this.notesManager.update();
			}
		}
	}

	/**
	 * Charge une map depuis BeatSaver
	 */
	async loadBeatSaverMap(mapId) {
		try {
			console.log(`🎵 Chargement de la map ${mapId}...`);

			// Callback de début de chargement
			if (this.callbacks.onLoadingStart) {
				this.callbacks.onLoadingStart();
			}

			// Récupérer les infos
			this.currentMap = await beatSaverService.getMapById(mapId);

			console.log(`✅ Map: ${this.currentMap.metadata.songName}`);

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
			console.log(`⏱️ songTimeOffset: ${songTimeOffsetMs}ms (${songTimeOffsetSeconds.toFixed(3)}s)`);

			// Charger la première difficulté
			const firstDifficultySet = infoData._difficultyBeatmapSets?.[0];
			const firstDifficulty = firstDifficultySet?._difficultyBeatmaps?.[0];

			if (!firstDifficulty) throw new Error('Aucune difficulté trouvée');

			console.log(`🎮 Difficulté: ${firstDifficulty._difficulty}`);

			const difficultyFile = zipFiles.file(firstDifficulty._beatmapFilename);
			if (!difficultyFile) throw new Error(`Fichier ${firstDifficulty._beatmapFilename} introuvable`);

			const difficultyData = JSON.parse(await difficultyFile.async('text'));

			// Parser les données
			const parsedData = beatMapParser.parseDifficulty(difficultyData);

			this.gameplayData = beatMapParser.optimizeForGameplay(parsedData, this.currentMap.metadata.bpm);

			// DEBUG: Afficher les données si activé
			if (GameConfig.enableDebugLogs) {
				console.log('📊 DONNÉES BRUTES - premières notes:');
				const rawNotes = parsedData.notes || parsedData.colorNotes || [];
				rawNotes.slice(0, GameConfig.debugNotesCount).forEach((note, i) => {
					const time = note.time || note.beat || note.b;
					console.log(`   Note ${i}: time=${time} beats | x=${note.lineIndex || note.x} | y=${note.lineLayer || note.y}`);
				});

				console.log('📊 DONNÉES CONVERTIES - premières notes:');
				console.log(`   BPM: ${this.currentMap.metadata.bpm} | Secondes par beat: ${60 / this.currentMap.metadata.bpm}`);
				this.gameplayData.notes.slice(0, GameConfig.debugNotesCount).forEach((note, i) => {
					console.log(`   Note ${i}: time=${note.time.toFixed(3)}s | x=${note.x} | y=${note.y} | pos3D=(${note.position3D.x}, ${note.position3D.y})`);
				});
			}

			console.log(`🎯 ${this.gameplayData.notes.length} notes`);

			// Charger l'audio
			await this.loadAudioFromZip(zipFiles);

			// Créer les notes
			this.notesManager.setGameplayData(this.gameplayData);

			// Appliquer l'offset de la map automatiquement
			if (songTimeOffsetSeconds !== 0) {
				this.audioManager.setAudioOffset(songTimeOffsetSeconds);
				console.log(`✅ Offset audio de la map appliqué: ${songTimeOffsetSeconds.toFixed(3)}s`);
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
			const allFiles = Object.keys(zipFiles.files);
			const audioExtensions = ['.ogg', '.mp3', '.wav', '.egg'];
			let audioFile = null;

			// Chercher le fichier audio
			for (const extension of audioExtensions) {
				audioFile = zipFiles.file(`song${extension}`) ||
					zipFiles.file(`audio${extension}`) ||
					zipFiles.file(`music${extension}`);
				if (audioFile) break;
			}

			// Recherche plus large
			if (!audioFile) {
				for (const fileName of allFiles) {
					const lowerName = fileName.toLowerCase();
					if ((lowerName.includes('song') || lowerName.includes('audio') || lowerName.includes('music')) &&
						audioExtensions.some(ext => lowerName.endsWith(ext))) {
						audioFile = zipFiles.file(fileName);
						break;
					}
				}
			}

			// Fallback vers preview
			if (!audioFile) {
				console.log('⚠️ Audio non trouvé, utilisation preview...');
				if (this.currentMap?.version.previewUrl) {
					await this.audioManager.loadAudio(this.currentMap.version.previewUrl);
				}
				return;
			}

			// Charger l'audio depuis le blob
			const audioBlob = await audioFile.async('blob');
			await this.audioManager.loadAudio(audioBlob);

		} catch (error) {
			console.error('❌ Erreur chargement audio:', error);

			// Fallback
			if (this.currentMap?.version.previewUrl) {
				await this.audioManager.loadAudio(this.currentMap.version.previewUrl);
			}
		}
	}

	/**
	 * Démarre le jeu
	 */
	async startGame() {
		this.startTime = performance.now();
		console.log(`🚀 GAME START - Timestamp: ${this.startTime.toFixed(2)}ms`);

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
	pauseGame() {
		this.isPlaying = false;
		this.cameraController.stop();
		this.audioManager.pause();
		this.inputManager.disable();
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
		console.log(`🎚️ Offset configuré: ${offsetMs}ms (${offsetSeconds.toFixed(3)}s)`);
		console.log(`   > Positif = notes trop tôt (ralentir)`);
		console.log(`   > Négatif = notes trop tard (accélérer)`);
	}

	/**
	 * Retourne l'offset audio actuel en millisecondes
	 */
	getAudioOffset() {
		return this.audioManager.getAudioOffset() * 1000;
	}

	/**
	 * Nettoie les ressources
	 */
	dispose() {
		if (this.inputManager) this.inputManager.dispose();
		if (this.audioManager) this.audioManager.dispose();
		if (this.sceneManager) this.sceneManager.dispose();
	}
}