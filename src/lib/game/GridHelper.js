/**
 * Helper pour visualiser et gérer la grille 4x2 dans le jeu
 * Gère l'affichage des guides et la validation des positions
 */
import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';

export class GridHelper {
    constructor(scene, camera = null) {
        this.scene = scene;
        this.camera = camera; // Référence à la caméra pour le suivi
        this.gridMeshes = [];
        this.showGrid = false;
        this.followCamera = true; // Active le suivi de caméra par défaut

        // Configuration de la grille 4x2
        this.gridConfig = {
            columns: 4,      // X: 0, 1, 2, 3
            rows: 2,         // Y: 0 (bas), 1 (haut)
            positions: {
                // Positions monde correspondant à chaque case de la grille
                x: [-1.5, -0.5, 0.5, 1.5],    // 4 colonnes
                y: [0.8, 2.0]                  // 2 hauteurs (bas, haut)
            },
            offsetZ: 5 // Distance devant la caméra pour la "barre de lecture"
        };
    }

    /**
     * Affiche la grille de guidage visuel (pour debug/développement)
     */
    showGridGuides() {
        this.hideGridGuides(); // Nettoyer d'abord

        const guideMaterial = new StandardMaterial('gridGuideMat', this.scene);
        guideMaterial.emissiveColor = new Color3(0.2, 0.8, 0.2);
        guideMaterial.alpha = 0.3;

        // Créer des cubes de guidage pour chaque position
        for (let x = 0; x < this.gridConfig.columns; x++) {
            for (let y = 0; y < this.gridConfig.rows; y++) {
                const guide = MeshBuilder.CreateBox(
                    `gridGuide_${x}_${y}`,
                    { width: 0.8, height: 0.8, depth: 0.1 },
                    this.scene
                );

                // Position initiale basée sur la caméra
                const gridZ = this.camera ?
                    this.camera.position.z + this.gridConfig.offsetZ :
                    this.gridConfig.offsetZ;

                guide.position.set(
                    this.gridConfig.positions.x[x],
                    this.gridConfig.positions.y[y],
                    gridZ
                );

                guide.material = guideMaterial;

                // Stocker la position pour référence
                guide.metadata = { gridX: x, gridY: y };

                this.gridMeshes.push(guide);
            }
        }

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
     */
    updateGridPosition() {
        if (!this.followCamera || !this.camera || !this.showGrid) return;

        // Nouvelle position Z basée sur la caméra
        const newGridZ = this.camera.position.z + this.gridConfig.offsetZ;

        // Mettre à jour tous les mesh de la grille
        this.gridMeshes.forEach(mesh => {
            // Préserver les positions X et Y, mettre à jour seulement Z
            if (mesh.name.includes('gridLine')) {
                mesh.position.z = newGridZ - 0.1; // Lignes légèrement derrière
            } else {
                mesh.position.z = newGridZ;        // Guides au niveau principal
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
