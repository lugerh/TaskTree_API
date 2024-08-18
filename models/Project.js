// models/Project.js
import mongoose from "mongoose";

const checklistItemSchema = new mongoose.Schema({
	completed: {
		type: Boolean,
		required: true,
		default: false,
	},
	shortDescription: {
		type: String,
		required: true,
	},
	longDescription: {
		type: String,
		required: false,
	},
});

// const textSchema = new mongoose.Schema({
// 	shortDescription: {
// 		type: String,
// 		required: true,
// 	},
// 	longDescription: {
// 		type: String,
// 		required: false,
// 	},
// });

const taskSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
	},
	description: {
		type: String,
		required: true,
	},
	text: {
		shortDescription: {
			type: String,
			required: true,
		},
		longDescription: {
			type: String,
			required: false,
		},
	},
	checklist: [checklistItemSchema],
	status: {
		type: String,
		enum: ["Pending", "In Progress", "Completed"],
		default: "Pending",
	},
	priority: {
		type: String,
		enum: ["High", "Medium", "Low"],
		default: "Medium",
	},
	parent: {
		type: mongoose.Schema.Types.ObjectId,
		required: false,
	},
	hierarchyLevel: {
		type: Number,
		required: true,
	},
});

const objectiveSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
	},
	description: {
		type: String,
		required: true,
	},
	text: {
		type: String,
		required: true,
	},
	status: {
		type: String,
		enum: ["Pending", "In Progress", "Completed"],
		default: "Pending",
	},
	priority: {
		type: String,
		enum: ["High", "Medium", "Low"],
		default: "Medium",
	},
});

const sharedUserSchema = new mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
	role: {
		type: String,
		enum: ["Read", "ReadWrite"],
		required: true,
	},
});

const projectSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
	},
	description: {
		type: String,
		required: true,
	},
	text: {
		type: String,
		required: true,
	},
	objectives: [objectiveSchema],
	tasks: [taskSchema],
	owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
	sharedGroup: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
	sharedWith: [sharedUserSchema],
});

export default mongoose.model("Project", projectSchema);
