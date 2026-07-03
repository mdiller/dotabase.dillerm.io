<template>
	<div class="dillerm main-app">
		<div class="dillerm dillerm-content">
			<div class="qc-layout">

				<!-- Character sidebar -->
				<div v-if="currentSetSpeakers.length" class="qc-sidebar">
					<div
						v-for="speaker in currentSetSpeakers"
						:key="speaker"
						class="qc-sidebar-char"
						:class="{ 'qc-sidebar-char--active': playingSpeaker === speaker }"
					>
						<div class="qc-sidebar-avatar-ring">
							<img
								v-if="character(speaker).portrait"
								class="qc-sidebar-avatar"
								:src="`/vpk${character(speaker).portrait}`"
								:style="{ objectPosition: character(speaker).objectPosition }"
								:alt="speaker"
							/>
							<div
								v-else
								class="qc-sidebar-avatar qc-sidebar-avatar--initial"
								:style="{ background: character(speaker).color }"
							>{{ speaker[0] }}</div>
						</div>
					</div>
				</div>

				<!-- Set image panel (right) -->
				<div v-if="currentSet && (currentSet.set_image || currentSet.hero_icon)" class="qc-set-image-panel">
					<img
						class="qc-set-image"
						:src="`/vpk${currentSet.set_image || currentSet.hero_icon}`"
						:alt="currentSet.label"
					/>
				</div>

				<!-- Main content -->
				<div class="qc-main">

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
						<button
							class="qc-icon-btn"
							:class="{ toggled: autoplay }"
							title="Toggle Autoplay"
							@click="autoplay = !autoplay"
						>
							<svg viewBox="0 0 24 24" width="20" height="20">
								<path :d="autoplay ? mdiVolumeHigh : mdiVolumeOff" fill="currentColor" />
							</svg>
						</button>
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
								<div class="qc-item-text">
									<div class="qc-item-title">{{ msg.text }}</div>
									<div class="qc-item-subtitle">{{ currentSet.label }}</div>
								</div>
							</div>

							<!-- DIALOGUE message -->
							<div
								v-else
								class="qc-msg"
								:class="{
									'qc-msg--continued': isContinued(i),
									'qc-msg--playable': msg.audio,
									'qc-msg--playing': playingIndex === i,
								}"
								:title="!msg.audio ? 'No audio available' : undefined"
								@click="msg.audio && playLine(msg.audio, i)"
							>
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
	</div>
</template>

<script>
import DillermSelect from '@dillerm/webutils/src/components/controls/DillermSelect.vue';
import { mdiVolumeHigh, mdiVolumeOff } from '@mdi/js';
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
			playingIndex: null,
			autoplay: true,
			mdiVolumeHigh,
			mdiVolumeOff,
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
		currentSetSpeakers() {
			if (!this.currentSet) return [];
			const seen = new Set();
			const result = [];
			for (const msg of this.currentSet.messages) {
				if (msg.type === 'DIALOGUE' && !seen.has(msg.speaker)) {
					seen.add(msg.speaker);
					result.push(msg.speaker);
				}
			}
			return result;
		},
		playingSpeaker() {
			if (this.playingIndex === null || !this.currentSet) return null;
			return this.currentSet.messages[this.playingIndex]?.speaker ?? null;
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

		stopAudio() {
			if (this._audio) {
				this._audio.pause();
				this._audio = null;
			}
			this.playingIndex = null;
		},

		playLine(audioPath, index) {
			const wasPlaying = this.playingIndex === index;
			this.stopAudio();
			if (wasPlaying) return;
			this.playingIndex = index;
			const audio = new Audio(`/vpk${audioPath}`);
			this._audio = audio;
			audio.addEventListener('ended', () => {
				if (this.playingIndex !== index) return;
				this.playingIndex = null;
				if (this.autoplay) {
					const msgs = this.currentSet?.messages ?? [];
					for (let j = index + 1; j < msgs.length; j++) {
						if (msgs[j].audio) {
							setTimeout(() => this.playLine(msgs[j].audio, j), 250);
							return;
						}
					}
				}
			});
			audio.play();
		},
	},

	watch: {
		currentSet() {
			this.stopAudio();
		},
	},
};
</script>

<style lang="scss">
.qc-layout {
	position: relative;
	max-width: 860px;
	margin: 0 auto;
	padding: 16px 0;
}

/* ── Character sidebar ───────────────────────────────────── */
.qc-sidebar {
	position: absolute;
	right: calc(100% + 32px);
	top: 8px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 32px;
	width: 264px;
}

.qc-sidebar-char {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
}

.qc-sidebar-avatar-ring {
	width: 240px;
	height: 240px;
	position: relative;
	box-sizing: border-box;

	&::before {
		content: '';
		position: absolute;
		--ring-diameter: 112px;
		width: var(--ring-diameter);
		height: var(--ring-diameter);
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		border-radius: 50%;
		border: 4px solid transparent;
		transition: border-color 0.2s, box-shadow 0.2s;
		z-index: 0;
		pointer-events: none;
	}

	.qc-sidebar-char--active &::before {
		border-color: #4a9fd4;
		box-shadow: 0 0 20px rgba(74, 159, 212, 0.5);
	}
}

.qc-sidebar-avatar {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
	position: relative;
	z-index: 1;

	&--initial {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 84px;
		font-weight: bold;
		color: #1a1e26;
		border-radius: 50%;
	}
}


/* ── Set image panel (right) ─────────────────────────────── */
.qc-set-image-panel {
	position: absolute;
	left: calc(100% + 32px);
	top: 8px;
	width: 264px;
}

.qc-set-image {
	width: 100%;
	height: auto;
	display: block;
	border-radius: 4px;
}

/* ── Selectors ───────────────────────────────────────────── */
.qc-selectors {
	display: flex;
	align-items: center;
	gap: 10px;
	padding-bottom: 16px;
	border-bottom: 1px solid #2a2d35;

	.dillerm-select {
		width: 220px;

		&:nth-child(2) {
			width: 340px;
		}
	}
}

.qc-icon-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	flex-shrink: 0;
	background: none;
	border: none;
	border-radius: 4px;
	color: rgba(255, 255, 255, 0.35);
	cursor: pointer;
	padding: 0;
	transition: color 0.15s, background 0.15s;

	&:hover {
		color: rgba(255, 255, 255, 0.75);
		background: rgba(255, 255, 255, 0.07);
	}

	&.toggled {
		color: #6ab0e8;

		&:hover {
			color: #8dc8f8;
			background: rgba(100, 160, 230, 0.1);
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
	border-radius: 4px;

	&--continued {
		padding: 1px 0;

		.qc-text {
			color: #8a9bb0;
		}
	}

	&--playable {
		cursor: pointer;

		&:hover {
			background: #1a1f2a;
		}
	}

	&--playing {
		background: #1a2030;

		.qc-text {
			color: #d8e4f0;
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
