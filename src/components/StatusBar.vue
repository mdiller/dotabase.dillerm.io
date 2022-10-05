<template>
	<div 
		class="status-bar"
		:style="{ 'background-color': STATUS_INFOS[status].color }">
		{{ STATUS_INFOS[status].label }}
		<span v-if="text">
			{{ text }}
		</span>
	</div>
</template>

<script>

// statuses: success, pending, error

const STATUS_INFOS = {
	success: {
		label: "Success",
		color: "#3a8e5c"
	},
	pending: {
		label: "Pending...",
		color: "#389688"
	},
	error: {
		label: "",
		color: "#f04337"
	}
}

export default {
	props: {
		status: {
			type: String,
			required: true
		},
		text: {
			type: String,
			required: false,
			default: ""
		}
	},
	created() {
		this.STATUS_INFOS = STATUS_INFOS;
	}
};
</script>

<style lang="scss">

.status-bar {
	width: 100%;
	border-radius: 0px 0px 5px 5px;

	padding: 8px;

	transition: background-color 0.25s;
}

</style>