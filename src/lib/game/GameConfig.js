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

	/**
	 * Fenêtres de timing pour le scoring (secondes)
	 * Système à 3 niveaux inspiré de DDR/osu!/Guitar Hero
	 * perfect < great < good (dans hitWindow)
	 */
	timingWindows: {
		perfect: 0.050,  // ±50ms - Timing parfait (doré, effet maximal)
		great: 0.100,    // ±100ms - Bon timing (cyan, effet moyen)
		good: 0.150      // ±150ms - Acceptable (vert, effet minimal)
	},

	/**
	 * Points attribués par grade de hit
	 */
	scorePoints: {
		perfect: 100,  // PARFAIT: timing exceptionnel
		great: 70,     // SUPER: bon timing
		good: 40,      // BIEN: timing acceptable
		miss: 0        // Manqué: aucun point
	},

	/**
	 * Couleurs des grades (format RGB pour Babylon.js)
	 */
	gradeColors: {
		perfect: { r: 1.0, g: 0.84, b: 0.0 },   // Or (gold)
		great: { r: 0.0, g: 0.9, b: 1.0 },      // Cyan
		good: { r: 0.2, g: 1.0, b: 0.2 },       // Vert clair
		miss: { r: 0.8, g: 0.2, b: 0.2 }        // Rouge
	},

	/**
	 * Configuration des effets de particules par grade
	 */
	particlesByGrade: {
		perfect: { count: 50, intensity: 1.5 },   // Maximum d'effet
		great: { count: 30, intensity: 1.0 },     // Effet moyen
		good: { count: 15, intensity: 0.7 },      // Effet minimal
		miss: { count: 5, intensity: 0.3 }        // Effet très faible
	},

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
	audioVolume: 0.5,

	// ═══════════════════════════════════════════════════
	// GRILLE DE JEU
	// ═══════════════════════════════════════════════════

	/**
	 * Configuration de la grille 4×4 (motif en cercle)
	 */
	grid: {
		columns: 4,
		rows: 4,
		positions: {
			x: [-1.5, -0.5, 0.5, 1.5],     // Positions horizontales (espacement 1.0)
			y: [0.5, 1.5, 2.5, 3.5]         // Positions verticales (espacement 1.0 - grille carrée)
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
		width: 0.2,
		height: 0.2,
		depth: 0.2
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
	noteRotationSpeed: 10,

	// ═══════════════════════════════════════════════════
	// CONTRÔLES
	// ═══════════════════════════════════════════════════

	/**
	 * Mapping des touches pour la grille 4×4 (motif en cercle)
	 * l3 (y=3): x, t, i, x
	 * l2 (y=2): r, x, x, o
	 * l1 (y=1): f, x, x, l
	 * l0 (y=0): x, g, k, x
	 */
	keyBindings: {
		// Ligne 0 (bas) - y=0: x, g, k, x
		'g': { x: 1, y: 0 },  // Colonne centre-gauche
		'k': { x: 2, y: 0 },  // Colonne centre-droite

		// Ligne 1 - y=1: f, x, x, l
		'f': { x: 0, y: 1 },  // Colonne gauche
		'l': { x: 3, y: 1 },  // Colonne droite

		// Ligne 2 - y=2: r, x, x, o
		'r': { x: 0, y: 2 },  // Colonne gauche
		'o': { x: 3, y: 2 },  // Colonne droite

		// Ligne 3 (haut) - y=3: x, t, i, x
		't': { x: 1, y: 3 },  // Colonne centre-gauche
		'i': { x: 2, y: 3 }   // Colonne centre-droite
	},

	// ═══════════════════════════════════════════════════
	// NAVIGATION UI (Menus / Modals)
	// ═══════════════════════════════════════════════════

	/**
	 * Boutons de navigation pour l'interface (borne d'arcade)
	 * Permet de mapper plusieurs touches à une même action
	 */
	navigationBindings: {
		// Navigation directionnelle
		up: ['z', 'arrowup'],           // Haut
		down: ['s', 'arrowdown'],       // Bas
		left: ['q', 'arrowleft'],       // Gauche
		right: ['d', 'arrowright'],     // Droite
		
		// Boutons d'action (arcade)
		validate: ['r', 'i'],           // A Button - Valider/Confirmer
		return: ['f', 'k'],             // B Button - Retour/Sélection alternative
		start: ['x', 'n'],              // X Button - Démarrer/Pause
		enter: ['y', 'p'],
		close: ['h', 'm'],
		
		// Alias pour cohérence
		confirm: ['r', 'i'],            // Même que validate
		cancel: ['f', 'k'],             // Même que select
		pause: ['x', 'n']               // Même que start
	},

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
	debugNotesCount: 5,

	// ═══════════════════════════════════════════════════
	// VIRAGES RYTHMIQUES
	// ═══════════════════════════════════════════════════

	/**
	 * Configuration du générateur de chemin rythmique
	 * Active les virages synchronisés avec les beats
	 */
	pathConfig: {
		/**
		 * Utiliser les beats musicaux (BPM) au lieu des notes du beatmap
		 * - true = virages synchronisés au BPM de la musique (recommandé)
		 * - false = virages basés sur les notes du beatmap
		 */
		useMusicalBeats: true,

		/**
		 * Amplitude latérale des virages (unités)
		 * Déplacement ajouté à chaque virage (cumulatif)
		 * - 0.5 = virages très subtils
		 * - 1.0 = virages légers (recommandé)
		 * - 1.5 = virages normaux
		 * - 2.0 = virages prononcés
		 */
		curveAmplitude: 1.0,

		/**
		 * Rayon de courbure (unités)
		 * Plus grand = virages plus doux
		 * - 10.0 = virages serrés
		 * - 15.0 = virages confortables
		 * - 20.0 = virages très doux (recommandé)
		 */
		curveRadius: 60.0,

		/**
		 * Fréquence des virages (tous les X beats)
		 * En mode musical: tous les X beats du BPM
		 * En mode notes: tous les X moments avec des notes
		 * - 4 = très fréquent
		 * - 8 = fréquence normale
		 * - 16 = espacés (recommandé)
		 * - 32 = très espacés
		 */
		curveFrequency: 16,

		/**
		 * Amplitude verticale (montées/descentes en unités)
		 * - 0.0 = désactivé (recommandé pour commencer)
		 * - 0.5 = variations très légères
		 * - 1.0 = variations légères
		 * - 1.5 = variations normales
		 */
		verticalAmplitude: 0.5,

		/**
		 * Distance entre points de contrôle (unités)
		 * - 5.0 = chemin très détaillé
		 * - 10.0 = normal (recommandé)
		 * - 15.0 = moins de détails
		 */
		segmentLength: 1.0
	}
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
