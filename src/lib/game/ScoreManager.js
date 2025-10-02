import { GameConfig } from './GameConfig.js';

/**
 * ScoreManager - Gère le système de score et de combos
 *
 * Responsabilités:
 * - Calculer et suivre le score total
 * - Gérer les combos (série de hits consécutifs)
 * - Comptabiliser les statistiques (perfect/great/good/miss)
 * - Fournir des callbacks pour l'UI
 */
export class ScoreManager {
	constructor(callbacks = {}) {
		this.callbacks = callbacks;

		// Score et statistiques
		this.score = 0;
		this.combo = 0;
		this.maxCombo = 0;

		// Compteurs par grade
		this.stats = {
			perfect: 0,
			great: 0,
			good: 0,
			miss: 0
		};

		// Multiplicateur de combo
		this.comboMultipliers = [
			{ threshold: 0, multiplier: 1.0 },    // 0-9: x1
			{ threshold: 10, multiplier: 1.2 },   // 10-19: x1.2
			{ threshold: 20, multiplier: 1.5 },   // 20-49: x1.5
			{ threshold: 50, multiplier: 2.0 },   // 50-99: x2
			{ threshold: 100, multiplier: 2.5 },  // 100+: x2.5
		];
	}

	/**
	 * Enregistrer un hit réussi avec son grade
	 * @param {string} grade - 'perfect', 'great', 'good'
	 */
	registerHit(grade) {
		// Incrémenter le compteur de ce grade
		this.stats[grade]++;

		// Incrémenter le combo
		this.combo++;
		if (this.combo > this.maxCombo) {
			this.maxCombo = this.combo;
		}

		// Calculer les points avec multiplicateur de combo
		const basePoints = GameConfig.scorePoints[grade];
		const multiplier = this.getComboMultiplier();
		const points = Math.floor(basePoints * multiplier);

		// Ajouter au score
		this.score += points;

		// Notifier l'UI
		if (this.callbacks.onScoreUpdate) {
			this.callbacks.onScoreUpdate({
				score: this.score,
				combo: this.combo,
				grade: grade,
				points: points,
				multiplier: multiplier
			});
		}

		if (this.callbacks.onComboUpdate) {
			this.callbacks.onComboUpdate(this.combo, multiplier);
		}
	}

	/**
	 * Enregistrer une note manquée
	 */
	registerMiss() {
		this.stats.miss++;

		// Réinitialiser le combo
		const previousCombo = this.combo;
		this.combo = 0;

		// Notifier l'UI
		if (this.callbacks.onComboBreak && previousCombo > 0) {
			this.callbacks.onComboBreak(previousCombo);
		}

		if (this.callbacks.onScoreUpdate) {
			this.callbacks.onScoreUpdate({
				score: this.score,
				combo: 0,
				grade: 'miss',
				points: 0,
				multiplier: 1.0
			});
		}
	}

	/**
	 * Obtenir le multiplicateur actuel basé sur le combo
	 * @returns {number} Multiplicateur (1.0 à 2.5)
	 */
	getComboMultiplier() {
		// Trouver le multiplicateur correspondant au combo actuel
		let multiplier = 1.0;
		for (const tier of this.comboMultipliers) {
			if (this.combo >= tier.threshold) {
				multiplier = tier.multiplier;
			}
		}
		return multiplier;
	}

	/**
	 * Calculer le pourcentage de précision
	 * @returns {number} Précision en % (0-100)
	 */
	getAccuracy() {
		const totalNotes = this.stats.perfect + this.stats.great + this.stats.good + this.stats.miss;
		if (totalNotes === 0) return 100;

		// Précision pondérée: perfect = 100%, great = 70%, good = 40%, miss = 0%
		const weightedHits = (this.stats.perfect * 100) + (this.stats.great * 70) + (this.stats.good * 40);
		const accuracy = weightedHits / totalNotes;

		return Math.round(accuracy * 100) / 100; // 2 décimales
	}

	/**
	 * Calculer le rang final (S, A, B, C, D, F)
	 * @returns {string} Rang
	 */
	getRank() {
		const accuracy = this.getAccuracy();

		if (accuracy >= 95 && this.stats.miss === 0) return 'S';
		if (accuracy >= 90) return 'A';
		if (accuracy >= 80) return 'B';
		if (accuracy >= 70) return 'C';
		if (accuracy >= 60) return 'D';
		return 'F';
	}

	/**
	 * Obtenir les statistiques complètes
	 * @returns {Object} Statistiques complètes
	 */
	getStats() {
		return {
			score: this.score,
			combo: this.combo,
			maxCombo: this.maxCombo,
			accuracy: this.getAccuracy(),
			rank: this.getRank(),
			notes: {
				perfect: this.stats.perfect,
				great: this.stats.great,
				good: this.stats.good,
				miss: this.stats.miss,
				total: this.stats.perfect + this.stats.great + this.stats.good + this.stats.miss
			}
		};
	}

	/**
	 * Réinitialiser le score (nouveau jeu)
	 */
	reset() {
		this.score = 0;
		this.combo = 0;
		this.maxCombo = 0;
		this.stats = {
			perfect: 0,
			great: 0,
			good: 0,
			miss: 0
		};

		if (this.callbacks.onScoreUpdate) {
			this.callbacks.onScoreUpdate({
				score: 0,
				combo: 0,
				grade: null,
				points: 0,
				multiplier: 1.0
			});
		}
	}
}
