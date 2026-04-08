<template>
	<div class="nameplate-outer">
		<div class="nameplate-scale" :class="{ 'no-scale': !scaled }">
			<div class="nameplate-bar">
				<!-- hp + mana bars, positioned left:21 right:32 top:2 bottom:1 -->
				<div class="bars-container">
					<div class="bar-div" style="height:1px"></div>
					<div class="hp-bar">
						<div class="hp-fill" :style="{ width: hpPercent + '%' }"></div>
						<template v-for="tick in ticks" :key="tick.hp">
							<div
								v-if="tick.show"
								class="tick"
								:style="{ left: tick.left, background: tick.color }" />
						</template>
					</div>
					<div class="bar-div" style="height:2px"></div>
					<div class="mp-bar">
						<div class="mp-fill" :style="{ width: mpPercent + '%' }"></div>
					</div>
					<div class="bar-div" style="height:2px"></div>
				</div>

				<!-- level number, right 32x32 box -->
				<div class="level-box">{{ level }}</div>

				<!-- hero icon: right:-16px top:-16px (sticks out of upper-right corner) -->
				<img v-if="config.hero_id" class="hero-icon" :src="heroIconUrl" />
			</div>
		</div>
	</div>
</template>

<script>
export default {
	props: {
		config: { type: Object, required: true },
		level:  { type: Number, default: 1 },
		scaled: { type: Boolean, default: true }
	},
	computed: {
		hpPercent() {
			if (!this.config.hp_max) return 0;
			return Math.max(0, Math.min(100, this.config.hp_current / this.config.hp_max * 100));
		},
		mpPercent() {
			if (!this.config.mp_max) return 0;
			return Math.max(0, Math.min(100, this.config.mp_current / this.config.mp_max * 100));
		},
		heroIconUrl() {
			return `/api/icon/hero_icon/${this.config.hero_id}`;
		},
		ticks() {
			const max     = this.config.hp_max;
			const current = this.config.hp_current;
			const result  = [];
			for (let hp = 250; hp < max; hp += 250) {
				result.push({
					hp,
					left:  (hp / max * 100) + '%',
					color: hp % 1000 === 0 ? '#3f5d20' : '#8cc64e',
					show:  hp <= current
				});
			}
			return result;
		}
	}
};
</script>

<style lang="scss" scoped>
/* Outer wrapper provides centering and padding for overflow from 2x scale + icon */
.nameplate-outer {
	display: flex;
	justify-content: center;
	padding-top: 20px;
	padding-bottom: 40px;
	overflow: visible;
}

.nameplate-scale {
	transform: scale(2);
	transform-origin: top center;
}

/* 200x32 bar */
.nameplate-bar {
	position: relative;
	width: 200px;
	height: 32px;
	background: #397439;
	border: 1px solid #316231;
	box-sizing: content-box;
}

/* Positioned bars area: left:21 right:32 top:2 bottom:1 */
.bars-container {
	position: absolute;
	left:   21px;
	right:  32px;
	top:    2px;
	bottom: 1px;
	display: flex;
	flex-direction: column;
}

.bar-div {
	flex-shrink: 0;
	background: #030803;
}

/* Health bar fills remaining vertical space */
.hp-bar {
	flex: 1;
	position: relative;
	background: #030803;
}

.hp-fill {
	position: absolute;
	left:   0;
	top:    0;
	bottom: 0;
	background: #adf762;
}

.tick {
	position: absolute;
	width:  1px;
	top:    0;
	bottom: 0;
	z-index: 1;
}

/* Mana bar: fixed 6px height */
.mp-bar {
	flex-shrink: 0;
	height: 6px;
	position: relative;
	background: #030803;
}

.mp-fill {
	position: absolute;
	left:   0;
	top:    0;
	bottom: 0;
	background: #4f78fa;
}

/* Level number: right-side 32x32 box */
.level-box {
	position: absolute;
	right:  0;
	top:    0;
	width:  32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: bold;
	font-size: 16px;
	color: #dadada;
	line-height: 1;
	pointer-events: none;
}

/* Hero icon: upper-left corner, sticks out beyond the bar */
.hero-icon {
	position: absolute;
	width:  36px;
	height: 36px;
	left: -16px;
	top:   -2px;
	image-rendering: pixelated;
	pointer-events: none;
}

.nameplate-scale.no-scale {
	transform: none;
}
</style>
