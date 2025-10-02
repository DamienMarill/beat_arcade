<script>
	import { fade } from 'svelte/transition';

	// Liste des grades actifs à afficher
	let activeGrades = [];
	let nextId = 0;

	// Textes et couleurs selon le grade
	const gradeData = {
		perfect: {
			text: 'PARFAIT!',
			color: 'text-yellow-400',
			shadow: '0 0 10px rgba(255,215,0,0.8)',
			scale: 1.2
		},
		great: {
			text: 'SUPER!',
			color: 'text-cyan-400',
			shadow: '0 0 8px rgba(0,230,255,0.6)',
			scale: 1.1
		},
		good: {
			text: 'BIEN!',
			color: 'text-green-400',
			shadow: '0 0 6px rgba(50,255,50,0.4)',
			scale: 1.0
		},
		miss: {
		text: 'MANQUÉ',
		color: 'text-gray-500',
		shadow: '0 0 4px rgba(128,128,128,0.3)',
		scale: 0.7
	}
	};

	/**
	 * Afficher un grade à une position donnée
	 * @param {string} grade - 'perfect' | 'great' | 'good' | 'miss'
	 * @param {number} screenX - Position X en pixels (coordonnées écran)
	 * @param {number} screenY - Position Y en pixels (coordonnées écran)
	 */
	export function showGrade(grade, screenX, screenY) {
		const id = nextId++;
		const rotation = (Math.random() - 0.5) * 30; // Rotation aléatoire entre -15° et +15°
		const offsetX = (Math.random() - 0.5) * 40; // Offset horizontal aléatoire
		const offsetY = (Math.random() - 0.5) * 20; // Petit offset vertical

		const gradeItem = {
			id,
			grade,
			x: screenX + offsetX,
			y: screenY + offsetY,
			rotation,
			data: gradeData[grade] || gradeData.good
		};

		activeGrades = [...activeGrades, gradeItem];

		// Retirer après 1000ms (durée de la chute + fade out)
		setTimeout(() => {
			activeGrades = activeGrades.filter(g => g.id !== id);
		}, 1000);
	}
</script>

<!-- Conteneur pour tous les grades actifs -->
<div class="fixed inset-0 pointer-events-none z-50">
	{#each activeGrades as gradeItem (gradeItem.id)}
		<div
			class="absolute text-2xl font-black tracking-wide {gradeItem.data.color} falling-grade"
			style="
				--x: {gradeItem.x}px;
				--y: {gradeItem.y}px;
				--rotation: {gradeItem.rotation}deg;
				--scale: {gradeItem.data.scale};
				--shadow: {gradeItem.data.shadow};
				left: var(--x);
				top: var(--y);
				text-shadow: var(--shadow);
			"
		>
			{gradeItem.data.text}
		</div>
	{/each}
</div>

<style>
	@keyframes fall-and-fade {
		0% {
			transform: translate(-50%, -50%) rotate(var(--rotation)) scale(var(--scale)) translateY(0);
			opacity: 1;
		}
		70% {
			transform: translate(-50%, -50%) rotate(var(--rotation)) scale(var(--scale)) translateY(50px);
			opacity: 1;
		}
		100% {
			transform: translate(-50%, -50%) rotate(var(--rotation)) scale(var(--scale)) translateY(100px);
			opacity: 0;
		}
	}
	
	.falling-grade {
		animation: fall-and-fade 1s ease-out forwards;
		will-change: transform, opacity;
	}
</style>