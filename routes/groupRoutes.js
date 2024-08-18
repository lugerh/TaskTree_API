// routes/groupRoutes.js
import express from 'express';
import Group from '../../../TaskTree/backend/models/Group.js';
import AuthenticateToken from '../../../TaskTree/backend/middleware/authenticateToken.js';

const router = express.Router();
// Rutas para manejar proyectos
// POST, GET, PUT, DELETE, etc.


router.post('/group/get', AuthenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: "Acceso denegado: No autorizado para consultar grupos de usuarios" });
      }
      const groups = await Group.find();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
});

// Endpoint para crear un nuevo grupo
router.post('/group/new', AuthenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: "Acceso denegado: No autorizado para añadir grupos de usuarios" });
      }
      const newGroup = new Group({
        name: req.body.name,
        members: [] // Inicialmente, el grupo no tiene miembros
      });
  
      const savedGroup = await newGroup.save();
      res.status(201).json(savedGroup);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
});


router.post('/group/addMember', AuthenticateToken, async (req, res) => {

    if (!['Admin', 'GroupAdmin'].includes(req.user.role)) {
      return res.status(403).json({ message: "Acceso denegado" });
    }
  
    const { groupId, userId } = req.body;
  
    try {
      const group = await Group.findById(groupId);
  
      if (!group) {
        return res.status(404).json({ message: "Grupo no encontrado" });
      }
  
      // Añadir el ID del usuario a la lista de miembros del grupo
      if (!group.members.includes(userId)) {
        group.members.push(userId);
        await group.save();
      }
  
      res.json(group);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
});

export default router;