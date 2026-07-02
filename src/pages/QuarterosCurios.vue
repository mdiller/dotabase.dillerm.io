<template>
	<div class="dillerm main-app">
		<div class="dillerm dillerm-content">
			<div class="qc-layout">

				<!-- Selectors -->
				<div class="qc-selectors">
					<dillerm-select
						v-model:value="selectedSeason"
						:options="seasonOptions"
						:searchable="false"
						:emitvalue="true"
						:clearable="false"
						@update:value="onSeasonChange" />
					<dillerm-select
						v-if="currentSeason"
						v-model:value="selectedSet"
						:options="setOptions"
						:searchable="false"
						:emitvalue="true"
						:clearable="false" />
				</div>

				<!-- Conversation feed -->
				<div v-if="currentSet" class="qc-feed">

					<template v-for="(msg, i) in currentSet.messages" :key="i">

						<!-- POPUP (stage direction) -->
						<div v-if="msg.type === 'POPUP'" class="qc-popup">
							<span class="qc-popup-text">{{ msg.text }}</span>
						</div>

						<!-- ITEM reveal card -->
						<div v-else-if="msg.type === 'ITEM'" class="qc-item-card">
							<div class="qc-item-image-wrap">
								<img
									v-if="currentSet.set_image"
									class="qc-item-image"
									:src="`/vpk${currentSet.set_image}`"
									:alt="msg.text"
									@error="onSetImageError($event, currentSet)"
								/>
								<img
									v-else-if="currentSet.hero_icon"
									class="qc-item-image qc-item-image--hero"
									:src="`/vpk${currentSet.hero_icon}`"
									:alt="msg.text"
								/>
								<div v-else class="qc-item-image qc-item-image--placeholder" />
							</div>
							<div class="qc-item-text">
								<div class="qc-item-title">{{ msg.text }}</div>
								<div class="qc-item-subtitle">{{ currentSet.label }}</div>
							</div>
						</div>

						<!-- DIALOGUE message -->
						<div v-else class="qc-msg" :class="{ 'qc-msg--continued': isContinued(i) }">
							<template v-if="!isContinued(i)">
								<div class="qc-avatar-wrap">
									<img
										v-if="character(msg.speaker).portrait"
										class="qc-avatar"
										:src="`/vpk${character(msg.speaker).portrait}`"
										:style="{ objectPosition: character(msg.speaker).objectPosition }"
										:alt="msg.speaker"
									/>
									<div
										v-else
										class="qc-avatar qc-avatar--initial"
										:style="{ background: character(msg.speaker).color }"
									>{{ msg.speaker[0] }}</div>
								</div>
								<div class="qc-msg-body">
									<span class="qc-speaker" :style="{ color: character(msg.speaker).color }">{{ msg.speaker }}</span>
									<span class="qc-text">{{ msg.text }}</span>
								</div>
							</template>
							<template v-else>
								<div class="qc-avatar-spacer" />
								<div class="qc-msg-body">
									<span class="qc-text">{{ msg.text }}</span>
								</div>
							</template>
						</div>

					</template>
				</div>

			</div>
		</div>
	</div>
</template>

<script>
import DillermSelect from '@dillerm/webutils/src/components/controls/DillermSelect.vue';
import data from '../assets/quarteros_curios.json';

const PORTRAIT = '/panorama/images/events/seasonal/visual_novel/portraits/';

const CHARACTERS = {
	'Quartero': {
		portrait: `${PORTRAIT}quartero/quartero_portrait_idle_png.png`,
		color: '#e8c87a',
		objectPosition: '50% 10%',
	},
	'Quintessa': {
		portrait: `${PORTRAIT}quartero_spring_2026/quintessa/quin_idle_01_png.png`,
		color: '#c8a8e8',
		objectPosition: '50% 5%',
	},
	'Blake Sextus': {
		portrait: `${PORTRAIT}quartero_spring_2026/sextus/idle_png.png`,
		color: '#b0b8c8',
		objectPosition: '50% 5%',
	},
	'Galdron': {
		portrait: null,
		color: '#e87a7a',
		objectPosition: '50% 5%',
	},
	'Quartero & Quintessa': {
		portrait: null,
		color: '#ddb8f0',
		objectPosition: '50% 10%',
	},
};

const DEFAULT_CHARACTER = {
	portrait: null,
	color: '#aaaaaa',
	objectPosition: '50% 5%',
};

export default {
	components: { DillermSelect },

	data() {
		return {
			data,
			selectedSeason: data.seasons[0]?.id ?? null,
			selectedSet: data.seasons[0]?.sets[0]?.id ?? null,
		};
	},

	computed: {
		currentSeason() {
			return this.data.seasons.find(s => s.id === this.selectedSeason) ?? null;
		},
		currentSet() {
			return this.currentSeason?.sets.find(s => s.id === this.selectedSet) ?? null;
		},
		seasonOptions() {
			return this.data.seasons.map(s => ({ label: s.label, value: s.id }));
		},
		setOptions() {
			return this.currentSeason?.sets.map(s => ({ label: s.label, value: s.id })) ?? [];
		},
	},

	methods: {
		onSeasonChange(id) {
			const season = this.data.seasons.find(s => s.id === id);
			this.selectedSet = season?.sets[0]?.id ?? null;
		},

		character(speaker) {
			return CHARACTERS[speaker] ?? DEFAULT_CHARACTER;
		},

		isContinued(i) {
			const msgs = this.currentSet.messages;
			if (i === 0) return false;
			const prev = msgs[i - 1];
			const curr = msgs[i];
			return (
				prev.type === 'DIALOGUE' &&
				curr.type === 'DIALOGUE' &&
				prev.speaker === curr.speaker
			);
		},

		onSetImageError(event, set) {
			if (set.hero_icon) {
				event.target.src = `/vpk${set.hero_icon}`;
			} else {
				event.target.style.display = 'none';
			}
		},
	},
};
</script>

<style lang="scss">
.qc-layout {
	display: flex;
	flex-direction: column;
	gap: 0;
	max-width: 860px;
	margin: 0 auto;
	padding: 16px 0;
}

/* ── Selectors ───────────────────────────────────────────── */
.qc-selectors {
	display: flex;
	gap: 10px;
	padding-bottom: 16px;
	border-bottom: 1px solid #2a2d35;

	.dillerm-select {
		width: 220px;

		&:last-child {
			width: 340px;
		}
	}
}

/* ── Feed container ──────────────────────────────────────── */
.qc-feed {
	display: flex;
	flex-direction: column;
	padding-top: 16px;
	gap: 0;
}

/* ── POPUP (stage direction) ─────────────────────────────── */
.qc-popup {
	display: flex;
	justify-content: center;
	padding: 6px 0;
}

.qc-popup-text {
	font-size: 12px;
	font-style: italic;
	color: #606878;
	letter-spacing: 0.05em;
}

/* ── ITEM reveal card ────────────────────────────────────── */
.qc-item-card {
	display: flex;
	align-items: center;
	gap: 12px;
	margin: 14px 0 14px 52px;
	padding: 10px 14px;
	border: 1px solid #2a3a50;
	border-radius: 4px;
	background: #161a22;
	max-width: 400px;
}

.qc-item-image-wrap {
	flex-shrink: 0;
	width: 64px;
	height: 44px;
	overflow: hidden;
	border-radius: 3px;
	background: #0e1016;
}

.qc-item-image {
	width: 100%;
	height: 100%;
	object-fit: cover;

	&--hero {
		object-fit: cover;
		object-position: center center;
	}

	&--placeholder {
		background: #1e2430;
	}
}

.qc-item-text {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.qc-item-title {
	font-size: 13px;
	font-weight: bold;
	color: #c8d4e0;
}

.qc-item-subtitle {
	font-size: 11px;
	color: #5a6878;
}

/* ── DIALOGUE message ────────────────────────────────────── */
.qc-msg {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 2px 0;

	&--continued {
		padding: 1px 0;

		.qc-text {
			color: #8a9bb0;
		}
	}
}

.qc-avatar-wrap {
	flex-shrink: 0;
	width: 40px;
	height: 40px;
}

.qc-avatar {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	object-fit: cover;
	display: block;

	&--initial {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		font-weight: bold;
		color: #1a1e26;
		border-radius: 50%;
	}
}

.qc-avatar-spacer {
	flex-shrink: 0;
	width: 40px;
}

.qc-msg-body {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding-top: 2px;
}

.qc-speaker {
	font-size: 13px;
	font-weight: bold;
}

.qc-text {
	font-size: 14px;
	color: #c0cad6;
	line-height: 1.5;
}
</style>
