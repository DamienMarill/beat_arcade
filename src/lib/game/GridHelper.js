/**
 * Helper pour visualiser et gérer la grille 4x2 dans le jeu
 * Gère l'affichage des guides et la validation des positions
 */
import { MeshBuilder, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';

export class GridHelper {
    constructor(scene, camera = null, cameraController = null, pathGenerator = null) {
        this.scene = scene;
        this.camera = camera; // Référence à la caméra pour le suivi
        this.cameraController = cameraController;
        this.pathGenerator = null;
        this.gridMeshes = [];
        this.showGrid = false;
        this.followCamera = true; // Active le suivi de caméra par défaut

        // Configuration de la grille 4x4 (positions LOCALES)
        this.gridConfig = {
            columns: 4,      // X: 0, 1, 2, 3
            rows: 4,         // Y: 0 (bas), 1, 2, 3 (haut)
            positions: {
                // Positions LOCALES (par rapport au chemin)
                x: [-1.5, -0.5, 0.5, 1.5],    // 4 colonnes espacées de 1.0
                y: [0.5, 1.5, 2.5, 3.5]        // 4 hauteurs espacées de 1.0 (grille carrée)
            },
            offsetZ: 5 // Distance devant la caméra pour la "barre de lecture"
        };
    }

    /**
     * Définit le PathGenerator pour les virages rythmiques
     */
    setPathGenerator(pathGenerator) {
        this.pathGenerator = pathGenerator;
    }

    /**
     * Obtient la position mondiale réelle d'une case de grille
     * C'est la SOURCE DE VÉRITÉ pour toutes les positions de grille !
     * @param {number} gridX - Colonne (0-3)
     * @param {number} gridY - Ligne (0-1)
     * @returns {Vector3} Position mondiale de la case
     */
    getGridCellWorldPosition(gridX, gridY) {
        if (!this.isValidGridPosition(gridX, gridY)) {
            console.warn(`Position de grille invalide: ${gridX}, ${gridY}`);
            return new Vector3(0, 1.4, 0);
        }

        const localX = this.gridConfig.positions.x[gridX];
        const localY = this.gridConfig.positions.y[gridY];

        if (this.pathGenerator && this.cameraController) {
            // Mode chemin rythmique : calculer la position sur le chemin
            const cameraDistance = this.cameraController.getDistanceTraveled
                ? this.cameraController.getDistanceTraveled()
                : this.cameraController.getPositionZ();
            const hitDistance = cameraDistance + this.gridConfig.offsetZ;
            const pathData = this.pathGenerator.getPositionAtDistance(hitDistance);

            // Calculer les vecteurs locaux du chemin
            const forward = pathData.tangent;
            const right = new Vector3(forward.z, 0, -forward.x).normalize();
            const up = new Vector3(0, 1, 0);

            // Position de base sur le chemin
            const basePosition = pathData.position;

            // Position mondiale dans le repère local du chemin
            return basePosition
                .add(right.scale(localX))
                .add(up.scale(localY - 2)); // -2 car le chemin est à Y=2
        } else {
            // Mode classique : ligne droite
            const cameraZ = this.camera ? this.camera.position.z : 0;
            const hitBarZ = cameraZ + this.gridConfig.offsetZ;

            return new Vector3(localX, localY, hitBarZ);
        }
    }

    /**
     * Obtient la position mondiale à une distance donnée sur le chemin
     * Utilisé pour positionner les notes à l'avance
     * @param {number} gridX - Colonne (0-3)
     * @param {number} gridY - Ligne (0-1)
     * @param {number} distance - Distance sur le chemin
     * @returns {Vector3} Position mondiale
     */
    getGridCellWorldPositionAtDistance(gridX, gridY, distance) {
        if (!this.isValidGridPosition(gridX, gridY)) {
            console.warn(`Position de grille invalide: ${gridX}, ${gridY}`);
            return new Vector3(0, 1.4, distance);
        }

        const localX = this.gridConfig.positions.x[gridX];
        const localY = this.gridConfig.positions.y[gridY];

        if (this.pathGenerator) {
            // Mode chemin rythmique
            const pathData = this.pathGenerator.getPositionAtDistance(distance);

            // Calculer les vecteurs locaux
            const forward = pathData.tangent;
            const right = new Vector3(forward.z, 0, -forward.x).normalize();
            const up = new Vector3(0, 1, 0);

            // Position mondiale
            return pathData.position
                .add(right.scale(localX))
                .add(up.scale(localY - 2));
        } else {
            // Mode classique
            return new Vector3(localX, localY, distance);
        }
    }

    /**
     * Affiche la grille de guidage visuel (pour debug/développement)
     */
    showGridGuides() {
        this.hideGridGuides(); // Nettoyer d'abord

        // Matériau néon cyan lumineux
        const guideMaterial = new StandardMaterial('gridGuideMat', this.scene);
        guideMaterial.diffuseColor = new Color3(0, 0.1, 0.2); // Base sombre
        guideMaterial.emissiveColor = new Color3(0, 1, 1); // Cyan vif émissif
        guideMaterial.specularColor = new Color3(0.5, 1, 1); // Reflet cyan
        guideMaterial.specularPower = 32;
        guideMaterial.alpha = 0.7; // Semi-transparent pour voir à travers

        // Positions actives en cercle (selon le mapping des touches)
        const activePositions = [
            { x: 1, y: 0 }, // g
            { x: 2, y: 0 }, // k
            { x: 0, y: 1 }, // f
            { x: 3, y: 1 }, // l
            { x: 0, y: 2 }, // r
            { x: 3, y: 2 }, // o
            { x: 1, y: 3 }, // t
            { x: 2, y: 3 }  // i
        ];

        // Créer des cubes de guidage uniquement pour les positions actives
        activePositions.forEach(pos => {
            const guide = MeshBuilder.CreateBox(
                `gridGuide_${pos.x}_${pos.y}`,
                { width: 0.8, height: 0.8, depth: 0.1 }, // Réduit de 0.8 à 0.5
                this.scene
            );

            // Position initiale basée sur la caméra
            const gridZ = this.camera ?
                this.camera.position.z + this.gridConfig.offsetZ :
                this.gridConfig.offsetZ;

            guide.position.set(
                this.gridConfig.positions.x[pos.x],
                this.gridConfig.positions.y[pos.y],
                gridZ
            );

            guide.material = guideMaterial;

            // Stocker la position pour référence
            guide.metadata = { gridX: pos.x, gridY: pos.y };

            this.gridMeshes.push(guide);
        });

        // Ajouter des lignes de délimitation
        // this.addGridLines();
        this.showGrid = true;
    }

    /**
     * Anime un carré de la grille (pulse effect avec états fixes)
     */
    pulseGridSquare(gridX, gridY) {
        // Trouver le mesh correspondant
        const gridMesh = this.gridMeshes.find(mesh =>
            mesh.metadata && mesh.metadata.gridX === gridX && mesh.metadata.gridY === gridY
        );

        if (!gridMesh) return;

        // Annuler toute animation en cours sur ce mesh
        this.scene.stopAnimation(gridMesh);

        // Tailles fixes
        const normalScale = 1.0;
        const pressedScale = 1.3;

        // Passer à l'état "pressé" immédiatement
        gridMesh.scaling.setAll(pressedScale);

        // Effet de lumière temporaire
        const originalIntensity = gridMesh.material.emissiveIntensity || 1;
        gridMesh.material.emissiveIntensity = 2.0;

        // Retour à l'état normal après 150ms
        setTimeout(() => {
            if (gridMesh) {
                gridMesh.scaling.setAll(normalScale);
                if (gridMesh.material) {
                    gridMesh.material.emissiveIntensity = originalIntensity;
                }
            }
        }, 150);
    }

    /**
     * Ajoute des lignes pour délimiter la zone de jeu
     * @private
     */
    addGridLines() {
        const lineMaterial = new StandardMaterial('gridLineMat', this.scene);
        lineMaterial.emissiveColor = new Color3(0.8, 0.8, 0.2);

        // Délimiteurs verticaux (entre les colonnes)
        for (let x = 0; x <= this.gridConfig.columns; x++) {
            const line = MeshBuilder.CreateBox(
                `gridLineV_${x}`,
                { width: 0.02, height: 3, depth: 0.1 },
                this.scene
            );

            // Position basée sur la caméra
            const gridZ = this.camera ?
                this.camera.position.z + this.gridConfig.offsetZ - 0.1 :
                this.gridConfig.offsetZ - 0.1;

            line.position.set(
                -1.75 + (x * 0.5), // Positions entre et autour des colonnes
                1.4,  // Centré verticalement
                gridZ  // Suit la caméra
            );

            line.material = lineMaterial;
            this.gridMeshes.push(line);
        }

        // Délimiteurs horizontaux (entre les lignes)
        for (let y = 0; y <= this.gridConfig.rows; y++) {
            const line = MeshBuilder.CreateBox(
                `gridLineH_${y}`,
                { width: 3.5, height: 0.02, depth: 0.1 },
                this.scene
            );

            // Position basée sur la caméra
            const gridZ = this.camera ?
                this.camera.position.z + this.gridConfig.offsetZ - 0.1 :
                this.gridConfig.offsetZ - 0.1;

            line.position.set(
                0,    // Centré horizontalement
                y === 0 ? 0.2 : (y === 1 ? 1.4 : 2.6), // Positions entre et autour des lignes
                gridZ  // Suit la caméra
            );

            line.material = lineMaterial;
            this.gridMeshes.push(line);
        }
    }

    /**
     * Met à jour la position de la grille pour suivre la caméra
     * Maintenant supporte aussi la rotation pour les virages rythmiques
     */
    updateGridPosition() {
        if (!this.followCamera || !this.camera || !this.showGrid) return;

        // Obtenir la direction de la caméra
        const cameraForward = this.camera.getDirection(new Vector3(0, 0, 1));
        const cameraRight = this.camera.getDirection(new Vector3(1, 0, 0));
        const cameraUp = this.camera.getDirection(new Vector3(0, 1, 0));

        // Position de base de la grille (devant la caméra)
        const gridBasePosition = this.camera.position.add(
            cameraForward.scale(this.gridConfig.offsetZ)
        );

        // Mettre à jour tous les mesh de la grille
        this.gridMeshes.forEach(mesh => {
            const metadata = mesh.metadata;

            if (metadata && typeof metadata.gridX !== 'undefined' && typeof metadata.gridY !== 'undefined') {
                // Mesh de guide de grille
                const gridX = metadata.gridX;
                const gridY = metadata.gridY;

                // Position locale dans le repère de la caméra
                const localX = this.gridConfig.positions.x[gridX];
                const localY = this.gridConfig.positions.y[gridY];

                // Calculer la position mondiale
                const worldPosition = gridBasePosition
                    .add(cameraRight.scale(localX))
                    .add(cameraUp.scale(localY - 2)); // -2 car la caméra est à y=2

                mesh.position.copyFrom(worldPosition);

                // Orienter le mesh pour qu'il soit face à la caméra
                mesh.rotation.y = Math.atan2(cameraForward.x, cameraForward.z);
                mesh.rotation.x = -Math.asin(cameraForward.y);

            } else if (mesh.name.includes('gridLine')) {
                // Lignes de délimitation - légèrement en arrière
                const linePosition = gridBasePosition.add(
                    cameraForward.scale(-0.1)
                );

                mesh.position.copyFrom(linePosition);

                // Orienter les lignes
                mesh.rotation.y = Math.atan2(cameraForward.x, cameraForward.z);
                mesh.rotation.x = -Math.asin(cameraForward.y);
            }
        });
    }

    /**
     * Cache les guides de la grille
     */
    hideGridGuides() {
        this.gridMeshes.forEach(mesh => mesh.dispose());
        this.gridMeshes = [];
        this.showGrid = false;
    }

    /**
     * Toggle l'affichage de la grille
     */
    toggleGrid() {
        if (this.showGrid) {
            this.hideGridGuides();
        } else {
            this.showGridGuides();
        }
    }

    /**
     * Convertit des coordonnées de grille en position monde
     * @param {number} gridX - Colonne (0-3)
     * @param {number} gridY - Ligne (0-1)
     * @returns {Object} Position 3D
     */
    gridToWorldPosition(gridX, gridY) {
        if (gridX < 0 || gridX >= this.gridConfig.columns ||
            gridY < 0 || gridY >= this.gridConfig.rows) {
            return { x: 0, y: 1.4, z: 0 }; // Position par défaut
        }

        return {
            x: this.gridConfig.positions.x[gridX],
            y: this.gridConfig.positions.y[gridY],
            z: 0
        };
    }

    /**
     * Trouve la position de grille la plus proche d'une position monde
     * @param {Object} worldPos - Position monde {x, y, z}
     * @returns {Object} Position grille {x, y}
     */
    worldToGridPosition(worldPos) {
        // Trouver la colonne la plus proche
        let closestX = 0;
        let minDistanceX = Math.abs(worldPos.x - this.gridConfig.positions.x[0]);

        for (let x = 1; x < this.gridConfig.columns; x++) {
            const distance = Math.abs(worldPos.x - this.gridConfig.positions.x[x]);
            if (distance < minDistanceX) {
                minDistanceX = distance;
                closestX = x;
            }
        }

        // Trouver la ligne la plus proche
        let closestY = 0;
        let minDistanceY = Math.abs(worldPos.y - this.gridConfig.positions.y[0]);

        for (let y = 1; y < this.gridConfig.rows; y++) {
            const distance = Math.abs(worldPos.y - this.gridConfig.positions.y[y]);
            if (distance < minDistanceY) {
                minDistanceY = distance;
                closestY = y;
            }
        }

        return { x: closestX, y: closestY };
    }

    /**
     * Vérifie si une position de grille est valide
     * @param {number} gridX - Colonne
     * @param {number} gridY - Ligne
     * @returns {boolean}
     */
    isValidGridPosition(gridX, gridY) {
        return gridX >= 0 && gridX < this.gridConfig.columns &&
               gridY >= 0 && gridY < this.gridConfig.rows;
    }

    /**
     * Retourne toutes les positions valides de la grille
     * @returns {Array} Tableau des positions {x, y, worldPos}
     */
    getAllGridPositions() {
        const positions = [];

        for (let x = 0; x < this.gridConfig.columns; x++) {
            for (let y = 0; y < this.gridConfig.rows; y++) {
                positions.push({
                    gridX: x,
                    gridY: y,
                    worldPos: this.gridToWorldPosition(x, y)
                });
            }
        }

        return positions;
    }

    /**
     * Affiche des informations de debug sur la grille
     */
    logGridInfo() {
        // Méthode de debug (désactivée en production)
    }

    /**
     * Nettoie les ressources
     */
    dispose() {
        this.hideGridGuides();
    }
}

export default GridHelper;
