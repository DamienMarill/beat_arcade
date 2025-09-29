import { MeshBuilder, StandardMaterial, Color3, CreateGround } from '@babylonjs/core';

/**
 * Génère et gère les segments du tunnel infini
 */
export class TunnelGenerator {
	constructor(scene, cameraController) {
		this.scene = scene;
		this.cameraController = cameraController;
		this.segments = [];
		this.speed = 0.1;

		this.createInitialSegments();
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
			zPosition: zPosition
		};

		// Sol du tunnel
		const ground = CreateGround('ground', { width: 8, height: 10 }, this.scene);
		ground.position.z = zPosition;
		ground.position.y = 0;

		const groundMaterial = new StandardMaterial('groundMat', this.scene);
		groundMaterial.diffuseColor = new Color3(0.2, 0.2, 0.8);
		groundMaterial.emissiveColor = new Color3(0.1, 0.1, 0.3);
		ground.material = groundMaterial;

		segment.meshes.push(ground);

		// Murs du tunnel
		const leftWall = MeshBuilder.CreateBox('leftWall', { width: 0.2, height: 6, depth: 10 }, this.scene);
		leftWall.position.set(-4, 3, zPosition);

		const rightWall = MeshBuilder.CreateBox('rightWall', { width: 0.2, height: 6, depth: 10 }, this.scene);
		rightWall.position.set(4, 3, zPosition);

		const wallMaterial = new StandardMaterial('wallMat', this.scene);
		wallMaterial.diffuseColor = new Color3(0.1, 0.1, 0.1);
		wallMaterial.emissiveColor = new Color3(0, 0.5, 1);

		leftWall.material = wallMaterial;
		rightWall.material = wallMaterial;

		segment.meshes.push(leftWall, rightWall);

		// Rails lumineux au sol
		const leftRail = MeshBuilder.CreateBox('leftRail', { width: 0.1, height: 0.1, depth: 10 }, this.scene);
		leftRail.position.set(-1.5, 0.05, zPosition);

		const rightRail = MeshBuilder.CreateBox('rightRail', { width: 0.1, height: 0.1, depth: 10 }, this.scene);
		rightRail.position.set(1.5, 0.05, zPosition);

		const railMaterial = new StandardMaterial('railMat', this.scene);
		railMaterial.emissiveColor = new Color3(1, 0.3, 0.8);
		railMaterial.diffuseColor = new Color3(0.5, 0.1, 0.4);

		leftRail.material = railMaterial;
		rightRail.material = railMaterial;

		segment.meshes.push(leftRail, rightRail);

		// Anneaux décoratifs périodiques
		if (Math.floor(zPosition / 10) % 3 === 0) {
			const ring = MeshBuilder.CreateTorus('ring', { diameter: 6, thickness: 0.3 }, this.scene);
			ring.position.set(0, 3, zPosition);
			ring.rotation.x = Math.PI / 2;

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

	/**
	 * Animation des matériaux émissifs
	 */
	updateMaterialsAnimation() {
		const time = performance.now() * 0.001;
		const pulse = Math.sin(time * 3) * 0.2 + 0.8;

		this.scene.materials.forEach(material => {
			if (material.emissiveColor && material.name.includes('rail')) {
				material.emissiveColor = new Color3(pulse, 0.3 * pulse, 0.8 * pulse);
			}
		});
	}
}