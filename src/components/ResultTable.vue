<template>
	<table class="result-table">
		<tr>
			<th v-for="column in columns">
				{{ column }}
			</th>
		</tr>
		<tr v-for="row in rows">
			<td v-for="column in columns" v-html="row[column]">
			</td>
		</tr>
	</table>
</template>

<script>

function escapeHtml(unsafe)
{
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
 }

const ATTRIBUTE_ICON_PREFIX = "/vpk/panorama/images/primary_attribute_icons/primary_attribute_icon_strength_psd.png";

const collapse_threshold = 100;

const PRETTY_TYPES = [
	{ // image
		regex: new RegExp('^(?!/vpk)/.*\\.png$'),
		thing: value => {
			var link = `/vpk${value}`;
			return `<a href="${link}" target="_blank"><img loading="lazy" src="${link}"></a>`;
		}
	},
	{ // stat
		regex: new RegExp('^(strength|agility|intelligence)$'),
		thing: value => {
			return `<img src="/vpk/panorama/images/primary_attribute_icons/primary_attribute_icon_${value}_psd.png">`;
		}
	},
	{ // hex color
		regex: new RegExp('^#[a-z0-9]{6}$'),
		thing: value => {
			return `<span style="color: ${value}">${value}</span>`;
		}
	},
	{ // json data
		regex: new RegExp(`^[\\{\\[][\\s\\S]+[\\}\\]]$`, "m"),
		thing: value => {
			return `<details><summary>JSON</summary><pre>${value}</pre></details>`;
		}
	},
	{ // collapsible section
		regex: new RegExp(`^.{${collapse_threshold}}.+$`, "m"),
		thing: value => {
			var truncated = escapeHtml(value.substring(0, 25) + "...");
			return `<details><summary>${truncated}</summary>${value}</details>`;
		}
	},
	{ // link
		regex: new RegExp(`^https?://.*`, "m"),
		thing: value => {
			return `<a href="${value}">${value}</a>`;
		}
	},
	{ // audio mp3
		regex: new RegExp('^(?!/vpk)/.*\\.mp3$'),
		thing: value => {
			return `<audio controls preload="none"><source src="/vpk${value}" type="audio/mp3"/></audio>`;
		}
	},
	{ // audio wav
		regex: new RegExp('^(?!/vpk)/.*\\.wav$'),
		thing: value => {
			return `<audio controls preload="none"><source src="/vpk${value}" type="audio/wav"/></audio>`;
		}
	}
];

export default {
	props: {
		value: {
			type: Array,
			required: true
		}
	},
	computed: {
		rows() {
			var thing = (this.value || []).map(row => {
				var new_row = {};
				Object.keys(row).forEach(key => {
					var value = row[key];
					var pretty_type = PRETTY_TYPES.find(p => p.regex.test(value));
					if (value == null) {
						value = "<pre>NULL</pre>";
					}
					new_row[key] = pretty_type ? pretty_type.thing(value) : value;
				});
				return new_row;
			});
			return thing;
		},
		columns() {
			var result = [];
			this.rows.forEach(row => {
				Object.keys(row).forEach(key => {
					if (!result.includes(key)) {
						result.push(key);
					}
				});
			});
			return result;
		}
	}
};
</script>

<style lang="scss">

.result-table {
	// width: 100%;
	border-collapse: collapse;
	border-spacing: 0;

	&,
	& td,
	& th {
		border: 1px solid var(--background-color3);
	}

	th {
		background-color: var(--background-color2);
	}

	td, th {
		padding: 10px;
	}

	td {
		height: 1px;

		> pre {
			font-family: var(--input-numerical-font-family);
			font-size: var(--input-numerical-font-size);
		}

		> img,
		> a > img {
			max-height: 37px;
			margin: -10px;
			vertical-align: middle;
			display:block;
			margin-left: auto;
			margin-right: auto;
		}

		details {
			summary {
				cursor: pointer;
				white-space: nowrap;
			}

			&[open] {
				summary {
					opacity: 50%;
				}
			}

			pre {
				font-family: var(--input-numerical-font-family);
				font-size: var(--input-numerical-font-size);
				background-color: var(--background-color3);
				padding: 10px;
			}
		}
	}
}

</style>