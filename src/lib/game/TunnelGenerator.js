import { MeshBuilder, StandardMaterial, Color3, CreateGround, Vector3, Quaternion, Curve3 } from '@babylonjs/core';

/**
 * Génère et gère les segments du tunnel infini
 * Suit le chemin rythmique généré par PathGenerator
 */
export class TunnelGenerator {
	constructor(scene, cameraController) {
		this.scene = scene;
		this.cameraController = cameraController;
		this.segments = [];
		this.speed = 0.1;
		this.pathGenerator = null;

		// Optimisation: stocker les matériaux rail pour l'animation
		this.railMaterials = [];

		// Rails continus (tubes qui suivent le chemin)
		this.leftRailMesh = null;
		this.rightRailMesh = null;
		this.railMaterial = null;

		this.createInitialSegments();
	}

	/**
	 * Définit le générateur de chemin pour les virages rythmiques
	 */
	setPathGenerator(pathGenerator) {
		this.pathGenerator = pathGenerator;

		// Recréer les segments initiaux avec le nouveau chemin
		this.disposeSegments();
		this.createContinuousRails();
		this.createInitialSegments();
	}

	/**
	 * Crée des rails continus qui suivent le chemin
	 */
	createContinuousRails() {
		if (!this.pathGenerator) return;

		// Générer les points pour les rails gauche et droit
		const pathPoints = this.pathGenerator.getPoints();
		const leftRailPoints = [];
		const rightRailPoints = [];

		// Pour chaque point du chemin, calculer la position des rails
		for (let i = 0; i < pathPoints.length; i++) {
			const point = pathPoints[i];

			// Calculer la tangente locale
			let tangent;
			if (i < pathPoints.length - 1) {
				tangent = pathPoints[i + 1].subtract(point).normalize();
			} else {
				tangent = point.subtract(pathPoints[i - 1]).normalize();
			}

			// Vecteur perpendiculaire (droite)
			const right = new Vector3(-tangent.z, 0, tangent.x).normalize();

			// Positions des rails (1.5 unités de chaque côté)
			const leftPoint = point.add(right.scale(-1.5));
			const rightPoint = point.add(right.scale(1.5));

			leftRailPoints.push(leftPoint);
			rightRailPoints.push(rightPoint);
		}

		// Créer le matériau des rails
		this.railMaterial = new StandardMaterial('railMat', this.scene);
		this.railMaterial.emissiveColor = new Color3(1, 0.3, 0.8);
		this.railMaterial.diffuseColor = new Color3(0.5, 0.1, 0.4);
		this.railMaterials.push(this.railMaterial);

		// Créer les tubes pour les rails
		this.leftRailMesh = MeshBuilder.CreateTube('leftRailTube', {
			path: leftRailPoints,
			radius: 0.05,
			cap: MeshBuilder.CAP_ALL,
			updatable: true
		}, this.scene);
		this.leftRailMesh.material = this.railMaterial;

		this.rightRailMesh = MeshBuilder.CreateTube('rightRailTube', {
			path: rightRailPoints,
			radius: 0.05,
			cap: MeshBuilder.CAP_ALL,
			updatable: true
		}, this.scene);
		this.rightRailMesh.material = this.railMaterial;

		console.log('✅ Rails continus créés avec', leftRailPoints.length, 'points');
	}

	/**
	 * Dispose tous les segments
	 */
	disposeSegments() {
		this.segments.forEach(segment => {
			segment.meshes.forEach(mesh => mesh.dispose());
		});
		this.segments = [];
		this.railMaterials = [];

		// Disposer les rails continus
		if (this.leftRailMesh) {
			this.leftRailMesh.dispose();
			this.leftRailMesh = null;
		}
		if (this.rightRailMesh) {
			this.rightRailMesh.dispose();
			this.rightRailMesh = null;
		}
		if (this.railMaterial) {
			this.railMaterial.dispose();
			this.railMaterial = null;
		}
	}

	/**
	 * Crée les segments initiaux du tunnel
	 */
	createInitialSegments() {
		for (let i = 0; i < 20; i++) {
			this.createSegment(i * 10);
		}
	}

	/**
	 * Crée un segment de tunnel
	 */
	createSegment(zPosition) {
		const segment = {
			meshes: [],
			zPosition: zPosition,
			distance: zPosition // Distance sur le chemin
		};

		// Calculer la position et l'orientation basées sur le chemin
		let position, tangent;
		if (this.pathGenerator) {
			const pathData = this.pathGenerator.getPositionAtDistance(zPosition);
			position = pathData.position;
			tangent = pathData.tangent;
		} else {
			position = new Vector3(0, 0, zPosition);
			tangent = new Vector3(0, 0, 1);
		}

		// Sol du tunnel
		const ground = CreateGround('ground', { width: 8, height: 10 }, this.scene);
		ground.position.copyFrom(position);

		// Orienter le sol selon la tangente du chemin
		if (this.pathGenerator) {
			// Calculer la rotation pour aligner le sol avec la tangente
			const forward = new Vector3(0, 0, 1);
			const angle = Math.atan2(tangent.x, tangent.z);
			ground.rotation.y = angle;

			// Inclinaison verticale si nécessaire
			const horizontalLength = Math.sqrt(tangent.x * tangent.x + tangent.z * tangent.z);
			if (horizontalLength > 0) {
				ground.rotation.x = -Math.atan2(tangent.y, horizontalLength);
			}
		}

		const groundMaterial = new StandardMaterial('groundMat', this.scene);
		groundMaterial.diffuseColor = new Color3(0.2, 0.2, 0.8);
		groundMaterial.emissiveColor = new Color3(0.1, 0.1, 0.3);
		ground.material = groundMaterial;

		segment.meshes.push(ground);

		// Note: Les rails sont maintenant des tubes continus créés dans createContinuousRails()
		// On ne crée plus de segments de rails individuels

		// Anneaux décoratifs périodiques
		if (Math.floor(zPosition / 10) % 3 === 0) {
			const ring = MeshBuilder.CreateTorus('ring', { diameter: 6, thickness: 0.3 }, this.scene);
			ring.position.copyFrom(position);

			// Orienter l'anneau perpendiculairement au chemin
			if (this.pathGenerator) {
				ring.rotation.x = Math.PI / 2 + ground.rotation.x;
				ring.rotation.y = ground.rotation.y;
			} else {
				ring.rotation.x = Math.PI / 2;
			}

			const ringMaterial = new StandardMaterial('ringMat', this.scene);
			ringMaterial.emissiveColor = new Color3(0.8, 0.2, 1);
			ringMaterial.diffuseColor = new Color3(0.4, 0.1, 0.5);
			ring.material = ringMaterial;

			segment.meshes.push(ring);
		}

		this.segments.push(segment);
	}

	/**
	 * Met à jour les segments du tunnel
	 */
	update() {
		if (this.pathGenerator) {
			// Mode chemin rythmique : recycler les segments basés sur la distance caméra
			const cameraDistance = this.cameraController.getDistanceTraveled();

			this.segments.forEach(segment => {
				// Recycler les segments trop loin derrière
				if (segment.distance < cameraDistance - 50) {
					const maxDistance = Math.max(...this.segments.map(s => s.distance));
					const newDistance = maxDistance + 10;
					segment.distance = newDistance;

					// Recalculer la position et orientation pour ce segment
					const pathData = this.pathGenerator.getPositionAtDistance(newDistance);

					segment.meshes.forEach(mesh => {
						if (mesh.name.includes('ground')) {
							mesh.position.copyFrom(pathData.position);

							// Réorienter selon la tangente
							const tangent = pathData.tangent;
							const angle = Math.atan2(tangent.x, tangent.z);
							mesh.rotation.y = angle;

							const horizontalLength = Math.sqrt(tangent.x * tangent.x + tangent.z * tangent.z);
							if (horizontalLength > 0) {
								mesh.rotation.x = -Math.atan2(tangent.y, horizontalLength);
							}
						} else if (mesh.name.includes('ring')) {
							// Repositionner l'anneau
							mesh.position.copyFrom(pathData.position);

							const tangent = pathData.tangent;
							const angle = Math.atan2(tangent.x, tangent.z);
							mesh.rotation.y = angle;

							const horizontalLength = Math.sqrt(tangent.x * tangent.x + tangent.z * tangent.z);
							if (horizontalLength > 0) {
								mesh.rotation.x = Math.PI / 2 - Math.atan2(tangent.y, horizontalLength);
							}
						}
					});
				}
			});
		} else {
			// Mode classique : défilement linéaire
			const cameraZ = this.cameraController.getPositionZ();

			this.segments.forEach(segment => {
				segment.zPosition -= this.speed;
				segment.meshes.forEach(mesh => {
					mesh.position.z -= this.speed;
				});

				// Recycler les segments trop loin derrière
				if (segment.zPosition < cameraZ - 50) {
					const maxZ = Math.max(...this.segments.map(s => s.zPosition));
					segment.zPosition = maxZ + 10;
					segment.meshes.forEach(mesh => {
						mesh.position.z = segment.zPosition;
					});
				}
			});
		}
	}

	/**
	 * Animation des matériaux émissifs
	 * OPTIMISÉ: Ne modifie que les matériaux rail stockés, pas tous les matériaux de la scène
	 */
	updateMaterialsAnimation() {
		const time = performance.now() * 0.001;
		const pulse = Math.sin(time * 3) * 0.2 + 0.8;

		// Ne mettre à jour QUE les matériaux rail (20 au lieu de 1179+)
		this.railMaterials.forEach(material => {
			// Réutiliser le même objet Color3 au lieu d'en créer un nouveau
			material.emissiveColor.r = pulse;
			material.emissiveColor.g = 0.3 * pulse;
			material.emissiveColor.b = 0.8 * pulse;
		});
	}
}
