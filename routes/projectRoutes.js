// routes/projectRoutes.js
import express from "express";
import Group from "../models/Group.js";
import Project from "../models/Project.js";
import AuthenticateToken from "../middleware/authenticateToken.js";

const router = express.Router();

// Rutas para manejar proyectos
// POST, GET, PUT, DELETE, etc.

// Obtener proyectos creados
router.post("/project/get", AuthenticateToken, async (req, res) => {
	try {
		if (req.user.role !== "Admin") {
			return res
				.status(403)
				.json({ message: "No autorizado para consultar proyectos" });
		}
		const projects = await Project.find();
		res.json(projects);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// crear proyecto nuevo en base a estructura
router.post("/project/new", AuthenticateToken, async (req, res) => {
	try {
		const newProject = new Project(req.body);
		//newProject.owner.push(req.user._id);

		// Verificar si req.user está presente y tiene un ID
		if (req.user && req.user._id) {
			newProject.owner = req.user._id;
		} else {
			// Manejar el caso en que req.user o req.user._id no estén disponibles
			return res
				.status(400)
				.json({ message: "Información de usuario no disponible" });
		}

		const savedProject = await newProject.save();
		res.status(201).json(savedProject);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// Ruta para actualizar un proyecto específico
router.post("/project/update", AuthenticateToken, async (req, res) => {
	try {
		const { projectId, updateData } = req.body;
		const project = await Project.findById(projectId);

		if (!project) {
			return res.status(404).json({ message: "Proyecto no encontrado" });
		}

		if (
			project.owner.toString() !== req.user._id.toString() &&
			req.user.role !== "Admin"
		) {
			return res
				.status(403)
				.json({ message: "No autorizado para actualizar este proyecto" });
		}

		// Actualizar los detalles del proyecto
		Object.assign(project, updateData);
		await project.save();

		res.json({ message: "Proyecto actualizado correctamente", project });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// Ruta borrar un proyecto específico
router.post("/project/delete", AuthenticateToken, async (req, res) => {
	try {
		const { projectId } = req.body;
		const project = await Project.findById(projectId);

		if (!project) {
			return res.status(404).json({ message: "Proyecto no encontrado" });
		}

		if (
			project.owner.toString() !== req.user._id.toString() &&
			req.user.role !== "Admin"
		) {
			return res
				.status(403)
				.json({ message: "No autorizado para actualizar este proyecto" });
		}

		// borrar el proyecto
		await project.deleteOne({ _id: projectId });

		res.json({ message: "Proyecto borrado correctamente", project });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// obtener usuarios validos para compartir proyecto
router.post("/project/share/getValid", AuthenticateToken, async (req, res) => {
	try {
		const projectId = req.body.projectId;
		const project = await Project.findById(projectId);

		if (!project) {
			return res.status(404).json({ message: "Proyecto no encontrado" });
		}

		let validUsers = { groupId: null, users: [] };

		if (project.sharedWith.length > 0) {
			// El proyecto ya se ha compartido
			const group = await Group.findById(project.sharedGroup).populate(
				"members",
				"username _id"
			);
			validUsers.groupId = group._id;
			validUsers.users = group.members;
		} else {
			// Si el proyecto aún no se ha compartido
			const userGroups = await Group.find({
				members: { $in: [req.user._id] },
			}).populate("members", "username _id");
			userGroups.forEach((group) => {
				if (!validUsers.groupId) {
					validUsers.groupId = group._id; // Establecer el primer grupo como válido
				}
				validUsers.users.push(...group.members);
			});

			// Eliminar duplicados y el propio usuario
			validUsers.users = validUsers.users.filter(
				(user, index, self) =>
					index ===
						self.findIndex((t) => t._id.toString() === user._id.toString()) &&
					user._id.toString() !== req.user._id.toString()
			);
		}

		res.json(validUsers);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// Obtener usuarios con los que se ha compartido el proyecto.
router.post("/project/share/getJoin", AuthenticateToken, async (req, res) => {
	try {
		const projectId = req.body.projectId;
		const project = await Project.findById(projectId).populate(
			"sharedWith.user"
		);

		if (!project) {
			return res.status(404).json({ message: "Proyecto no encontrado" });
		}

		const sharedUsers = project.sharedWith.reduce((acc, item) => {
			if (item.user) {
				acc.push({
					id: item.user._id,
					username: item.user.username,
					role: item.role,
				});
			}
			return acc;
		}, []);

		res.json({ sharedUsers });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// Añadir usuarios con los que se ha compartido el proyecto.
router.post("/project/share/add", AuthenticateToken, async (req, res) => {
	try {
		const { projectId, groupId, userId, role } = req.body;
		const project = await Project.findById(projectId);

		if (!project) {
			return res.status(404).json({ message: "Proyecto no encontrado" });
		}

		// Comprobar permisos
		if (
			project.owner.toString() !== req.user._id.toString() &&
			req.user.role !== "Admin"
		) {
			return res
				.status(403)
				.json({ message: "No autorizado para compartir este proyecto" });
		}

		// Obtener el grupo (ya sea el existente o el nuevo)
		const group = await Group.findById(project.sharedGroup || groupId);

		if (!group) {
			return res.status(404).json({ message: "Grupo no encontrado" });
		}

		// Verificar si el usuario a añadir pertenece al grupo
		if (!group.members.includes(userId)) {
			return res
				.status(403)
				.json({ message: "El usuario no pertenece al grupo del proyecto" });
		}

		// Verificar si el usuario ya está compartido
		const isAlreadyShared = project.sharedWith.some(
			(shared) => shared.user.toString() === userId
		);
		if (isAlreadyShared) {
			return res
				.status(400)
				.json({ message: "El usuario ya está compartido en este proyecto" });
		}

		// Establecer el grupo si es la primera vez que se comparte
		if (project.sharedWith.length === 0) {
			project.sharedGroup = groupId;
		}

		project.sharedWith.push({ user: userId, role });
		await project.save();

		res.json({ message: "Proyecto compartido correctamente" });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

router.post(
	"/project/share/changeGroup",
	AuthenticateToken,
	async (req, res) => {
		try {
			const { projectId, groupId } = req.body;
			const project = await Project.findById(projectId);

			if (!project) {
				return res.status(404).json({ message: "Proyecto no encontrado" });
			}

			if (
				project.owner.toString() !== req.user._id.toString() &&
				req.user.role !== "Admin"
			) {
				return res
					.status(403)
					.json({
						message: "No autorizado para cambiar el grupo de este proyecto",
					});
			}

			// Si groupId es nulo o vacío, eliminar el grupo asignado y los usuarios compartidos
			if (!groupId) {
				project.sharedGroup = null;
				project.sharedWith = []; // Limpiar la lista de usuarios compartidos
			} else {
				// Cambiar el grupo asignado y borrar la lista de usuarios compartidos si es necesario
				project.sharedGroup = groupId;
				if (project.sharedWith.length > 0) {
					project.sharedWith = []; // Limpiar la lista de usuarios compartidos
				}
			}

			await project.save();
			res.json({ message: "Grupo del proyecto actualizado correctamente" });
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
	}
);

// Añadir usuarios con los que se ha compartido el proyecto.
router.post("/project/share/delete", AuthenticateToken, async (req, res) => {
	try {
		const { projectId, userId } = req.body;
		const project = await Project.findById(projectId);

		if (!project) {
			return res.status(404).json({ message: "Proyecto no encontrado" });
		}

		// Comprobar si el usuario actual es el dueño del proyecto o es Admin
		if (
			project.owner.toString() === req.user._id.toString() ||
			req.user.role === "Admin"
		) {
			// Filtrar el array sharedWith para quitar el usuario especificado
			project.sharedWith = project.sharedWith.filter(
				(shared) => shared.user.toString() !== userId
			);

			// Si ya no hay usuarios compartidos, eliminar el sharedGroup
			if (project.sharedWith.length === 0) {
				project.sharedGroup = null;
			}

			await project.save();
			res.json({ message: "Usuario quitado del proyecto" });
		} else {
			res
				.status(403)
				.json({
					message: "No autorizado para quitar usuarios de este proyecto",
				});
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// ruta para crear un objetivo especifico
router.post("/project/objective/new", AuthenticateToken, async (req, res) => {
	try {
		const { projectId, title, description, text, status, priority } = req.body;
		const project = await Project.findById(projectId);

		if (!project) {
			return res.status(404).json({ message: "Proyecto no encontrado" });
		}

		// Comprobar si el usuario actual es el dueño del proyecto o es Admin
		if (
			project.owner.toString() !== req.user._id.toString() &&
			req.user.role !== "Admin"
		) {
			return res
				.status(403)
				.json({
					message: "No autorizado para eliminar tareas de este proyecto",
				});
		}

		const newObjective = { title, description, text, status, priority };

		project.objectives.push(newObjective);
		await project.save();
		res.json({ message: "Objetivo añadido correctamente", project });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// Ruta para actualizar un objetivo específico
router.post(
	"/project/objective/update",
	AuthenticateToken,
	async (req, res) => {
		try {
			const { projectId, objectiveId, updateData } = req.body;
			const project = await Project.findById(projectId);

			if (!project) {
				return res.status(404).json({ message: "Proyecto no encontrado" });
			}

			if (
				project.owner.toString() !== req.user._id.toString() &&
				req.user.role !== "Admin"
			) {
				return res
					.status(403)
					.json({ message: "No autorizado para actualizar este proyecto" });
			}

			// Encontrar y actualizar el objetivo específico
			const objectiveIndex = project.objectives.findIndex(
				(objective) => objective._id.toString() === objectiveId
			);

			if (objectiveIndex === -1) {
				return res.status(404).json({ message: "Objetivo no encontrado" });
			}

			// Aplicar los cambios al objetivo encontrado
			project.objectives[objectiveIndex] = {
				...project.objectives[objectiveIndex].toObject(),
				...updateData,
			};
			await project.save();

			res.json({ message: "Objetivo actualizado correctamente", project });
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
	}
);

// ruta para borrar un objetivo especifica
router.post(
	"/project/objective/delete",
	AuthenticateToken,
	async (req, res) => {
		try {
			const { projectId, objectiveId } = req.body;
			const project = await Project.findById(projectId);

			if (!project) {
				return res.status(404).json({ message: "Proyecto no encontrado" });
			}

			if (!project) {
				return res.status(404).json({ message: "Objetivo no encontrado" });
			}

			// Comprobar si el usuario actual es el dueño del proyecto o es Admin
			if (
				project.owner.toString() !== req.user._id.toString() &&
				req.user.role !== "Admin"
			) {
				return res
					.status(403)
					.json({
						message: "No autorizado para eliminar tareas de este proyecto",
					});
			}

			// Verificar si el objetivo existe
			const objectiveExists = project.objectives.some(
				(objective) => objective._id.toString() === objectiveId
			);
			if (!objectiveExists) {
				return res.status(404).json({ message: "Objetivo no encontrado" });
			}
			// Si el objetivo existe, encontrar su índice y eliminarlo
			const objectiveIndex = project.objectives.findIndex(
				(objective) => objective._id.toString() === objectiveId
			);
			project.objectives.splice(objectiveIndex, 1);
			await project.save();
			res.json({ message: "Objetivo eliminado correctamente" });
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
	}
);

// ruta para crear una tarea especifica
router.post("/project/task/new", AuthenticateToken, async (req, res) => {
	try {
		const {
			projectId,
			title,
			description,
			text,
			checklist,
			status,
			priority,
			parent,
			hierarchyLevel,
		} = req.body;
		const project = await Project.findById(projectId);

		if (!project) {
			return res.status(404).json({ message: "Proyecto no encontrado" });
		}

		if (
			project.owner.toString() !== req.user._id.toString() &&
			req.user.role !== "Admin"
		) {
			return res
				.status(403)
				.json({ message: "No autorizado para añadir tareas a este proyecto" });
		}

		// Crear el nuevo objeto de tarea con campos obligatorios y opcionales
		const newTask = {
			title,
			description,
			text: text || { shortDescription: {}, longDescription: {} }, // Utiliza un objeto vacío como valor predeterminado si `text` no se proporciona
			checklist: checklist || [], // Utiliza un array vacío como valor predeterminado si `checklist` no se proporciona
			status: status || "Pending", // Utiliza "Pending" como valor predeterminado si `status` no se proporciona
			priority: priority || "Medium", // Utiliza "Medium" como valor predeterminado si `priority` no se proporciona
			parent: parent, // `parent` puede ser undefined, lo cual es aceptable si no se proporciona
			hierarchyLevel: hierarchyLevel,
		};

		// Añadir la nueva tarea al array de tareas del proyecto
		project.tasks.push(newTask);
		await project.save();

		res.json({ message: "Tarea añadida correctamente", project });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// Ruta para actualizar una tarea específico
router.post("/project/task/update", AuthenticateToken, async (req, res) => {
	try {
		const { projectId, taskId, updateData } = req.body;
		const project = await Project.findById(projectId);

		if (!project) {
			return res.status(404).json({ message: "Proyecto no encontrado" });
		}

		if (
			project.owner.toString() !== req.user._id.toString() &&
			req.user.role !== "Admin"
		) {
			return res
				.status(403)
				.json({
					message: "No autorizado para actualizar tareas de este proyecto",
				});
		}

		// Encontrar y actualizar la tarea específica
		const taskIndex = project.tasks.findIndex(
			(task) => task._id.toString() === taskId
		);

		if (taskIndex === -1) {
			return res.status(404).json({ message: "Tarea no encontrada" });
		}

		// Aplicar los cambios a la tarea encontrada
		project.tasks[taskIndex] = {
			...project.tasks[taskIndex].toObject(),
			...updateData,
		};
		await project.save();

		res.json({ message: "Tarea actualizada correctamente", project });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// ruta para borrar una tarea especifica
router.post("/project/task/delete", AuthenticateToken, async (req, res) => {
	try {
		const { projectId, taskId } = req.body;
		const project = await Project.findById(projectId);

		if (!project) {
			return res.status(404).json({ message: "Proyecto no encontrado" });
		}

		// Comprobar si el usuario actual es el dueño del proyecto o es Admin
		if (
			project.owner.toString() !== req.user._id.toString() &&
			req.user.role !== "Admin"
		) {
			return res
				.status(403)
				.json({
					message: "No autorizado para eliminar tareas de este proyecto",
				});
		}

		// Encontrar y eliminar la tarea específica
		const taskIndex = project.tasks.findIndex(
			(task) => task._id.toString() === taskId
		);

		if (taskIndex !== -1) {
			// Eliminar la tarea del array de tareas
			project.tasks.splice(taskIndex, 1);
			await project.save();
			res.json({ message: "Tarea eliminada correctamente" });
		} else {
			res.status(404).json({ message: "Tarea no encontrada" });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

export default router;
