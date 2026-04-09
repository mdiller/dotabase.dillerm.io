<template>
	<div class="breakdown-panel">
		<div class="breakdown-header">
			<span class="breakdown-title">Calculations</span>
			<div class="breakdown-actions">
				<button class="icon-btn" title="Expand all" @click="expandAll">
					<svg viewBox="0 0 24 24" width="22" height="22"><path :d="mdiPlusThick" fill="currentColor" /></svg>
				</button>
				<button class="icon-btn" title="Collapse all" @click="collapseAll">
					<svg viewBox="0 0 24 24" width="22" height="22"><path :d="mdiMinusThick" fill="currentColor" /></svg>
				</button>
			</div>
		</div>

		<div class="breakdown-body">
			<div
				v-for="group in stats"
				:key="group.key"
				class="stat-group"
			>
				<div
					class="stat-total"
					:class="{ collapsed: collapsed.has(group.key), clickable: group.components.length > 0 }"
					@click="toggle(group.key, group.components.length)"
				>
					<span class="stat-label" :style="{ color: group.color }">{{ group.label }}</span>
					<span class="stat-value" :style="{ color: group.color }">{{ fmtVal(group.value, group.format) }}</span>
				</div>
				<template v-if="!collapsed.has(group.key)">
					<div
						v-for="(comp, i) in group.components"
						:key="i"
						class="stat-component"
					>
						<span class="comp-sign">+</span>
						<span class="comp-value">{{ fmtVal(comp.value, group.format) }}</span>
						<span class="comp-label">{{ comp.label }}</span>
					</div>
				</template>
			</div>
		</div>
	</div>
</template>

<script>
import { mdiPlusThick, mdiMinusThick } from '@mdi/js';

export default {
	props: {
		stats: { type: Array, default: () => [] },
	},

	data() {
		return {
			collapsed: new Set(),
			mdiPlusThick,
			mdiMinusThick,
		};
	},

	methods: {
		toggle(key, componentCount) {
			if (componentCount === 0) return;
			const next = new Set(this.collapsed);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			this.collapsed = next;
		},

		collapseAll() {
			this.collapsed = new Set(this.stats.filter(g => g.components.length > 0).map(g => g.key));
		},

		expandAll() {
			this.collapsed = new Set();
		},

		fmtVal(v, format) {
			if (format === 'percent') {
				return parseFloat((v * 100).toFixed(1)) + '%';
			}
			if (v === 0) return '0';
			if (Number.isInteger(v)) return String(v);
			return parseFloat(v.toFixed(2)).toString();
		},
	},
};
</script>

<style lang="scss" scoped>
.breakdown-panel {
	display: flex;
	flex-direction: column;
	min-width: 290px;
	background: var(--background-color2);
	border-radius: 5px;
	font-size: 13px;
	overflow: hidden;
}

.breakdown-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 32px;
	padding: 0 10px 0 14px;
	background: var(--background-color3, #111);
	border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	flex-shrink: 0;
}

.breakdown-title {
	font-weight: 700;
	font-size: 13px;
	color: rgba(255, 255, 255, 0.88);
	letter-spacing: 0.03em;
}

.breakdown-actions {
	display: flex;
	align-items: center;
	gap: 2px;
}

.icon-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	background: none;
	border: none;
	border-radius: 4px;
	color: rgba(255, 255, 255, 0.45);
	cursor: pointer;
	padding: 0;
	transition: color 0.15s, background 0.15s;

	&:hover {
		color: rgba(255, 255, 255, 0.85);
		background: rgba(255, 255, 255, 0.08);
	}
}

.breakdown-body {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 14px 16px;
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
	user-select: none;

	&.clickable {
		cursor: pointer;

		&:hover {
			border-bottom-color: rgba(255, 255, 255, 0.2);
		}
	}

	&.collapsed {
		margin-bottom: 0;
		opacity: 0.75;
	}

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
