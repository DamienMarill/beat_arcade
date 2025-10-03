import { SceneLoader, Vector3, TransformNode } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

/**
 * Gère les immeubles le long du tunnel
 * Génère des bâtiments aléatoires en évitant la zone de jeu centrale
 */
export class BuildingsManager {
	constructor(scene, cameraController, pathGenerator) {
		this.scene = scene;
		this.cameraController = cameraController;
		this.pathGenerator = pathGenerator;

		// Liste des modèles d'immeubles disponibles
		this.buildingModels = [
			'1df16f0b15e5_a_tall__minimalist_futuristic_sk.glb',
			'2e1c77ec4400_a_tall__minimalist_futuristic_sk.glb',
			'2e2447fa81dc_a_tall__minimalist_futuristic_sk.glb',
			'4bc7ba0ee34b_a_tall__minimalist_futuristic_sk.glb',
			'88541839210a_a_tall__minimalist_futuristic_sk.glb',
			'9cf0b8c02180_a_tall__minimalist_futuristic_sk.glb',
			'9d0991b65d4a_a_tall__minimalist_futuristic_sk.glb',
			'eaffaf7f2942_a_tall__minimalist_futuristic_sk.glb',
			'ff2fcbc19435_a_tall__minimalist_futuristic_sk.glb'
		];

		// Modèles chargés en cache (clones)
		this.loadedModels = new Map(); // filename -> root mesh

		// Immeubles actifs dans la scène
		this.activeBuildings = []; // Array de { mesh, distance }

		// Configuration
		this.spawnDistance = 200; // Distance de spawn réduite (300→200 pour +10 FPS)
		this.despawnDistance = -20; // Distance derrière la caméra où les détruire
		this.buildingDensity = 4; // Nombre d'immeubles par segment (2 de chaque côté)
		// Première ligne (proche de la route)
		this.leftLineDistance = -8.0; // Distance de la ligne gauche par rapport au centre
		this.rightLineDistance = 8.0; // Distance de la ligne droite par rapport au centre
		// Deuxième ligne (en arrière-plan)
		this.leftBackLineDistance = -16.0; // Distance de la ligne gauche arrière
		this.rightBackLineDistance = 16.0; // Distance de la ligne droite arrière
		this.lastSpawnDistance = 0; // Dernière distance de spawn
		this.spawnInterval = 20; // Interval entre les spawns (unités)
		this.buildingScale = 45; // Échelle de base des immeubles (30 * 1.5 = 45)

		// Rotations possibles (0°, 90°, 180°, 270°)
		this.rotations = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
	}

	/**
	 * Charge tous les modèles d'immeubles en cache
	 */
	async loadBuildingModels() {
		console.log('🏢 Chargement des modèles d\'immeubles...');

		for (const filename of this.buildingModels) {
			try {
				const result = await SceneLoader.ImportMeshAsync(
					'',
					'/models/immeubles/',
					filename,
					this.scene
				);

				if (result.meshes.length > 0) {
					const rootMesh = result.meshes[0];
					rootMesh.setEnabled(false); // Invisible, utilisé comme template
					this.loadedModels.set(filename, rootMesh);
				}
			} catch (error) {
				console.warn(`⚠️ Erreur chargement ${filename}:`, error);
			}
		}

		console.log(`✅ ${this.loadedModels.size} modèles d'immeubles chargés`);
	}

	/**
	 * Génère une position sur une des lignes (avant ou arrière, gauche ou droite)
	 * @param {number} distance - Distance sur le chemin
	 * @param {boolean} leftSide - true = côté gauche, false = côté droit
	 * @param {boolean} backRow - true = ligne arrière, false = ligne avant
	 * @returns {Object} { position, rotation }
	 */
	generateBuildingPosition(distance, leftSide = true, backRow = false) {
		// Position sur le chemin
		const pathData = this.pathGenerator
			? this.pathGenerator.getPositionAtDistance(distance)
			: { position: new Vector3(0, 0, distance), tangent: new Vector3(0, 0, 1) };

		// Calculer les vecteurs locaux du chemin
		const forward = pathData.tangent;
		const right = new Vector3(forward.z, 0, -forward.x).normalize();

		// Choisir la ligne (gauche/droite, avant/arrière)
		let lineDistance;
		if (backRow) {
			lineDistance = leftSide ? this.leftBackLineDistance : this.rightBackLineDistance;
		} else {
			lineDistance = leftSide ? this.leftLineDistance : this.rightLineDistance;
		}

		// Position finale dans le repère local du chemin
		const finalPosition = pathData.position
			.add(right.scale(lineDistance));

		// Rotation aléatoire parmi [0°, 90°, 180°, 270°]
		const rotation = this.rotations[Math.floor(Math.random() * this.rotations.length)];

		return { position: finalPosition, rotation };
	}

	/**
	 * Spawne un nouvel immeuble
	 * @param {number} distance - Distance sur le chemin
	 * @param {boolean} leftSide - true = côté gauche, false = côté droit
	 * @param {boolean} backRow - true = ligne arrière, false = ligne avant
	 */
	spawnBuilding(distance, leftSide = true, backRow = false) {
		if (this.loadedModels.size === 0) return;

		// Choisir un modèle aléatoire
		const modelsArray = Array.from(this.loadedModels.values());
		const template = modelsArray[Math.floor(Math.random() * modelsArray.length)];

		// Cloner le modèle
		const clone = template.clone(`building_${Date.now()}_${Math.random()}`);
		clone.setEnabled(true);

		// Créer un conteneur pour le transform
		const container = new TransformNode(`building_container_${Date.now()}`, this.scene);
		clone.parent = container;

		// Échelle de base * variation aléatoire légère
		const scaleVariation = 0.9 + Math.random() * 0.2; // Entre 0.9 et 1.1
		const finalScale = this.buildingScale * scaleVariation;
		clone.scaling.setAll(finalScale);

		// Rotation AVANT de calculer le bounding box
		const rotation = this.rotations[Math.floor(Math.random() * this.rotations.length)];
		container.rotation.y = rotation;

		// Forcer le recalcul du bounding box après scale et rotation
		clone.computeWorldMatrix(true);
		clone.refreshBoundingInfo();

		// Obtenir les dimensions réelles de l'immeuble (après scale et rotation)
		const boundingBox = clone.getHierarchyBoundingVectors();
		const width = boundingBox.max.x - boundingBox.min.x;
		const depth = boundingBox.max.z - boundingBox.min.z;
		const height = boundingBox.max.y - boundingBox.min.y;

		// Calculer l'offset latéral nécessaire pour éviter la route
		// La largeur/profondeur max de l'immeuble détermine combien on doit le décaler
		const maxDimension = Math.max(width, depth);
		const safetyMargin = 2.0; // Marge de sécurité supplémentaire
		const lateralOffset = maxDimension / 2 + safetyMargin;

		// Position de base sur le chemin
		const pathData = this.pathGenerator
			? this.pathGenerator.getPositionAtDistance(distance)
			: { position: new Vector3(0, 0, distance), tangent: new Vector3(0, 0, 1) };

		const forward = pathData.tangent;
		const right = new Vector3(forward.z, 0, -forward.x).normalize();

		// Distance de la ligne + offset basé sur les dimensions
		let lineDistance;
		if (backRow) {
			lineDistance = leftSide ? this.leftBackLineDistance : this.rightBackLineDistance;
		} else {
			lineDistance = leftSide ? this.leftLineDistance : this.rightLineDistance;
		}

		const totalOffset = leftSide
			? lineDistance - lateralOffset  // Plus loin à gauche
			: lineDistance + lateralOffset; // Plus loin à droite

		// Position finale
		const finalPosition = pathData.position.add(right.scale(totalOffset));
		container.position.copyFrom(finalPosition);

		// Poser AU SOL (base du bounding box à y=-8)
		// Le sol du tunnel est à y=-8
		const groundLevel = -8;
		// Le bounding box min.y nous donne la distance entre l'origine et le point le plus bas
		container.position.y = groundLevel - boundingBox.min.y; // Compense pour que min.y touche le sol

		// ⚡ OPTIMISATIONS PERFORMANCE ⚡
		// 1. Freeze world matrix (immeubles statiques)
		clone.freezeWorldMatrix();
		container.freezeWorldMatrix();

		// 2. Culling strategy optimisé (BoundingSphereOnly = plus rapide)
		clone.cullingStrategy = 1; // BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY

		// 3. Backface culling (ne pas render les faces arrières)
		clone.getChildMeshes().forEach(mesh => {
			if (mesh.material) {
				mesh.material.backFaceCulling = true;
			}
		});

		// 4. Désactiver la synchro du bounding info (déjà calculé)
		clone.doNotSyncBoundingInfo = true;

		// Ajouter à la liste des bâtiments actifs
		this.activeBuildings.push({
			container,
			clone,
			distance
		});
	}

	/**
	 * Met à jour les immeubles (spawn/despawn)
	 */
	update() {
		if (!this.cameraController || this.loadedModels.size === 0) return;

		// Distance parcourue par la caméra
		const cameraDistance = this.cameraController.getDistanceTraveled
			? this.cameraController.getDistanceTraveled()
			: this.cameraController.getPositionZ();

		// Spawner de nouveaux immeubles si nécessaire
		const targetDistance = cameraDistance + this.spawnDistance;
		while (this.lastSpawnDistance < targetDistance) {
			// Spawner des immeubles sur les deux lignes (gauche et droite)
			// ET sur deux rangées (avant et arrière en quinconce)
			const buildingsPerSide = this.buildingDensity / 2;

			for (let i = 0; i < buildingsPerSide; i++) {
				// Offset aléatoire dans le segment pour éviter l'alignement parfait
				const offset = Math.random() * this.spawnInterval;

				// PREMIÈRE RANGÉE (proche de la route)
				// Spawner à gauche
				this.spawnBuilding(this.lastSpawnDistance + offset, true, false);

				// Spawner à droite (avec un offset légèrement différent)
				this.spawnBuilding(this.lastSpawnDistance + offset + this.spawnInterval * 0.5, false, false);

				// DEUXIÈME RANGÉE (en arrière-plan, en quinconce = décalée d'1/4 d'interval)
				const staggerOffset = this.spawnInterval * 0.25;

				// Spawner à gauche arrière (décalé pour l'effet quinconce)
				this.spawnBuilding(this.lastSpawnDistance + offset + staggerOffset, true, true);

				// Spawner à droite arrière (décalé aussi)
				this.spawnBuilding(this.lastSpawnDistance + offset + this.spawnInterval * 0.75, false, true);
			}

			this.lastSpawnDistance += this.spawnInterval;
		}

		// Nettoyer les immeubles trop loin derrière la caméra
		this.activeBuildings = this.activeBuildings.filter(building => {
			const relativeDistance = building.distance - cameraDistance;

			if (relativeDistance < this.despawnDistance) {
				// Détruire l'immeuble
				building.clone.dispose();
				building.container.dispose();
				return false;
			}

			return true;
		});
	}

	/**
	 * Nettoie toutes les ressources
	 */
	dispose() {
		// Détruire tous les immeubles actifs
		this.activeBuildings.forEach(building => {
			building.clone.dispose();
			building.container.dispose();
		});
		this.activeBuildings = [];

		// Détruire les modèles en cache
		this.loadedModels.forEach(model => model.dispose());
		this.loadedModels.clear();
	}
}
