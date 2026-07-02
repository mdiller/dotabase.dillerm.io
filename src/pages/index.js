import { mdiDatabase, mdiAxeBattle, mdiCalculatorVariant, mdiStore } from '@mdi/js';
import DatabaseQuery from './DatabaseQuery.vue';
import Axe from './Axe.vue';
import ResourceCalculator from './ResourceCalculator.vue';
import QuarterosCurios from './QuarterosCurios.vue';

function mdiSvgUrl(path) {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${path}" fill="#cdd6e0"/></svg>`;
	return `data:image/svg+xml;base64,${btoa(svg)}`;
}

const ICON_STYLE = 'padding: 6px';

export const PAGES = [
	{
		label: "Quartero's Curios",
		value: 'quarteros-curios',
		path: 'quarteros-curios',
		icon: mdiSvgUrl(mdiStore),
		icon_style: ICON_STYLE,
		component: QuarterosCurios
	},
	{
		label: 'Resource Calculator',
		value: 'resource-calculator',
		path: 'calculator',
		icon: mdiSvgUrl(mdiCalculatorVariant),
		icon_style: ICON_STYLE,
		component: ResourceCalculator
	},
	{
		label: 'Database Query',
		value: 'database-query',
		path: 'query',
		icon: mdiSvgUrl(mdiDatabase),
		icon_style: ICON_STYLE,
		component: DatabaseQuery
	},
	{
		label: 'Axe',
		value: 'axe',
		path: 'axe',
		icon: mdiSvgUrl(mdiAxeBattle),
		icon_style: ICON_STYLE,
		component: Axe
	},
];
