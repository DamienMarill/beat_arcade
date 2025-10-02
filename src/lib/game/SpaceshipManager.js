import { SceneLoader, Vector3, Animation, TransformNode } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

/**
 * Gère le vaisseau spatial au centre de la grille
 * Animation de vague lente haut-bas
 */
export class SpaceshipManager {
	constructor(scene, cameraController, gridHelper) {
		this.scene = scene;
		this.cameraController = cameraController;
		this.gridHelper = gridHelper;
		this.spaceshipContainer = null; // Conteneur pour contrôler position/rotation
		this.spaceshipModel = null; // Le modèle 3D lui-même
		this.basePosition = new Vector3(0, 2.0, 0); // Centre de la grille
		this.baseRotationY = Math.PI / 2; // Rotation de base du modèle (+90°)
		this.waveOffset = 0;
		this.waveSpeed = 0.02; // Vitesse de l'animation de vague
		this.waveAmplitude = 0.05; // Amplitude en unités réduite

		// Position cible pour le déplacement (offset local par rapport au centre)
		this.targetOffset = new Vector3(0, 0, 0); // Commence au centre
		this.currentOffset = new Vector3(0, 0, 0);
		this.moveSpeed = 0.15; // Vitesse d'interpolation (0-1, plus c'est élevé plus c'est rapide)

		// Suivi des touches actives pour gérer les notes multiples
		this.activeInputs = new Map(); // gridX_gridY -> timestamp
		this.inputTimeout = 200; // ms - durée pendant laquelle un input reste actif

		// Rotation pour l'effet de banking (inclinaison dans les virages)
		this.tiltAngle = 0; // Angle d'inclinaison actuel (radians)
		this.maxTiltAngle = Math.PI / 8; // Inclinaison max (22.5°)
	}

	/**
	 * Charge le modèle 3D du vaisseau
	 */
	async loadSpaceship() {
		try {
			const result = await SceneLoader.ImportMeshAsync(
				'',
				'/models/',
				'spaceship.glb',
				this.scene
			);

			if (result.meshes.length > 0) {
				console.log('🔍 Meshes chargés:', result.meshes.length);
				result.meshes.forEach((mesh, i) => {
					console.log(`  [${i}] ${mesh.name} - Rotation Y: ${mesh.rotation.y}`);
				});

				// Créer un conteneur parent pour contrôler position et rotation dynamique
				this.spaceshipContainer = new TransformNode('spaceshipContainer', this.scene);
				this.spaceshipContainer.position.copyFrom(this.basePosition);

				// Le modèle root
				this.spaceshipModel = result.meshes[0];
				this.spaceshipModel.parent = this.spaceshipContainer;

				// Pas besoin d'appliquer la rotation aux meshes individuellement
				// L'offset sera appliqué au container dans update()
				console.log('🔄 Offset de rotation configuré:', this.baseRotationY, 'radians (', (this.baseRotationY * 180 / Math.PI), '°)');

				// Échelle pour largeur de 0.7
				const boundingBox = this.spaceshipModel.getHierarchyBoundingVectors();
				const currentWidth = boundingBox.max.x - boundingBox.min.x;
				const targetWidth = 0.7;
				const scale = targetWidth / currentWidth;
				this.spaceshipModel.scaling.setAll(scale);

				console.log('✅ Vaisseau chargé et positionné au centre de la grille');
			}
		} catch (error) {
			console.error('❌ Erreur chargement spaceship.glb:', error);
		}
	}

	/**
	 * Mappe une position de grille active (8 positions du cercle) vers les 4 cases centrales
	 * Grille 4x4 avec cercle :
	 * - Positions actives (8): coins et centres des bords
	 * - Cases centrales (4): milieu de la grille (x=1,2 y=1,2)
	 */
	mapToCentralSquare(gridX, gridY) {
		// Mapping des 8 positions actives vers les 4 cases centrales
		// Les positions actives sont réparties en cercle, on les mappe vers le centre

		// Ligne 0 (bas): g(1,0), k(2,0) → vers bas du centre
		// Ligne 1: f(0,1), l(3,1) → vers milieu
		// Ligne 2: r(0,2), o(3,2) → vers milieu
		// Ligne 3 (haut): t(1,3), i(2,3) → vers haut du centre

		let centralX, centralY;

		// Mapping horizontal : gauche->1, droite->2
		centralX = gridX <= 1 ? 1 : 2;

		// Mapping vertical : bas->1, haut->2
		centralY = gridY <= 1 ? 1 : 2;

		return { x: centralX, y: centralY };
	}

	/**
	 * Déplace le vaisseau vers une position de grille (ou moyenne de plusieurs)
	 * @param {number} gridX - Position X de la grille (0-3)
	 * @param {number} gridY - Position Y de la grille (0-3)
	 */
	moveToGridPosition(gridX, gridY) {
		if (!this.gridHelper) return;

		// Ajouter cet input aux inputs actifs
		const key = `${gridX}_${gridY}`;
		this.activeInputs.set(key, performance.now());

		// Nettoyer les inputs trop anciens
		const now = performance.now();
		for (const [k, timestamp] of this.activeInputs) {
			if (now - timestamp > this.inputTimeout) {
				this.activeInputs.delete(k);
			}
		}

		// Calculer la position moyenne de tous les inputs actifs
		let sumX = 0, sumY = 0;
		let count = 0;

		for (const k of this.activeInputs.keys()) {
			const [x, y] = k.split('_').map(Number);
			// Mapper vers case centrale
			const central = this.mapToCentralSquare(x, y);
			sumX += central.x;
			sumY += central.y;
			count++;
		}

		if (count > 0) {
			const avgX = sumX / count;
			const avgY = sumY / count;

			console.log('🎯 Position moyenne:', avgX, avgY, '(count:', count, ')');

			// Les positions centrales sont 1 et 2, on veut des offsets autour de 0
			// x=1.5 (centre) → offset 0
			// x=1.0 → offset -0.5
			// x=2.0 → offset +0.5
			const centerX = 1.5;
			const centerY = 1.5;

			// Espacement de la grille (1.0 unité entre chaque case)
			const spacing = 1.0;

			const offsetX = (avgX - centerX) * spacing;
			const offsetY = (avgY - centerY) * spacing;

			console.log('📍 Offset calculé:', offsetX, offsetY);

			this.targetOffset.set(offsetX, offsetY, 0);
		}
	}

	/**
	 * Met à jour la position du vaisseau (animation de vague + suivi caméra + déplacement inputs)
	 */
	update() {
		if (!this.spaceshipContainer) return;

		// Calculer la vitesse de déplacement (pour l'effet de banking)
		const velocityX = (this.targetOffset.x - this.currentOffset.x) * this.moveSpeed;
		const velocityY = (this.targetOffset.y - this.currentOffset.y) * this.moveSpeed;

		// Interpolation smooth vers la position cible
		this.currentOffset.x += velocityX;
		this.currentOffset.y += velocityY;

		// Calculer l'angle d'inclinaison basé sur la vitesse horizontale
		// Négatif car on veut s'incliner dans la direction du mouvement
		const targetTiltAngle = -velocityX * 15; // Multiplier par un facteur pour amplifier l'effet
		const clampedTiltAngle = Math.max(-this.maxTiltAngle, Math.min(this.maxTiltAngle, targetTiltAngle));

		// Interpolation smooth de l'angle d'inclinaison
		this.tiltAngle += (clampedTiltAngle - this.tiltAngle) * 0.2;

		// Animation de vague sinusoïdale lente
		this.waveOffset += this.waveSpeed;
		const yOffset = Math.sin(this.waveOffset) * this.waveAmplitude;

		// Position devant la caméra au centre de la grille
		if (this.cameraController) {
			const camera = this.cameraController.getCamera();
			const cameraForward = camera.getDirection(new Vector3(0, 0, 1));
			const cameraRight = camera.getDirection(new Vector3(1, 0, 0));
			const cameraUp = camera.getDirection(new Vector3(0, 1, 0));

			// Position centrale de la grille: x=0, y=2.0, offsetZ devant la caméra
			const offsetZ = 5; // Distance devant caméra (même que GridHelper.offsetZ)
			const centerPos = camera.position.add(cameraForward.scale(offsetZ));

			// Appliquer les offsets dans le repère local de la caméra
			const finalPos = centerPos
				.add(cameraRight.scale(this.currentOffset.x)) // Offset horizontal
				.add(cameraUp.scale(this.currentOffset.y + yOffset)); // Offset vertical + vague

			this.spaceshipContainer.position.copyFrom(finalPos);

			// Orienter le CONTENEUR dans la direction de la caméra + offset de rotation du modèle
			this.spaceshipContainer.rotation.y = Math.atan2(cameraForward.x, cameraForward.z) + this.baseRotationY;

			// Appliquer l'inclinaison (banking) sur l'axe Z (roulis)
			this.spaceshipContainer.rotation.z = this.tiltAngle;

			// Légère inclinaison avant/arrière basée sur le mouvement vertical
			this.spaceshipContainer.rotation.x = velocityY * 5;
		} else {
			// Fallback: position fixe avec vague et offset
			this.spaceshipContainer.position.set(
				this.basePosition.x + this.currentOffset.x,
				this.basePosition.y + this.currentOffset.y + yOffset,
				this.basePosition.z
			);

			// Appliquer l'inclinaison même en fallback
			this.spaceshipContainer.rotation.z = this.tiltAngle;
			this.spaceshipContainer.rotation.x = velocityY * 5;
		}
	}

	/**
	 * Nettoie les ressources
	 */
	dispose() {
		if (this.spaceshipModel) {
			this.spaceshipModel.dispose();
			this.spaceshipModel = null;
		}
		if (this.spaceshipContainer) {
			this.spaceshipContainer.dispose();
			this.spaceshipContainer = null;
		}
	}
}
