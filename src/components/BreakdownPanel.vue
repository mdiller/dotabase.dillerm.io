<template>
	<div class="breakdown-panel">
		<div
			v-for="group in stats"
			:key="group.key"
			class="stat-group"
		>
			<div class="stat-total">
				<span class="stat-label" :style="{ color: group.color }">{{ group.label }}</span>
				<span class="stat-value" :style="{ color: group.color }">{{ fmtVal(group.value) }}</span>
			</div>
			<div
				v-for="(comp, i) in group.components"
				:key="i"
				class="stat-component"
			>
				<span class="comp-sign">+</span>
				<span class="comp-value">{{ fmtVal(comp.value) }}</span>
				<span class="comp-label">{{ comp.label }}</span>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	props: {
		// Array of StatGroup objects from calculationEngine.calculateResources()
		stats: { type: Array, default: () => [] },
	},

	methods: {
		fmtVal(v) {
			if (v === 0) return '0';
			if (Number.isInteger(v)) return String(v);
			// Up to 2 decimal places, no trailing zeros
			return parseFloat(v.toFixed(2)).toString();
		},
	},
};
</script>

<style lang="scss" scoped>
.breakdown-panel {
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-width: 260px;
	padding: 14px 16px;
	background: var(--background-color2);
	border-radius: 5px;
	font-size: 13px;
}

.stat-group {
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.stat-total {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	gap: 8px;
	padding-bottom: 4px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	margin-bottom: 2px;

	.stat-label {
		font-weight: 600;
		font-size: 14px;
	}

	.stat-value {
		font-weight: 700;
		font-size: 15px;
		font-variant-numeric: tabular-nums;
	}
}

.stat-component {
	display: flex;
	align-items: baseline;
	gap: 6px;
	padding-left: 8px;
	color: var(--text-color-secondary, #aaa);

	.comp-sign {
		flex-shrink: 0;
		width: 8px;
		text-align: center;
		opacity: 0.5;
	}

	.comp-value {
		flex-shrink: 0;
		width: 44px;
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: rgba(255, 255, 255, 0.75);
	}

	.comp-label {
		flex: 1;
		opacity: 0.65;
		font-size: 12px;
	}
}
</style>
