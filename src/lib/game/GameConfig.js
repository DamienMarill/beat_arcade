/**
 * Configuration centralisée du jeu Beat Borner
 * Ajustez ces valeurs pour tuner le gameplay
 */
export const GameConfig = {
	// ═══════════════════════════════════════════════════
	// SYNCHRONISATION NOTES
	// ═══════════════════════════════════════════════════

	/**
	 * Temps d'anticipation des notes (secondes)
	 * Détermine quand les notes apparaissent avant de devoir être frappées
	 * - 3.0s = anticipation normale
	 * - 4.0s = anticipation confortable
	 * - 6.0s = anticipation large (actuel)
	 * - 8.0s+ = très large visibilité
	 */
	lookaheadTime: 6.0,

	/**
	 * Fenêtre de frappe (secondes)
	 * Tolérance temporelle pour frapper une note (±150ms = 300ms total)
	 * - 0.10 = difficile (±100ms)
	 * - 0.15 = normal (±150ms) - actuel
	 * - 0.20 = facile (±200ms)
	 */
	hitWindow: 0.15,

	/**
	 * Temps de despawn après manquée (secondes)
	 * Délai après lequel une note manquée disparaît
	 * Valeur faible = précision rythmique stricte
	 * - 0.05 = très strict (actuel)
	 * - 0.10 = normal
	 * - 0.20 = tolérant
	 */
	despawnTime: 0.05,

	// ═══════════════════════════════════════════════════
	// CAMÉRA & VITESSE
	// ═══════════════════════════════════════════════════

	/**
	 * Vitesse de défilement (unités par frame)
	 * Détermine la vitesse de défilement du tunnel et des notes
	 * - 0.05 = lent
	 * - 0.10 = normal (actuel)
	 * - 0.15 = rapide
	 * - 0.20 = très rapide
	 */
	cameraSpeed: 0.10,

	/**
	 * Distance de spawn des notes (unités)
	 * Position Z maximale où les notes peuvent apparaître
	 * Note: Calculé automatiquement avec lookaheadTime × vitesse
	 * Valeur de référence: 50 unités
	 */
	spawnDistance: 50,

	/**
	 * Distance de la barre de frappe (unités)
	 * Distance devant la caméra où se trouve la grille/barre de frappe
	 * Doit correspondre à GridHelper.offsetZ
	 * - 5 = distance normale (actuel)
	 */
	hitDistance: 5,

	// ═══════════════════════════════════════════════════
	// AUDIO
	// ═══════════════════════════════════════════════════

	/**
	 * Délai de préparation avant démarrage musique (secondes)
	 * Temps de blanc au début pour que le joueur se prépare
	 * - 2.0 = court
	 * - 3.0 = normal (actuel)
	 * - 5.0 = long
	 */
	audioStartDelay: 3.0,

	/**
	 * Offset audio par défaut (secondes)
	 * Compensation de latence audio système
	 * - Positif = retarder les notes
	 * - Négatif = avancer les notes
	 * - 0.0 = pas d'offset (actuel)
	 * Note: Ajustable en jeu via game.setAudioOffset(ms)
	 */
	defaultAudioOffset: 0.0,

	/**
	 * Volume audio (0.0 à 1.0)
	 * - 0.0 = muet
	 * - 0.7 = normal (actuel)
	 * - 1.0 = volume max
	 */
	audioVolume: 0.7,

	// ═══════════════════════════════════════════════════
	// GRILLE DE JEU
	// ═══════════════════════════════════════════════════

	/**
	 * Configuration de la grille 4×2
	 */
	grid: {
		columns: 4,
		rows: 2,
		positions: {
			x: [-1.5, -0.5, 0.5, 1.5],  // Positions horizontales
			y: [0.8, 2.0]                // Positions verticales (bas, haut)
		},
		offsetZ: 5  // Distance devant caméra (doit = hitDistance)
	},

	// ═══════════════════════════════════════════════════
	// VISUEL
	// ═══════════════════════════════════════════════════

	/**
	 * Taille des notes (unités)
	 */
	noteSize: {
		width: 0.8,
		height: 0.8,
		depth: 0.8
	},

	/**
	 * Couleurs des notes
	 */
	colors: {
		red: {
			diffuse: [1, 0.2, 0.2],
			emissive: [0.8, 0, 0]
		},
		blue: {
			diffuse: [0.2, 0.2, 1],
			emissive: [0, 0, 0.8]
		}
	},

	/**
	 * Intensité émissive de base des notes
	 */
	emissiveIntensity: 0.3,

	/**
	 * Vitesse de rotation des notes (frames par seconde)
	 */
	noteRotationSpeed: 30,

	// ═══════════════════════════════════════════════════
	// DEBUG
	// ═══════════════════════════════════════════════════

	/**
	 * Afficher les guides de grille au démarrage
	 */
	showGridGuides: true,

	/**
	 * Activer les logs de debug dans la console
	 */
	enableDebugLogs: true,

	/**
	 * Nombre de premières notes à logger au chargement
	 */
	debugNotesCount: 5
};

/**
 * Calculs dérivés (ne pas modifier)
 */
export const DerivedConfig = {
	/**
	 * Vitesse de la caméra en unités par seconde
	 * Calculé: vitesse × 60 FPS
	 */
	get cameraSpeedPerSecond() {
		return GameConfig.cameraSpeed * 60;
	},

	/**
	 * Distance maximale de spawn calculée
	 * Basé sur lookaheadTime et vitesse
	 */
	get calculatedSpawnDistance() {
		return this.cameraSpeedPerSecond * GameConfig.lookaheadTime;
	}
};