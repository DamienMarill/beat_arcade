/**
 * Service pour interagir avec l'API BeatSaver
 * Permet de rechercher, télécharger et parser les maps Beat Saber
 */
export class BeatSaverService {
    constructor() {
        this.apiBase = 'https://api.beatsaver.com';
        this.cdnBase = 'https://cdn.beatsaver.com';
        this.cache = new Map();
    }

    /**
     * Recherche des maps par mots-clés
     * @param {string} query - Terme de recherche
     * @param {number} page - Page de résultats (défaut: 0)
     * @param {string} sortOrder - Ordre de tri (Rating, Latest, Relevance)
     * @returns {Promise<Object>} Résultats de recherche
     */
    async searchMaps(query = '', page = 0, sortOrder = 'Rating') {
        try {
            const params = new URLSearchParams({
                q: query,
                sortOrder,
                automapper: 'true'
            });

            const url = `${this.apiBase}/search/text/${page}?${params}`;
            const cacheKey = `search_${query}_${page}_${sortOrder}`;

            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Erreur API BeatSaver: ${response.status}`);
            }

            const data = await response.json();

            // Formatage des données pour faciliter l'utilisation
            const formattedData = {
                docs: data.docs.map(map => this.formatMapData(map)),
                totalPages: Math.ceil(data.docs.length / 20),
                currentPage: page
            };

            this.cache.set(cacheKey, formattedData);
            return formattedData;

        } catch (error) {
            console.error('Erreur lors de la recherche de maps:', error);
            throw error;
        }
    }

    /**
     * Récupère les maps les plus récentes
     * @param {number} page - Page de résultats
     * @returns {Promise<Object>} Maps récentes
     */
    async getLatestMaps(page = 0) {
        try {
            const url = `${this.apiBase}/maps/latest/${page}`;
            const cacheKey = `latest_${page}`;

            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Erreur API BeatSaver: ${response.status}`);
            }

            const data = await response.json();
            const formattedData = {
                docs: data.docs.map(map => this.formatMapData(map)),
                totalPages: Math.ceil(data.docs.length / 20),
                currentPage: page
            };

            this.cache.set(cacheKey, formattedData);
            return formattedData;

        } catch (error) {
            console.error('Erreur lors de la récupération des maps récentes:', error);
            throw error;
        }
    }

    /**
     * Récupère une map par son ID
     * @param {string} mapId - ID de la map
     * @returns {Promise<Object>} Données de la map
     */
    async getMapById(mapId) {
        try {
            const url = `${this.apiBase}/maps/id/${mapId}`;
            const cacheKey = `map_${mapId}`;

            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Map introuvable: ${mapId}`);
            }

            const data = await response.json();
            const formattedData = this.formatMapData(data);

            this.cache.set(cacheKey, formattedData);
            return formattedData;

        } catch (error) {
            console.error(`Erreur lors de la récupération de la map ${mapId}:`, error);
            throw error;
        }
    }

    /**
     * Récupère les détails d'une difficulté spécifique
     * @param {string} mapHash - Hash de la map
     * @returns {Promise<Object>} Données détaillées de la map
     */
    async downloadMapData(mapHash) {
        try {
            const url = `${this.cdnBase}/${mapHash}.zip`;

            // Pour un jeu web, on ne peut pas extraire directement le ZIP
            // On retourne l'URL de téléchargement pour traitement côté client
            return {
                downloadUrl: url,
                hash: mapHash,
                // Dans un vrai projet, on utiliserait JSZip pour extraire les fichiers
                // et parser les fichiers .dat pour obtenir les notes
                warning: 'Téléchargement ZIP nécessite un traitement côté client avec JSZip'
            };

        } catch (error) {
            console.error(`Erreur lors du téléchargement de la map ${mapHash}:`, error);
            throw error;
        }
    }

    /**
     * Formate les données d'une map pour un usage plus simple
     * @param {Object} rawMapData - Données brutes de l'API
     * @returns {Object} Données formatées
     */
    formatMapData(rawMapData) {
        const latestVersion = rawMapData.versions[rawMapData.versions.length - 1];

        return {
            id: rawMapData.id,
            name: rawMapData.name,
            description: rawMapData.description,

            // Métadonnées audio
            metadata: {
                songName: rawMapData.metadata.songName,
                songSubName: rawMapData.metadata.songSubName,
                songAuthorName: rawMapData.metadata.songAuthorName,
                levelAuthorName: rawMapData.metadata.levelAuthorName,
                bpm: rawMapData.metadata.bpm,
                duration: rawMapData.metadata.duration
            },

            // Informations de la version actuelle
            version: {
                hash: latestVersion.hash,
                downloadUrl: `${this.cdnBase}/${latestVersion.hash}.zip`,
                previewUrl: `${this.cdnBase}/${latestVersion.hash}.mp3`,
                coverUrl: `${this.cdnBase}/${latestVersion.hash}.jpg`
            },

            // Difficultés disponibles
            difficulties: latestVersion.diffs.map(diff => ({
                difficulty: diff.difficulty,
                characteristic: diff.characteristic,
                stars: diff.stars,
                njs: diff.njs, // Note Jump Speed
                noteCount: diff.notes,
                bombCount: diff.bombs,
                obstacleCount: diff.obstacles
            })),

            // Statistiques
            stats: {
                plays: rawMapData.stats.plays,
                downloads: rawMapData.stats.downloads,
                upvotes: rawMapData.stats.upvotes,
                downvotes: rawMapData.stats.downvotes,
                score: rawMapData.stats.score
            },

            // Uploader
            uploader: {
                id: rawMapData.uploader.id,
                name: rawMapData.uploader.name
            },

            // Tags
            tags: rawMapData.tags || [],

            // Dates
            uploaded: new Date(rawMapData.uploaded),
            createdAt: new Date(rawMapData.createdAt),
            updatedAt: new Date(rawMapData.updatedAt)
        };
    }

    /**
     * Recherche par genre/tag
     * @param {string} genre - Genre musical
     * @param {number} page - Page de résultats
     * @returns {Promise<Object>} Maps du genre spécifié
     */
    async searchByGenre(genre, page = 0) {
        try {
            const params = new URLSearchParams({
                tags: genre,
                sortOrder: 'Rating',
                automapper: 'true'
            });

            const url = `${this.apiBase}/search/text/${page}?${params}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Erreur recherche par genre: ${response.status}`);
            }

            const data = await response.json();
            return {
                docs: data.docs.map(map => this.formatMapData(map)),
                genre,
                currentPage: page
            };

        } catch (error) {
            console.error(`Erreur recherche genre ${genre}:`, error);
            throw error;
        }
    }

    /**
     * Nettoie le cache (utile pour la gestion mémoire)
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Retourne les statistiques du cache
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Instance singleton pour usage global
export const beatSaverService = new BeatSaverService();