import { Engine, Scene, FreeCamera, Vector3, HemisphericLight, MeshBuilder, StandardMaterial, Color3, Animation, Texture, CreateGround } from '@babylonjs/core';

class BeatBornerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.engine = new Engine(this.canvas, true);
        this.scene = null;
        this.camera = null;
        this.tunnelSegments = [];
        this.speed = 0.1;

        this.init();
    }

    async init() {
        this.createScene();
        this.createCamera();
        this.createLighting();
        this.createTunnel();
        this.setupRenderLoop();
        this.handleResize();

        // Masquer l'écran de chargement
        document.getElementById('loadingScreen').style.display = 'none';
    }

    createScene() {
        this.scene = new Scene(this.engine);
        this.scene.registerBeforeRender(() => this.update());
    }

    createCamera() {
        this.camera = new FreeCamera('camera', new Vector3(0, 2, -10), this.scene);
        this.camera.setTarget(new Vector3(0, 2, 0));
        this.camera.attachToCanvas(this.canvas, true);

        // Empêcher le contrôle manuel de la caméra pour l'arcade
        this.camera.inputs.clear();
    }

    createLighting() {
        // Lumière ambiante
        const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;
        light.diffuse = new Color3(0.8, 0.9, 1);
    }

    createTunnel() {
        // Créer plusieurs segments de tunnel pour l'effet infini
        for (let i = 0; i < 20; i++) {
            this.createTunnelSegment(i * 10);
        }
    }

    createTunnelSegment(zPosition) {
        const segment = {
            meshes: [],
            zPosition: zPosition
        };

        // Sol du tunnel avec motif en damier
        const ground = CreateGround('ground', { width: 8, height: 10 }, this.scene);
        ground.position.z = zPosition;
        ground.position.y = 0;

        const groundMaterial = new StandardMaterial('groundMat', this.scene);
        groundMaterial.diffuseColor = new Color3(0.2, 0.2, 0.8);
        groundMaterial.emissiveColor = new Color3(0.1, 0.1, 0.3);

        // Créer un motif de damier en UV
        const groundTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABYSURBVBiVY/z//z8DAwMDw38GBgYGJgYGhv8MDAwMjAwMDP8ZGBgYmBgYGP4zMDAwMDIwMPxnYGBgYGJgYPjPwMDAwMjAwPCfgYGBgYmBgeE/AwMDgyADAwMAGxMKAOr8CQIAAAAASUVORK5CYII=', this.scene);
        groundTexture.uScale = 4;
        groundTexture.vScale = 2;
        groundMaterial.diffuseTexture = groundTexture;
        ground.material = groundMaterial;

        segment.meshes.push(ground);

        // Murs du tunnel avec des lignes lumineuses
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

        // Guides lumineux au sol (rails)
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

        this.tunnelSegments.push(segment);
    }

    update() {
        // Mouvement de la caméra vers l'avant
        this.camera.position.z += this.speed;

        // Faire défiler les segments du tunnel
        this.tunnelSegments.forEach(segment => {
            segment.zPosition -= this.speed;
            segment.meshes.forEach(mesh => {
                mesh.position.z -= this.speed;
            });

            // Si un segment est trop loin derrière, le recycler devant
            if (segment.zPosition < this.camera.position.z - 50) {
                const maxZ = Math.max(...this.tunnelSegments.map(s => s.zPosition));
                segment.zPosition = maxZ + 10;
                segment.meshes.forEach(mesh => {
                    mesh.position.z = segment.zPosition;
                });
            }
        });

        // Animation des matériaux émissifs pour l'effet "pulse"
        const time = this.engine.getTimeInMilliseconds() * 0.001;
        const pulse = Math.sin(time * 3) * 0.2 + 0.8;

        this.scene.materials.forEach(material => {
            if (material.emissiveColor && material.name.includes('rail')) {
                material.emissiveColor = new Color3(pulse, 0.3 * pulse, 0.8 * pulse);
            }
        });
    }

    setupRenderLoop() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    handleResize() {
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }
}

// Initialiser le jeu quand la page est chargée
window.addEventListener('DOMContentLoaded', () => {
    new BeatBornerGame();
});