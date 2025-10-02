/**
 * Parser pour les fichiers de maps Beat Saber (.dat)
 * Convertit les données brutes des maps en format utilisable par le jeu
 */
export class BeatMapParser {
    constructor() {
        this.supportedVersions = ['2.0.0', '2.2.0', '2.5.0', '2.6.0', '3.0.0', '3.2.0', '3.3.0'];
    }

    /**
     * Parse les données info.dat d'une map
     * @param {Object} infoData - Données du fichier info.dat
     * @returns {Object} Métadonnées parsées
     */
    parseInfo(infoData) {
        return {
            version: infoData._version,
            songName: infoData._songName,
            songSubName: infoData._songSubName,
            songAuthorName: infoData._songAuthorName,
            levelAuthorName: infoData._levelAuthorName,
            bpm: infoData._beatsPerMinute,
            shuffle: infoData._shuffle || 0,
            shufflePeriod: infoData._shufflePeriod || 0.5,
            previewStartTime: infoData._previewStartTime || 12,
            previewDuration: infoData._previewDuration || 10,
            songFilename: infoData._songFilename,
            coverImageFilename: infoData._coverImageFilename,
            environmentName: infoData._environmentName || 'DefaultEnvironment',
            allDirectionsEnvironmentName: infoData._allDirectionsEnvironmentName,
            songTimeOffset: infoData._songTimeOffset || 0,

            // Difficultés disponibles
            difficultyBeatmapSets: infoData._difficultyBeatmapSets.map(set => ({
                beatmapCharacteristicName: set._beatmapCharacteristicName,
                difficultyBeatmaps: set._difficultyBeatmaps.map(diff => ({
                    difficulty: diff._difficulty,
                    difficultyRank: diff._difficultyRank,
                    beatmapFilename: diff._beatmapFilename,
                    noteJumpMovementSpeed: diff._noteJumpMovementSpeed,
                    noteJumpStartBeatOffset: diff._noteJumpStartBeatOffset
                }))
            }))
        };
    }

    /**
     * Parse les données d'une difficulté spécifique (.dat)
     * @param {Object} difficultyData - Données du fichier de difficulté
     * @returns {Object} Notes et obstacles parsés
     */
    parseDifficulty(difficultyData) {
        const version = difficultyData.version || difficultyData._version || '2.0.0';

        if (version.startsWith('3.')) {
            return this.parseV3Difficulty(difficultyData);
        } else {
            return this.parseV2Difficulty(difficultyData);
        }
    }

    /**
     * Parse une difficulté format v2.x
     * @private
     */
    parseV2Difficulty(data) {
        return {
            version: data._version,
            notes: (data._notes || []).map(note => ({
                time: note._time,
                lineIndex: note._lineIndex,     // Position horizontale (0-3)
                lineLayer: note._lineLayer,     // Position verticale (0-2)
                type: note._type,               // 0=rouge, 1=bleu
                cutDirection: note._cutDirection // Direction de coupe (0-8)
            })),

            obstacles: (data._obstacles || []).map(obstacle => ({
                time: obstacle._time,
                lineIndex: obstacle._lineIndex,
                type: obstacle._type,           // 0=mur pleine hauteur, 1=mur crouch
                duration: obstacle._duration,
                width: obstacle._width
            })),

            events: (data._events || []).map(event => ({
                time: event._time,
                type: event._type,
                value: event._value
            })),

            bpmEvents: data._bpmEvents || [],
            rotationEvents: data._rotationEvents || []
        };
    }

    /**
     * Parse une difficulté format v3.x
     * @private
     */
    parseV3Difficulty(data) {
        return {
            version: data.version,
            bpmEvents: data.bpmEvents || [],
            rotationEvents: data.rotationEvents || [],

            colorNotes: (data.colorNotes || []).map(note => ({
                beat: note.b,                   // Temps en beats
                x: note.x,                      // Position X (0-3)
                y: note.y,                      // Position Y (0-2)
                color: note.c,                  // Couleur (0=rouge, 1=bleu)
                direction: note.d,              // Direction de coupe
                angleOffset: note.a || 0        // Offset d'angle
            })),

            bombNotes: (data.bombNotes || []).map(bomb => ({
                beat: bomb.b,
                x: bomb.x,
                y: bomb.y
            })),

            obstacles: (data.obstacles || []).map(obstacle => ({
                beat: obstacle.b,
                x: obstacle.x,
                y: obstacle.y,
                duration: obstacle.d,
                width: obstacle.w,
                height: obstacle.h
            })),

            sliders: (data.sliders || []).map(slider => ({
                colorType: slider.c,
                headBeat: slider.b,
                headX: slider.x,
                headY: slider.y,
                headDirection: slider.d,
                tailBeat: slider.tb,
                tailX: slider.tx,
                tailY: slider.ty,
                tailDirection: slider.td,
                midAnchorMode: slider.mu
            })),

            basicBeatmapEvents: (data.basicBeatmapEvents || []).map(event => ({
                beat: event.b,
                eventType: event.et,
                value: event.i,
                floatValue: event.f || 1.0
            }))
        };
    }

    /**
     * Convertit les données parsées en format optimisé pour le jeu
     * @param {Object} parsedData - Données parsées
     * @param {number} bpm - BPM de la chanson
     * @returns {Object} Données optimisées pour le gameplay
     */
    optimizeForGameplay(parsedData, bpm) {
        const secondsPerBeat = 60 / bpm;

        // Gestion des deux formats (v2 et v3)
        const notes = parsedData.notes || parsedData.colorNotes || [];
        const obstacles = parsedData.obstacles || [];
        const bombs = parsedData.bombNotes || [];

        return {
            bpm,
            secondsPerBeat,

            // Notes converties en temps réel avec conversion 4x3 -> 4x4 (cercle)
            notes: notes.map(note => {
                const originalX = note.lineIndex !== undefined ? note.lineIndex : note.x;
                const originalY = note.lineLayer !== undefined ? note.lineLayer : note.y;

                // Conversion de la grille 4x3 Beat Saber vers 4x4 cercle
                const convertedPos = this.convertGridTo4x2(originalX, originalY);

                return {
                    time: this.beatToSeconds(note.time || note.beat, secondsPerBeat),
                    x: convertedPos.x,
                    y: convertedPos.y,
                    originalX: originalX,  // Garder l'original pour debug
                    originalY: originalY,
                    type: note.type !== undefined ? note.type : note.color,
                    direction: note.cutDirection !== undefined ? note.cutDirection : note.direction,

                    // Position 3D pour Babylon.js (après conversion 4x4)
                    position3D: this.gridToWorldPosition(convertedPos.x, convertedPos.y)
                };
            }),

            // Obstacles avec conversion 4x3 -> 4x4 (cercle)
            obstacles: obstacles.map(obstacle => {
                const originalX = obstacle.lineIndex !== undefined ? obstacle.lineIndex : obstacle.x;
                const originalY = obstacle.y || 0;

                // Les obstacles peuvent couvrir plusieurs positions, on adapte
                const convertedPos = this.convertGridTo4x2(originalX, originalY);

                return {
                    time: this.beatToSeconds(obstacle.time || obstacle.beat || obstacle.b, secondsPerBeat),
                    duration: this.beatToSeconds(obstacle.duration || obstacle.d, secondsPerBeat),
                    x: convertedPos.x,
                    y: convertedPos.y,
                    originalX: originalX,
                    originalY: originalY,
                    width: obstacle.width || obstacle.w || 1,
                    height: obstacle.height || obstacle.h || (obstacle.type === 0 ? 4 : 1), // Adapté pour 4x4
                    type: obstacle.type,

                    // Position et taille 3D (après conversion)
                    position3D: this.gridToWorldPosition(convertedPos.x, convertedPos.y),
                    scale3D: {
                        width: obstacle.width || obstacle.w || 1,
                        height: obstacle.height || obstacle.h || (obstacle.type === 0 ? 4 : 1) // Max 4 hauteurs
                    }
                };
            }),

            // Bombes avec conversion 4x3 -> 4x4 (cercle)
            bombs: bombs.map(bomb => {
                const originalX = bomb.lineIndex !== undefined ? bomb.lineIndex : bomb.x;
                const originalY = bomb.lineLayer !== undefined ? bomb.lineLayer : bomb.y;

                // Conversion des bombes aussi
                const convertedPos = this.convertGridTo4x2(originalX, originalY);

                return {
                    time: this.beatToSeconds(bomb.time || bomb.beat || bomb.b, secondsPerBeat),
                    x: convertedPos.x,
                    y: convertedPos.y,
                    originalX: originalX,
                    originalY: originalY,
                    position3D: this.gridToWorldPosition(convertedPos.x, convertedPos.y)
                };
            })
        };
    }

    /**
     * Convertit les beats en secondes
     * @private
     */
    beatToSeconds(beat, secondsPerBeat) {
        return beat * secondsPerBeat;
    }

    /**
     * Convertit la grille Beat Saber (4x3) vers grille jeu 4x4 (motif cercle)
     * Mappe les 12 positions BS vers les 8 positions actives du cercle
     * @private
     */
    convertGridTo4x2(x, y) {
        // Conversion 4x3 Beat Saber -> 4x4 cercle :
        //
        // BS y=2 (haut)   -> Ligne 3 du cercle (centre: t, i)
        // BS y=1 (milieu) -> Lignes 1 et 2 du cercle (côtés: f, l, r, o)
        // BS y=0 (bas)    -> Ligne 0 du cercle (centre: g, k)

        let newX, newY;

        if (y === 2) {
            // Haut Beat Saber -> Centre haut du cercle (ligne 3)
            newY = 3;
            newX = x <= 1 ? 1 : 2; // Gauche -> t, Droite -> i
        } else if (y === 1) {
            // Milieu Beat Saber -> Côtés du cercle (lignes 1 et 2)
            if (x === 0) {
                newX = 0; newY = 2; // Gauche -> r
            } else if (x === 1) {
                newX = 0; newY = 1; // Centre-gauche -> f
            } else if (x === 2) {
                newX = 3; newY = 1; // Centre-droit -> l
            } else {
                newX = 3; newY = 2; // Droit -> o
            }
        } else {
            // Bas Beat Saber -> Centre bas du cercle (ligne 0)
            newY = 0;
            newX = x <= 1 ? 1 : 2; // Gauche -> g, Droite -> k
        }

        return { x: newX, y: newY };
    }

    /**
     * Convertit la grille jeu 4x4 en position monde 3D
     * @private
     */
    gridToWorldPosition(x, y) {
        // Conversion de la grille 4x4 vers positions monde
        // X: 0-3 -> positions [-1.5, -0.5, 0.5, 1.5]
        // Y: 0-3 -> positions [0.5, 1.5, 2.5, 3.5]
        const xPositions = [-1.5, -0.5, 0.5, 1.5];
        const yPositions = [0.5, 1.5, 2.5, 3.5];

        return {
            x: xPositions[x],
            y: yPositions[y],
            z: 0  // Les objets apparaissent devant le joueur
        };
    }

    /**
     * Génère des métadonnées de difficulté
     * @param {Object} gameplayData - Données optimisées
     * @returns {Object} Métadonnées de difficulté
     */
    generateDifficultyStats(gameplayData) {
        const notes = gameplayData.notes || [];
        const obstacles = gameplayData.obstacles || [];

        if (notes.length === 0) {
            return { difficulty: 0, density: 0, complexity: 0 };
        }

        const duration = Math.max(...notes.map(n => n.time));
        const density = notes.length / (duration / 60); // Notes par minute

        // Calcul de la complexité basé sur les changements de direction
        let directionChanges = 0;
        for (let i = 1; i < notes.length; i++) {
            if (notes[i].direction !== notes[i-1].direction) {
                directionChanges++;
            }
        }

        const complexity = (directionChanges / notes.length) * 100;

        return {
            duration,
            noteCount: notes.length,
            obstacleCount: obstacles.length,
            density: Math.round(density * 10) / 10,
            complexity: Math.round(complexity * 10) / 10,
            estimatedDifficulty: Math.min(10, Math.round((density * 0.1 + complexity * 0.02) * 10) / 10)
        };
    }
}

export const beatMapParser = new BeatMapParser();