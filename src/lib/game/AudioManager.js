import { GameConfig } from './GameConfig.js';

/**
 * Gère l'audio du jeu
 */
export class AudioManager {
	constructor(callbacks = {}) {
		this.callbacks = callbacks;
		this.gameAudio = null;
		this.isPlaying = false;
		this.audioOffset = GameConfig.defaultAudioOffset;
		this.audioStartDelay = GameConfig.audioStartDelay;
		this.delayTimerStarted = false;
		this.delayStartTime = 0;

		// Son de hit
		this.hitSounds = [];
		this.currentSoundIndex = 0;
		this.loadHitSounds();
	}

	/**
	 * Charge plusieurs instances du son de hit pour éviter les coupures
	 */
	async loadHitSounds() {
		try {
			// Sample de percussion depuis freesound.org
			// Credit: freakrush - https://freesound.org/people/freakrush/sounds/43370/
			const soundUrl = '/audio/43370__freakrush__bassdrumsoft1.wav';

			// Charger une fois avec fetch pour éviter les problèmes de cache
			const response = await fetch(soundUrl);
			const audioBlob = await response.blob();
			const audioBlobUrl = URL.createObjectURL(audioBlob);

			// Créer 5 instances pour permettre des hits rapides
			for (let i = 0; i < 5; i++) {
				const audio = new Audio(audioBlobUrl);
				audio.volume = 0.2; // Volume faible
				audio.preload = 'auto';

				this.hitSounds.push(audio);
			}
		} catch (error) {
			console.error('❌ Impossible de charger les sons de hit:', error);
		}
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

			// Event listeners pour détecter les pauses automatiques
			this.gameAudio.addEventListener('pause', () => {
				console.warn('🚨 Audio mis en pause automatiquement!', {
					currentTime: this.gameAudio.currentTime,
					paused: this.gameAudio.paused,
					ended: this.gameAudio.ended,
					readyState: this.gameAudio.readyState
				});
			});

			this.gameAudio.addEventListener('stalled', () => {
				console.warn('⚠️ Audio stalled (buffering insuffisant)');
			});

			this.gameAudio.addEventListener('waiting', () => {
				console.warn('⏳ Audio en attente de données');
			});

			this.gameAudio.addEventListener('suspend', () => {
			console.warn('💤 Audio suspendu par le navigateur');
		});

		// Détecter la fin de la musique
		this.gameAudio.addEventListener('ended', () => {
			console.log('🎵 Musique terminée');
			if (this.callbacks.onMusicEnded) {
				this.callbacks.onMusicEnded();
			}
		});

			// Attendre le chargement COMPLET de l'audio
			await new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Timeout chargement audio'));
				}, 30000); // 30s pour les gros fichiers

				// canplaythrough = tout le fichier est chargé et peut être joué sans interruption
				this.gameAudio.addEventListener('canplaythrough', () => {
					clearTimeout(timeout);
					console.log('✅ Audio complètement chargé et prêt');
					resolve();
				}, { once: true });

				this.gameAudio.addEventListener('error', (e) => {
					clearTimeout(timeout);
					console.error('❌ Erreur audio:', e);
					reject(e);
				});

				// Forcer le chargement
				this.gameAudio.load();
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
			return false;
		}

		try {
			// Attendre que l'audio soit complètement prêt (readyState 4 = HAVE_ENOUGH_DATA)
			if (this.gameAudio.readyState < 4) {
				console.warn('⚠️ Audio pas complètement chargé, attente...');
				await new Promise((resolve) => {
					const checkReady = () => {
						if (this.gameAudio.readyState >= 4) {
							resolve();
						} else {
							setTimeout(checkReady, 100);
						}
					};
					checkReady();
				});
			}

			const playPromise = this.gameAudio.play();

			if (playPromise !== undefined) {
				await playPromise;
				this.isPlaying = true;
				console.log('✅ Lecture audio démarrée');
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
	 * Reprend la lecture audio
	 */
	resume() {
		if (this.gameAudio && this.gameAudio.paused) {
			this.gameAudio.play().catch((error) => {
				console.error('❌ Erreur reprise audio:', error);
			});
			this.isPlaying = true;
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
	 * Joue le son de hit (sample de grosse caisse)
	 */
	playHitSound() {
		if (this.hitSounds.length === 0) return;

		try {
			// Utiliser le prochain son disponible (rotation pour éviter les coupures)
			const sound = this.hitSounds[this.currentSoundIndex];
			this.currentSoundIndex = (this.currentSoundIndex + 1) % this.hitSounds.length;

			// Rejouer depuis le début
			sound.currentTime = 0;
			sound.play().catch(() => {
				// Ignorer les erreurs silencieusement (souvent dues à l'autoplay policy)
			});
		} catch (error) {
			// Ignorer silencieusement
		}
	}

	/**
	 * Nettoie les ressources
	 */
	dispose() {
		if (this.gameAudio) {
			this.stop();
			this.gameAudio = null;
		}
		this.hitSounds = [];
	}
}