/**
 * Exemple d'utilisation du service BeatSaver
 * Montre comment rechercher, charger et parser des maps
 */
import { beatSaverService } from '../services/BeatSaverService.js';
import { beatMapParser } from '../services/BeatMapParser.js';

export class BeatSaverExample {
    constructor() {
        this.selectedMap = null;
        this.parsedMapData = null;
    }

    /**
     * Exemple de recherche de maps
     */
    async searchExample() {
        try {
            console.log('🔍 Recherche de maps populaires...');

            // Recherche générale
            const popularMaps = await beatSaverService.searchMaps('', 0, 'Rating');
            console.log(`Trouvé ${popularMaps.docs.length} maps populaires:`);

            popularMaps.docs.slice(0, 5).forEach((map, index) => {
                console.log(`${index + 1}. ${map.metadata.songName} - ${map.metadata.songAuthorName}`);
                console.log(`   Mapper: ${map.metadata.levelAuthorName}`);
                console.log(`   BPM: ${map.metadata.bpm} | Durée: ${map.metadata.duration}s`);
                console.log(`   Difficultés: ${map.difficulties.map(d => d.difficulty).join(', ')}`);
                console.log(`   Stats: ${map.stats.upvotes}👍 ${map.stats.downloads} téléchargements`);
                console.log('');
            });

            return popularMaps;

        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
        }
    }

    /**
     * Exemple de recherche par genre
     */
    async searchByGenreExample() {
        try {
            console.log('🎵 Recherche par genre...');

            const genres = ['electronic', 'rock', 'pop', 'dubstep', 'anime'];

            for (const genre of genres) {
                const maps = await beatSaverService.searchByGenre(genre, 0);
                console.log(`${genre.toUpperCase()}: ${maps.docs.length} maps trouvées`);

                if (maps.docs.length > 0) {
                    const topMap = maps.docs[0];
                    console.log(`  Top: ${topMap.metadata.songName} (${topMap.stats.score}/5⭐)`);
                }
                console.log('');
            }

        } catch (error) {
            console.error('Erreur recherche par genre:', error);
        }
    }

    /**
     * Exemple de sélection et analyse d'une map
     */
    async selectMapExample(mapId = null) {
        try {
            let selectedMap;

            if (mapId) {
                selectedMap = await beatSaverService.getMapById(mapId);
            } else {
                // Prendre la première map populaire
                const popularMaps = await beatSaverService.searchMaps('', 0, 'Rating');
                selectedMap = popularMaps.docs[0];
            }

            this.selectedMap = selectedMap;

            console.log('🎯 Map sélectionnée:');
            console.log(`Titre: ${selectedMap.metadata.songName}`);
            console.log(`Artiste: ${selectedMap.metadata.songAuthorName}`);
            console.log(`Mapper: ${selectedMap.metadata.levelAuthorName}`);
            console.log(`BPM: ${selectedMap.metadata.bpm}`);
            console.log(`Hash: ${selectedMap.version.hash}`);
            console.log('');

            // Analyse des difficultés
            console.log('🎮 Difficultés disponibles:');
            selectedMap.difficulties.forEach(diff => {
                console.log(`  ${diff.difficulty}: ${diff.stars}⭐ | ${diff.noteCount} notes | NJS: ${diff.njs}`);
            });
            console.log('');

            // URLs importantes
            console.log('🔗 URLs:');
            console.log(`Cover: ${selectedMap.version.coverUrl}`);
            console.log(`Preview: ${selectedMap.version.previewUrl}`);
            console.log(`Download: ${selectedMap.version.downloadUrl}`);
            console.log('');

            return selectedMap;

        } catch (error) {
            console.error('Erreur sélection map:', error);
        }
    }

    /**
     * Simulation du parsing d'une map (normalement fait après téléchargement ZIP)
     */
    simulateMapParsing() {
        if (!this.selectedMap) {
            console.log('❌ Aucune map sélectionnée pour le parsing');
            return;
        }

        // Simulation des données qu'on obtiendrait du ZIP
        // En réalité, on utiliserait JSZip pour extraire les fichiers .dat
        const mockDifficultyData = this.generateMockDifficultyData();

        console.log('🔧 Parsing de la difficulté...');
        const parsedData = beatMapParser.parseDifficulty(mockDifficultyData);

        console.log('📊 Données parsées:');
        console.log(`Version: ${parsedData.version}`);
        console.log(`Notes: ${parsedData.notes?.length || parsedData.colorNotes?.length || 0}`);
        console.log(`Obstacles: ${parsedData.obstacles?.length || 0}`);
        console.log(`Bombes: ${parsedData.bombNotes?.length || 0}`);
        console.log('');

        // Optimisation pour le gameplay
        const gameplayData = beatMapParser.optimizeForGameplay(parsedData, this.selectedMap.metadata.bpm);

        console.log('🎮 Données optimisées pour le gameplay:');
        console.log(`BPM: ${gameplayData.bpm}`);
        console.log(`Secondes par beat: ${gameplayData.secondsPerBeat.toFixed(3)}`);
        console.log(`Notes avec positions 3D: ${gameplayData.notes.length}`);
        console.log('');

        // Exemple de conversion 4x3 → 4x2
        if (gameplayData.notes.length > 0) {
            console.log('🔄 Conversion 4x3 → 4x2:');
            gameplayData.notes.forEach((note, i) => {
                const originalPos = `(${note.originalX}, ${note.originalY})`;
                const convertedPos = `(${note.x}, ${note.y})`;
                const worldPos = `(${note.position3D.x}, ${note.position3D.y}, ${note.position3D.z})`;
                const type = note.type === 0 ? 'Rouge' : 'Bleu';

                console.log(`  ${i + 1}. ${note.time.toFixed(2)}s | ${originalPos} → ${convertedPos} → 3D${worldPos} | ${type}`);
            });
            console.log('');

            // Résumé de la conversion
            const originalPositions = gameplayData.notes.map(n => `${n.originalX},${n.originalY}`);
            const convertedPositions = gameplayData.notes.map(n => `${n.x},${n.y}`);

            console.log('📊 Résumé conversion:');
            console.log(`Positions originales: ${[...new Set(originalPositions)].join(', ')}`);
            console.log(`Positions converties: ${[...new Set(convertedPositions)].join(', ')}`);
            console.log('');
        }

        // Statistiques de difficulté
        const diffStats = beatMapParser.generateDifficultyStats(gameplayData);
        console.log('📈 Statistiques de difficulté:');
        console.log(`Durée: ${diffStats.duration.toFixed(1)}s`);
        console.log(`Densité: ${diffStats.density} notes/min`);
        console.log(`Complexité: ${diffStats.complexity}%`);
        console.log(`Difficulté estimée: ${diffStats.estimatedDifficulty}/10`);
        console.log('');

        this.parsedMapData = gameplayData;
        return gameplayData;
    }

    /**
     * Génère des données mock pour simuler une difficulté avec conversion 4x3 → 4x2
     * @private
     */
    generateMockDifficultyData() {
        // Simulation d'une difficulté format v2 avec notes dans les 3 lignes
        return {
            _version: "2.0.0",
            _notes: [
                // Ligne du bas (Y=0) → reste en bas (Y=0)
                { _time: 1, _lineIndex: 1, _lineLayer: 0, _type: 0, _cutDirection: 1 },
                { _time: 4.5, _lineIndex: 3, _lineLayer: 0, _type: 1, _cutDirection: 2 },

                // Ligne du milieu (Y=1) → va en bas (Y=0)
                { _time: 2, _lineIndex: 2, _lineLayer: 1, _type: 1, _cutDirection: 0 },
                { _time: 5.5, _lineIndex: 0, _lineLayer: 1, _type: 0, _cutDirection: 4 },

                // Ligne du haut (Y=2) → reste en haut (Y=1)
                { _time: 3, _lineIndex: 0, _lineLayer: 2, _type: 0, _cutDirection: 3 },
                { _time: 6, _lineIndex: 2, _lineLayer: 2, _type: 1, _cutDirection: 5 }
            ],
            _obstacles: [
                { _time: 5, _lineIndex: 1, _lineLayer: 0, _type: 0, _duration: 2, _width: 1 },
                { _time: 7, _lineIndex: 2, _lineLayer: 2, _type: 1, _duration: 1, _width: 1 }
            ],
            _events: [
                { _time: 0, _type: 0, _value: 1 },
                { _time: 1, _type: 1, _value: 3 }
            ]
        };
    }

    /**
     * Exemple complet - recherche, sélection et parsing
     */
    async fullExample() {
        console.log('🚀 Exemple complet BeatSaver + Parsing\n');

        // 1. Recherche
        await this.searchExample();

        // 2. Recherche par genre
        await this.searchByGenreExample();

        // 3. Sélection d'une map
        await this.selectMapExample();

        // 4. Simulation du parsing
        this.simulateMapParsing();

        console.log('✅ Exemple terminé !');
        console.log('💡 Prochaines étapes: intégrer avec JSZip pour parser les vrais fichiers ZIP');
    }

    /**
     * Utilitaire pour afficher les stats du cache
     */
    showCacheStats() {
        const stats = beatSaverService.getCacheStats();
        console.log('💾 Cache BeatSaver:');
        console.log(`Taille: ${stats.size} entrées`);
        console.log(`Clés: ${stats.keys.join(', ')}`);
    }
}

// Instance pour usage direct
export const beatSaverExample = new BeatSaverExample();