import { GameConfig } from './GameConfig.js';

/**
 * Gère l'audio du jeu
 */
export class AudioManager {
	constructor() {
		this.gameAudio = null;
		this.isPlaying = false;
		this.audioOffset = GameConfig.defaultAudioOffset;
		this.audioStartDelay = GameConfig.audioStartDelay;
		this.delayTimerStarted = false;
		this.delayStartTime = 0;
	}

	/**
	 * Charge l'audio depuis un blob ou une URL
	 */
	async loadAudio(audioSource) {
		try {
			this.gameAudio = new Audio();

			if (audioSource instanceof Blob) {
				const audioUrl = URL.createObjectURL(audioSource);
				this.gameAudio.src = audioUrl;
			} else if (typeof audioSource === 'string') {
				this.gameAudio.src = audioSource;
			}

			this.gameAudio.volume = GameConfig.audioVolume;
			this.gameAudio.preload = 'auto';

			// Attendre le chargement
			await new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Timeout chargement audio'));
				}, 10000);

				this.gameAudio.addEventListener('loadeddata', () => {
					clearTimeout(timeout);
					console.log('✅ Audio chargé');
					resolve();
				});

				this.gameAudio.addEventListener('error', (e) => {
					clearTimeout(timeout);
					console.error('❌ Erreur audio:', e);
					reject(e);
				});
			});

			return true;
		} catch (error) {
			console.error('❌ Erreur chargement audio:', error);
			return false;
		}
	}

	/**
	 * Démarre le compte à rebours de 3 secondes
	 */
	startDelayTimer() {
		this.delayTimerStarted = true;
		this.delayStartTime = performance.now();
		console.log(`⏳ Délai de préparation: ${this.audioStartDelay}s avant démarrage musique`);
	}

	/**
	 * Vérifie si le délai est écoulé et démarre l'audio si nécessaire
	 */
	async updateDelayTimer() {
		if (!this.delayTimerStarted || this.isPlaying) return;

		const elapsed = (performance.now() - this.delayStartTime) / 1000;

		if (elapsed >= this.audioStartDelay) {
			this.delayTimerStarted = false;
			await this.playAudio();
		}
	}

	/**
	 * Démarre la lecture audio (interne)
	 */
	async playAudio() {
		if (!this.gameAudio) {
			console.warn('⚠️ Aucun audio chargé');
			return false;
		}

		try {
			if (this.gameAudio.readyState < 2) {
				console.log('⏳ Audio pas prêt, attente...');
				await new Promise(resolve => setTimeout(resolve, 1000));
			}

			const playPromise = this.gameAudio.play();

			if (playPromise !== undefined) {
				await playPromise;
				console.log(`🎵 MUSIQUE DÉMARRÉE - Timestamp: ${performance.now().toFixed(2)}ms`);
				this.isPlaying = true;
				return true;
			}
		} catch (error) {
			console.error('❌ Erreur lecture audio:', error);
			return false;
		}
	}

	/**
	 * Met en pause l'audio
	 */
	pause() {
		if (this.gameAudio) {
			this.gameAudio.pause();
			this.isPlaying = false;
		}
	}

	/**
	 * Arrête l'audio
	 */
	stop() {
		if (this.gameAudio) {
			this.gameAudio.pause();
			this.gameAudio.currentTime = 0;
			this.isPlaying = false;
		}
	}

	/**
	 * Vérifie si l'audio est en cours de lecture
	 */
	getIsPlaying() {
		return this.isPlaying && this.gameAudio && !this.gameAudio.paused;
	}

	/**
	 * Retourne le temps actuel de lecture audio en secondes (avec offset de synchro)
	 * Retourne des valeurs négatives pendant le délai de préparation
	 */
	getCurrentTime() {
		// Pendant le délai de préparation
		if (this.delayTimerStarted && !this.isPlaying) {
			const elapsed = (performance.now() - this.delayStartTime) / 1000;
			return -(this.audioStartDelay - elapsed); // Valeurs négatives: -3.0 → -0.0
		}

		// Audio en cours de lecture
		if (!this.gameAudio || !this.isPlaying) return 0;
		return this.gameAudio.currentTime + this.audioOffset;
	}

	/**
	 * Retourne le temps audio brut (sans offset)
	 */
	getRawCurrentTime() {
		if (!this.gameAudio) return 0;
		return this.gameAudio.currentTime;
	}

	/**
	 * Configure l'offset audio pour calibration (en secondes)
	 * Positif = notes en avance (ralentir), Négatif = notes en retard (accélérer)
	 */
	setAudioOffset(offsetSeconds) {
		this.audioOffset = offsetSeconds;
		console.log(`🎚️ Audio offset: ${offsetSeconds > 0 ? '+' : ''}${offsetSeconds.toFixed(3)}s`);
	}

	/**
	 * Retourne l'offset audio actuel
	 */
	getAudioOffset() {
		return this.audioOffset;
	}

	/**
	 * Retourne la durée totale de l'audio en secondes
	 */
	getDuration() {
		if (!this.gameAudio) return 0;
		return this.gameAudio.duration || 0;
	}

	/**
	 * Nettoie les ressources
	 */
	dispose() {
		if (this.gameAudio) {
			this.stop();
			this.gameAudio = null;
		}
	}
}