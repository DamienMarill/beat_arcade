import { Engine, Scene, FreeCamera, Vector3, HemisphericLight, MeshBuilder, StandardMaterial, Color3, Animation, Texture, CreateGround, Sound } from '@babylonjs/core';
import { beatSaverService } from './services/BeatSaverService.js';
import { beatMapParser } from './services/BeatMapParser.js';
import GridHelper from './game/GridHelper.js';
import JSZip from 'jszip';

class BeatBornerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.engine = new Engine(this.canvas, true);
        this.scene = null;
        this.camera = null;
        this.tunnelSegments = [];
        this.speed = 0.1;

        // Système de map et notes
        this.currentMap = null;
        this.gameplayData = null;
        this.notes = [];
        this.gameAudio = null;
        this.startTime = 0;
        this.isPlaying = false;
        this.isReady = false; // Nouveau flag pour savoir si on peut bouger
        this.gridHelper = null;

        // Configuration améliorée
        this.noteSpeed = 10; // Vitesse des notes vers le joueur
        this.spawnDistance = 200; // Distance de spawn des notes (doublée)
        this.renderDistance = 500; // Distance maximale de rendu (très longue)
        this.preSpawnTime = 5; // Temps d'avance pour spawner les notes (secondes)

        // Calcul du délai de démarrage (5 secondes)
        this.startupDelaySeconds = 5; // 5 secondes de parcours avant la musique
        this.startupDelayDistance = this.speed * 60 * this.startupDelaySeconds; // 30 unités
        this.hasStartupDelayPassed = false;

        this.init();
    }

    async init() {
        this.createScene();
        this.createCamera();
        this.createLighting();
        this.createTunnel();

        // Initialiser le helper de grille avec la caméra
        this.gridHelper = new GridHelper(this.scene, this.camera);

        // Charger la map BeatSaver
        await this.loadBeatSaverMap('3ba6');

        this.setupRenderLoop();
        this.handleResize();

        // Masquer l'écran de chargement seulement quand tout est prêt
    }

    createScene() {
        this.scene = new Scene(this.engine);
        this.scene.registerBeforeRender(() => this.update());
    }

    createCamera() {
        this.camera = new FreeCamera('camera', new Vector3(0, 2, -10), this.scene);
        this.camera.setTarget(new Vector3(0, 2, 0));
        this.camera.attachControl(this.canvas, true);

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
        // Ne bouger que si le jeu est prêt
        if (this.isReady) {
            // Mouvement de la caméra vers l'avant
            this.camera.position.z += this.speed;

            // Mettre à jour la grille pour qu'elle suive la caméra
            if (this.gridHelper) {
                this.gridHelper.updateGridPosition();
            }

            // Vérifier si le délai de démarrage est passé pour lancer la musique
            if (!this.hasStartupDelayPassed && this.camera.position.z >= this.startupDelayDistance) {
                this.hasStartupDelayPassed = true;
                this.startMusicAfterDelay();
                console.log(`🎵 Délai de 5 secondes écoulé - Position caméra: ${this.camera.position.z.toFixed(1)}`);
            }

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
        }

        // Animation des matériaux émissifs pour l'effet "pulse"
        const time = performance.now() * 0.001;
        const pulse = Math.sin(time * 3) * 0.2 + 0.8;

        this.scene.materials.forEach(material => {
            if (material.emissiveColor && material.name.includes('rail')) {
                material.emissiveColor = new Color3(pulse, 0.3 * pulse, 0.8 * pulse);
            }
        });

        // Gestion des notes si le jeu est en cours
        if (this.isPlaying && this.gameplayData) {
            this.updateNotes();
        }
    }

    /**
     * Met à jour les notes : visibilité basée sur la distance de la caméra
     */
    updateNotes() {
        const cameraZ = this.camera.position.z; // Position actuelle de la caméra
        const musicTime = this.hasStartupDelayPassed ?
            (cameraZ - this.startupDelayDistance) / (this.speed * 60) : -1; // Temps musical actuel

        this.notes.forEach(noteObj => {
            const { mesh, data, initialZ } = noteObj;

            // Distance de la note par rapport à la caméra (notes FIXES dans l'espace)
            const distanceFromCamera = initialZ - cameraZ;

            // Rendre visible quand la note est dans la zone de vision
            if (!noteObj.isVisible && distanceFromCamera <= 50 && distanceFromCamera > -10) {
                mesh.setEnabled(true);
                noteObj.isVisible = true;
                noteObj.spawned = true;
                console.log(`👁️ Note visible: temps=${data.time.toFixed(2)}s, distance=${distanceFromCamera.toFixed(1)}`);
            }

            // Gérer la note visible
            if (noteObj.isVisible && !noteObj.hit) {

                // Vérifier si la note est passée (derrière la caméra)
                if (distanceFromCamera < -10) {
                    // La note est manquée, la cacher
                    mesh.setEnabled(false);
                    noteObj.hit = true;
                    noteObj.isVisible = false;
                    console.log(`❌ Note manquée: temps=${data.time.toFixed(2)}s`);
                }

                // Effet visuel de proximité amélioré
                if (distanceFromCamera < 20 && distanceFromCamera > 0) {
                    // Augmenter l'intensité émissive quand proche (distance plus longue)
                    const intensity = Math.max(0, (20 - distanceFromCamera) / 20);
                    if (mesh.material) {
                        mesh.material.emissiveIntensity = 0.3 + intensity * 0.7;

                        // Effet de scale quand très proche
                        if (distanceFromCamera < 5) {
                            const scale = 1 + (5 - distanceFromCamera) * 0.1;
                            mesh.scaling.setAll(scale);
                        } else {
                            mesh.scaling.setAll(1);
                        }
                    }
                }

                // Zone de frappe (quand la note est au niveau du joueur)
                if (distanceFromCamera < 2 && distanceFromCamera > -2 && !noteObj.hit) {
                    // La note est dans la zone de frappe
                    if (mesh.material) {
                        mesh.material.emissiveIntensity = 1.0; // Brillance maximale
                    }
                }
            }
        });

        // Log de debug périodique
        const currentTimeSeconds = Math.floor(musicTime);
        if (currentTimeSeconds !== this.lastLogTime && musicTime >= 0) {
            this.lastLogTime = currentTimeSeconds;
            const visibleNotes = this.notes.filter(n => n.isVisible && !n.hit).length;
            const totalNotes = this.notes.length;
            console.log(`🎯 Temps musical: ${musicTime.toFixed(1)}s | Caméra: ${cameraZ.toFixed(1)} | Notes visibles: ${visibleNotes}/${totalNotes}`);
        }
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

    /**
     * Charge une map depuis BeatSaver avec téléchargement du ZIP
     */
    async loadBeatSaverMap(mapId) {
        try {
            console.log(`🎵 Chargement de la map ${mapId}...`);

            // Récupérer les infos de la map
            this.currentMap = await beatSaverService.getMapById(mapId);

            console.log(`✅ Map chargée: ${this.currentMap.metadata.songName}`);
            console.log(`🎤 Artiste: ${this.currentMap.metadata.songAuthorName}`);
            console.log(`🎼 BPM: ${this.currentMap.metadata.bpm}`);

            // Mettre à jour l'interface de chargement
            this.updateLoadingScreen();

            // Télécharger et extraire le ZIP
            console.log('📦 Téléchargement du fichier ZIP...');
            const response = await fetch(this.currentMap.version.downloadUrl);
            const zipBuffer = await response.arrayBuffer();

            const zip = new JSZip();
            const zipFiles = await zip.loadAsync(zipBuffer);

            // Lire le fichier info.dat
            const infoFile = zipFiles.file('info.dat') || zipFiles.file('Info.dat');
            if (!infoFile) {
                throw new Error('Fichier info.dat introuvable');
            }

            const infoData = JSON.parse(await infoFile.async('text'));
            console.log(`📋 Info chargé: ${infoData._difficultyBeatmapSets?.length || 0} sets de difficulté`);

            // Prendre la première difficulté disponible
            const firstDifficultySet = infoData._difficultyBeatmapSets?.[0];
            const firstDifficulty = firstDifficultySet?._difficultyBeatmaps?.[0];

            if (!firstDifficulty) {
                throw new Error('Aucune difficulté trouvée dans la map');
            }

            console.log(`🎮 Difficulté sélectionnée: ${firstDifficulty._difficulty}`);

            // Charger le fichier de difficulté
            const difficultyFile = zipFiles.file(firstDifficulty._beatmapFilename);
            if (!difficultyFile) {
                throw new Error(`Fichier de difficulté ${firstDifficulty._beatmapFilename} introuvable`);
            }

            const difficultyData = JSON.parse(await difficultyFile.async('text'));
            console.log(`🎯 Notes trouvées: ${difficultyData._notes?.length || difficultyData.colorNotes?.length || 0}`);

            // Parser les données réelles
            const parsedData = beatMapParser.parseDifficulty(difficultyData);
            this.gameplayData = beatMapParser.optimizeForGameplay(parsedData, this.currentMap.metadata.bpm);

            console.log(`🎯 ${this.gameplayData.notes.length} notes après conversion 4x2`);

            // Charger la musique
            await this.loadAudio(zipFiles);

            // Créer les notes dans la scène
            this.createNotesFromGameplayData();

            // Afficher le bouton play au lieu de démarrer automatiquement
            this.showPlayButton();

        } catch (error) {
            console.error('❌ Erreur chargement map:', error);
            // Fallback vers données par défaut
            this.createDefaultGameplay();
            this.showPlayButton();
        }
    }

    /**
     * Affiche le bouton play après le chargement
     */
    showPlayButton() {
        // Masquer l'écran de chargement
        document.getElementById('loadingScreen').style.display = 'none';

        // Afficher le bouton play
        document.getElementById('playButton').style.display = 'block';

        console.log('🎮 Prêt à jouer ! Cliquez sur le bouton JOUER');
    }

    /**
     * Charge l'audio de la map depuis le ZIP
     */
    async loadAudio(zipFiles) {
        try {
            console.log('🔍 Recherche de fichiers audio dans le ZIP...');

            // Lister tous les fichiers du ZIP pour debug
            const allFiles = Object.keys(zipFiles.files);
            console.log('📁 Fichiers dans le ZIP:', allFiles);

            // Chercher le fichier audio dans le ZIP
            const audioExtensions = ['.ogg', '.mp3', '.wav', '.egg'];
            let audioFile = null;
            let audioFileName = null;

            for (const extension of audioExtensions) {
                // Chercher song.ogg, puis d'autres noms possibles
                audioFile = zipFiles.file(`song${extension}`) ||
                           zipFiles.file(`audio${extension}`) ||
                           zipFiles.file(`music${extension}`);

                if (audioFile) {
                    audioFileName = `song${extension}`;
                    console.log(`✅ Fichier audio trouvé: ${audioFileName}`);
                    break;
                }
            }

            if (!audioFile) {
                console.log('⚠️ Fichier audio non trouvé dans le ZIP, recherche dans tous les fichiers...');

                // Recherche plus large dans tous les fichiers
                for (const fileName of allFiles) {
                    const lowerName = fileName.toLowerCase();
                    if (lowerName.includes('song') || lowerName.includes('audio') || lowerName.includes('music')) {
                        if (audioExtensions.some(ext => lowerName.endsWith(ext))) {
                            audioFile = zipFiles.file(fileName);
                            audioFileName = fileName;
                            console.log(`✅ Fichier audio alternatif trouvé: ${audioFileName}`);
                            break;
                        }
                    }
                }
            }

            if (!audioFile) {
                console.log('⚠️ Aucun fichier audio trouvé dans le ZIP, utilisation du preview...');

                // Fallback vers preview URL avec Audio API native
                if (this.currentMap && this.currentMap.version.previewUrl) {
                    console.log(`🔗 Utilisation preview URL: ${this.currentMap.version.previewUrl}`);

                    this.gameAudio = new Audio();
                    this.gameAudio.src = this.currentMap.version.previewUrl;
                    this.gameAudio.volume = 0.7;
                    this.gameAudio.preload = 'auto';

                    this.gameAudio.addEventListener('loadeddata', () => {
                        console.log('✅ Audio preview chargé et prêt');
                    });

                    this.gameAudio.addEventListener('error', (e) => {
                        console.error('❌ Erreur chargement preview:', e);
                    });
                }
                return;
            }

            console.log(`🎵 Chargement du fichier audio ${audioFileName}...`);

            // Convertir le fichier en blob pour le jouer
            const audioBlob = await audioFile.async('blob');
            console.log(`📦 Blob audio créé, taille: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

            const audioUrl = URL.createObjectURL(audioBlob);
            console.log(`🔗 URL audio créée: ${audioUrl}`);

            // Utiliser l'API Audio native au lieu de Sound de Babylon.js
            this.gameAudio = new Audio();
            this.gameAudio.src = audioUrl;
            this.gameAudio.volume = 0.7;
            this.gameAudio.preload = 'auto';

            // Événements de l'audio
            this.gameAudio.addEventListener('loadeddata', () => {
                console.log('✅ Audio complet chargé et prêt à jouer');
            });

            this.gameAudio.addEventListener('canplaythrough', () => {
                console.log('🎵 Audio peut être joué entièrement');
            });

            this.gameAudio.addEventListener('error', (e) => {
                console.error('❌ Erreur audio:', e);
                console.error('Code erreur:', this.gameAudio.error?.code);
                console.error('Message erreur:', this.gameAudio.error?.message);
            });

            this.gameAudio.addEventListener('ended', () => {
                console.log('🎵 Lecture audio terminée');
            });

            // Attendre que l'audio soit chargé
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout chargement audio'));
                }, 10000);

                this.gameAudio.addEventListener('loadeddata', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                this.gameAudio.addEventListener('error', (e) => {
                    clearTimeout(timeout);
                    reject(e);
                });
            });

        } catch (error) {
            console.error('❌ Erreur chargement audio:', error);
            console.error('Stack:', error.stack);

            // Fallback vers preview en cas d'erreur
            if (this.currentMap && this.currentMap.version.previewUrl) {
                console.log('🔄 Tentative fallback vers preview...');
                try {
                    this.gameAudio = new Audio();
                    this.gameAudio.src = this.currentMap.version.previewUrl;
                    this.gameAudio.volume = 0.7;
                    this.gameAudio.preload = 'auto';

                    this.gameAudio.addEventListener('loadeddata', () => {
                        console.log('✅ Audio preview de fallback chargé');
                    });
                } catch (fallbackError) {
                    console.error('❌ Erreur même avec le fallback:', fallbackError);
                }
            }
        }
    }

    /**
     * Crée les notes 3D dans la scène avec pré-positionnement complet
     */
    createNotesFromGameplayData() {
        if (!this.gameplayData) return;

        console.log(`🏗️ Création et pré-positionnement de ${this.gameplayData.notes.length} notes...`);

        this.gameplayData.notes.forEach((noteData, index) => {
            const note = this.createNote(noteData, index);

            // Position des notes pour synchronisation parfaite :
            // Les notes sont FIXES dans l'espace, la caméra les rattrape
            // Position = délai_démarrage + (temps_de_la_note × vitesse_caméra_par_seconde)
            const cameraSpeedPerSecond = this.speed * 60; // 0.1 × 60 = 6 unités par seconde
            const finalZ = this.startupDelayDistance + (noteData.time * cameraSpeedPerSecond);

            console.log(`Note ${index}: temps=${noteData.time.toFixed(2)}s → position Z=${finalZ.toFixed(1)}`);
            note.position.set(
                noteData.position3D.x,
                noteData.position3D.y,
                finalZ
            );

            // Toutes les notes sont créées mais désactivées initialement
            note.setEnabled(false);

            this.notes.push({
                mesh: note,
                data: noteData,
                spawned: false,
                hit: false,
                initialZ: finalZ, // Stocker la position Z initiale
                isVisible: false  // Flag pour la visibilité
            });
        });

        console.log(`✅ ${this.notes.length} notes pré-positionnées dans la scène`);

        // Trier les notes par temps pour optimiser les performances
        this.notes.sort((a, b) => a.data.time - b.data.time);
        console.log(`🔄 Notes triées par ordre chronologique`);
    }

    /**
     * Crée une note 3D
     */
    createNote(noteData, index) {
        // Créer le cube de la note
        const note = MeshBuilder.CreateBox(`note_${index}`, {
            width: 0.8,
            height: 0.8,
            depth: 0.8
        }, this.scene);

        // Position initiale (loin devant, calculée selon le timing)
        const spawnZ = noteData.time * this.noteSpeed + this.spawnDistance;
        note.position.set(
            noteData.position3D.x,
            noteData.position3D.y,
            spawnZ
        );

        // Matériau selon le type de note
        const material = new StandardMaterial(`noteMat_${index}`, this.scene);
        if (noteData.type === 0) {
            // Note rouge
            material.diffuseColor = new Color3(1, 0.2, 0.2);
            material.emissiveColor = new Color3(0.8, 0, 0);
        } else {
            // Note bleue
            material.diffuseColor = new Color3(0.2, 0.2, 1);
            material.emissiveColor = new Color3(0, 0, 0.8);
        }

        // Effet de glow
        material.emissiveIntensity = 0.3;
        note.material = material;

        // Rotation continue pour l'effet visuel
        const rotationAnimation = Animation.CreateAndStartAnimation(
            `noteRotation_${index}`,
            note,
            "rotation.y",
            30,
            30,
            0,
            Math.PI * 2,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        // Cache la note initialement
        note.setEnabled(false);

        return note;
    }

    /**
     * Démarre la musique après le délai de 5 secondes
     */
    startMusicAfterDelay() {
        console.log('🎵 Démarrage de la musique après délai...');

        if (this.gameAudio) {
            console.log('🎵 Objet audio trouvé, tentative de lecture...');
            console.log('📊 État audio:', {
                readyState: this.gameAudio.readyState,
                paused: this.gameAudio.paused,
                volume: this.gameAudio.volume,
                duration: this.gameAudio.duration,
                currentTime: this.gameAudio.currentTime
            });

            try {
                // Vérifier si l'audio est suffisamment chargé pour jouer
                if (this.gameAudio.readyState < 2) { // HAVE_CURRENT_DATA
                    console.log('⏳ Audio pas encore prêt, tentative dans 1 seconde...');
                    setTimeout(() => {
                        this.startGame();
                    }, 1000);
                    return;
                }

                // Tenter de jouer l'audio avec l'API native
                const playPromise = this.gameAudio.play();

                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('✅ Audio en cours de lecture confirmé');
                        })
                        .catch(error => {
                            console.error('❌ Erreur lors du play():', error);
                            console.log('🔄 Tentative alternative...');

                            // Réessayer après un court délai
                            setTimeout(() => {
                                try {
                                    this.gameAudio.currentTime = 0;
                                    this.gameAudio.play();
                                } catch (retryError) {
                                    console.error('❌ Échec de l\'alternative:', retryError);
                                }
                            }, 100);
                        });
                } else {
                    console.log('✅ Commande play() exécutée (navigateur ancien)');
                }

                // Vérifier si la lecture a vraiment commencé
                setTimeout(() => {
                    if (this.gameAudio && !this.gameAudio.paused) {
                        console.log('🎵 Audio confirmé en cours de lecture');
                    } else {
                        console.log('⚠️ Audio ne semble pas jouer après tentative...');
                    }
                }, 500);

            } catch (error) {
                console.error('❌ Erreur lors du play():', error);

                // Tenter une approche alternative
                console.log('🔄 Tentative alternative de lecture audio...');
                try {
                    this.gameAudio.volume = 0.5;
                    this.gameAudio.currentTime = 0;
                    this.gameAudio.play();
                } catch (retryError) {
                    console.error('❌ Échec de l\'alternative:', retryError);
                }
            }
        } else {
            console.log('⚠️ Aucun objet audio disponible');
        }

        this.isPlaying = true;
        this.startTime = performance.now();
        console.log('🚀 Jeu démarré ! Timestamp:', this.startTime);

        // Mettre à jour l'interface de jeu
        this.updateGameUI();

        // La grille reste visible en permanence (déjà activée dans startGame)

        // Activer le mouvement de la caméra
        this.isReady = true;
        console.log('✅ Caméra activée, le jeu peut commencer');
    }

    /**
     * Démarre le jeu (mouvement caméra) sans la musique
     */
    startGame() {
        console.log('🚀 Démarrage du jeu (sans musique)...');

        this.isPlaying = true;
        this.startTime = performance.now();
        console.log('🎮 Jeu démarré ! Timestamp:', this.startTime);

        // Mettre à jour l'interface de jeu
        this.updateGameUI();

        // Afficher les guides de grille de façon permanente
        this.gridHelper.showGridGuides();
        console.log('🎮 Grille de debug activée en permanence');

        // Activer le mouvement de la caméra
        this.isReady = true;
        console.log('✅ Caméra activée, parcours de 5 secondes avant la musique');
    }

    /**
     * Met à jour l'écran de chargement avec les infos de la map
     */
    updateLoadingScreen() {
        if (!this.currentMap) return;

        const mapInfo = document.getElementById('mapInfo');
        const songName = document.getElementById('songName');
        const artistName = document.getElementById('artistName');
        const mapperName = document.getElementById('mapperName');
        const bpmInfo = document.getElementById('bpmInfo');
        const loadingText = document.getElementById('loadingText');

        if (mapInfo && songName && artistName && mapperName && bpmInfo) {
            songName.textContent = this.currentMap.metadata.songName || 'Titre inconnu';
            artistName.textContent = `🎤 ${this.currentMap.metadata.songAuthorName || 'Artiste inconnu'}`;
            mapperName.textContent = `👤 Mapper: ${this.currentMap.metadata.levelAuthorName || 'Inconnu'}`;
            bpmInfo.textContent = `🎼 BPM: ${this.currentMap.metadata.bpm || 'N/A'}`;

            mapInfo.style.display = 'block';
        }

        if (loadingText) {
            loadingText.textContent = 'Création des notes 3D...';
        }
    }

    /**
     * Met à jour l'interface de jeu
     */
    updateGameUI() {
        const gameUI = document.getElementById('gameUI');
        const currentSong = document.getElementById('currentSong');
        const gameTime = document.getElementById('gameTime');
        const notesSpawned = document.getElementById('notesSpawned');

        if (gameUI) {
            gameUI.style.display = 'block';
        }

        if (currentSong && this.currentMap) {
            currentSong.textContent = this.currentMap.metadata.songName || 'Map inconnue';
        }

        if (gameTime) {
            // Mettre à jour le temps de jeu en temps réel
            const updateTime = () => {
                if (this.isPlaying) {
                    const currentTime = (performance.now() - this.startTime) / 1000;
                    const minutes = Math.floor(currentTime / 60);
                    const seconds = Math.floor(currentTime % 60);
                    gameTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    setTimeout(updateTime, 1000);
                }
            };
            updateTime();
        }

        if (notesSpawned) {
            notesSpawned.textContent = this.notes ? this.notes.length : 0;
        }
    }

    /**
     * Crée un gameplay par défaut en cas d'erreur
     */
    createDefaultGameplay() {
        console.log('🔄 Utilisation du gameplay par défaut...');
        // Implémenter si nécessaire
    }
}

// Variable globale pour l'instance du jeu
let gameInstance = null;

// Fonction globale pour démarrer le jeu (appelée par le bouton)
window.startBeatBornerGame = () => {
    if (gameInstance && gameInstance.gameAudio && gameInstance.gameplayData) {
        // Masquer le bouton play
        document.getElementById('playButton').style.display = 'none';

        // Démarrer le jeu
        gameInstance.startGame();

        console.log('🚀 Jeu démarré par l\'utilisateur !');
    }
};

// Initialiser le jeu quand la page est chargée
window.addEventListener('DOMContentLoaded', () => {
    gameInstance = new BeatBornerGame();
});
