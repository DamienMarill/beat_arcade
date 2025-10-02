import { Vector3, Curve3 } from '@babylonjs/core';

/**
 * Génère des rails rythmiques basés sur les beats de la musique
 * Crée une courbe 3D que la caméra et le tunnel vont suivre
 */
export class PathGenerator {
	constructor(gameplayData, config = {}) {
		this.gameplayData = gameplayData;

		// Configuration des virages
		this.config = {
			// Amplitude des virages (distance latérale max)
			curveAmplitude: config.curveAmplitude || 3.0,
			// Rayon des virages (plus grand = plus doux)
			curveRadius: config.curveRadius || 15.0,
			// Fréquence des virages (tous les X beats)
			curveFrequency: config.curveFrequency || 4,
			// Amplitude verticale (montées/descentes)
			verticalAmplitude: config.verticalAmplitude || 1.5,
			// Distance entre les points de contrôle
			segmentLength: config.segmentLength || 10.0,
			...config
		};

		// Stocker les points du chemin
		this.pathPoints = [];
		this.curve = null;
		this.totalLength = 0;

		this.generatePath();
	}

	/**
	 * Génère le chemin complet basé sur les beats
	 */
	generatePath() {
		if (!this.gameplayData || !this.gameplayData.notes) {
			console.warn('⚠️ Pas de données de gameplay pour générer le chemin');
			this.generateStraightPath();
			return;
		}

		const points = [];
		const beats = this.extractBeats();

		// Point de départ
		points.push(new Vector3(0, 2, 0));

		let currentZ = 0;
		let currentX = 0;
		let currentY = 2;
		let curveDirection = 1; // 1 = droite, -1 = gauche
		let verticalDirection = 1; // 1 = haut, -1 = bas

		// Générer les points de contrôle basés sur les beats
		for (let i = 0; i < beats.length; i++) {
			const beat = beats[i];
			const beatTime = beat.time;

			// Calculer la position Z basée sur le temps
			// On avance de 10 unités par seconde (ajustable)
			const zIncrement = this.config.segmentLength;
			currentZ += zIncrement;

			// Créer un virage tous les N beats
			if (i % this.config.curveFrequency === 0 && i > 0) {
				// Alterner la direction
				curveDirection *= -1;

				// Calculer la nouvelle position X (virage)
				const targetX = curveDirection * this.config.curveAmplitude;

				// Créer plusieurs points pour une courbe fluide (Bézier)
				const midZ = currentZ - zIncrement / 2;
				const midX = (currentX + targetX) / 2;

				// Point de contrôle intermédiaire pour la courbe
				points.push(new Vector3(midX, currentY, midZ));

				currentX = targetX;
			}

			// Variation verticale occasionnelle
			if (i % (this.config.curveFrequency * 2) === 0 && i > 0) {
				verticalDirection *= -1;
				currentY = 2 + (verticalDirection * this.config.verticalAmplitude);
			}

			// Ajouter le point principal
			points.push(new Vector3(currentX, currentY, currentZ));
		}

		// Ajouter des points finaux pour continuer après la dernière note
		for (let i = 0; i < 10; i++) {
			currentZ += this.config.segmentLength;
			points.push(new Vector3(currentX, currentY, currentZ));
		}

		this.pathPoints = points;

		// Créer une courbe de Catmull-Rom pour un chemin fluide
		this.curve = Curve3.CreateCatmullRomSpline(points, 32, false);
		this.totalLength = this.calculatePathLength();

		console.log(`✅ Chemin généré: ${points.length} points de contrôle, ${this.curve.getPoints().length} points interpolés`);
	}

	/**
	 * Génère un chemin droit (fallback)
	 */
	generateStraightPath() {
		const points = [];

		// Créer un chemin droit simple
		for (let i = 0; i < 100; i++) {
			points.push(new Vector3(0, 2, i * 10));
		}

		this.pathPoints = points;
		this.curve = Curve3.CreateCatmullRomSpline(points, 32, false);
		this.totalLength = this.calculatePathLength();
	}

	/**
	 * Extrait les beats uniques du gameplay data
	 */
	extractBeats() {
		if (!this.gameplayData || !this.gameplayData.notes) {
			return [];
		}

		// Grouper les notes par temps pour avoir les beats
		const beatTimes = new Set();
		this.gameplayData.notes.forEach(note => {
			beatTimes.add(note.time);
		});

		// Convertir en tableau trié
		const beats = Array.from(beatTimes).sort((a, b) => a - b);

		return beats.map(time => ({ time }));
	}

	/**
	 * Calcule la longueur totale du chemin
	 */
	calculatePathLength() {
		if (!this.curve) return 0;

		const points = this.curve.getPoints();
		let length = 0;

		for (let i = 1; i < points.length; i++) {
			length += Vector3.Distance(points[i - 1], points[i]);
		}

		return length;
	}

	/**
	 * Obtient la position sur le chemin à une distance donnée
	 * @param {number} distance - Distance depuis le début du chemin
	 * @returns {Object} { position: Vector3, tangent: Vector3, normal: Vector3 }
	 */
	getPositionAtDistance(distance) {
		if (!this.curve) {
			return {
				position: new Vector3(0, 2, distance),
				tangent: new Vector3(0, 0, 1),
				normal: new Vector3(0, 1, 0)
			};
		}

		const points = this.curve.getPoints();

		// Trouver le segment correspondant à cette distance
		let accumulatedDistance = 0;
		let segmentIndex = 0;

		for (let i = 1; i < points.length; i++) {
			const segmentLength = Vector3.Distance(points[i - 1], points[i]);

			if (accumulatedDistance + segmentLength >= distance) {
				segmentIndex = i - 1;
				break;
			}

			accumulatedDistance += segmentLength;
		}

		// Interpoler entre les deux points
		const p1 = points[segmentIndex];
		const p2 = points[Math.min(segmentIndex + 1, points.length - 1)];
		const segmentLength = Vector3.Distance(p1, p2);
		const t = segmentLength > 0 ? (distance - accumulatedDistance) / segmentLength : 0;

		const position = Vector3.Lerp(p1, p2, t);

		// Calculer la tangente (direction du mouvement)
		const tangent = p2.subtract(p1).normalize();

		// Calculer la normale (direction "up" locale)
		// Pour l'instant, on garde Y comme up
		const normal = new Vector3(0, 1, 0);

		return { position, tangent, normal };
	}

	/**
	 * Obtient la position à un temps donné
	 * @param {number} time - Temps en secondes
	 * @param {number} speed - Vitesse de déplacement
	 */
	getPositionAtTime(time, speed = 0.1) {
		// Convertir le temps en distance parcourue
		const distance = time * speed * 60; // speed par frame * 60 fps
		return this.getPositionAtDistance(distance);
	}

	/**
	 * Retourne la courbe complète
	 */
	getCurve() {
		return this.curve;
	}

	/**
	 * Retourne tous les points du chemin
	 */
	getPoints() {
		return this.curve ? this.curve.getPoints() : this.pathPoints;
	}

	/**
	 * Debug : affiche le chemin dans la scène
	 */
	debugDrawPath(scene) {
		if (!this.curve) return;

		const { CreateLines, Color3 } = require('@babylonjs/core');

		const points = this.curve.getPoints();
		const pathLine = CreateLines('pathDebug', { points }, scene);
		pathLine.color = new Color3(1, 1, 0); // Jaune

		return pathLine;
	}
}
