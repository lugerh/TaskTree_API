// routes/userRoutes.js
import express from 'express';
import bcrypt  from'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Group from '../models/Group.js';
import AuthenticateToken from '../middleware/authenticateToken.js';
import yaml from 'js-yaml';
import fs from 'fs';

const router = express.Router();


// Rutas para manejar usuarios
// POST, GET, PUT, DELETE, etc.

// devolver config de usuario
router.post('/user/config/get', AuthenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(user.config);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// editar config de usuario
router.post('/user/config/set', AuthenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    user.config = { ...user.config, ...req.body };
    await user.save();
    res.json({ message: "Configuración actualizada", config: user.config });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// reiniciar config a fabrica de usuario
router.post('/user/config/reset', AuthenticateToken, async (req, res) => {
  let defaultConfig;
  try {
    const configFile = fs.readFileSync('./defaultConfig.yaml', 'utf8');
    defaultConfig = yaml.load(configFile);
  } catch (e) {
    console.log(e);
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    user.config = defaultConfig;
    await user.save();
    res.json({ message: "Configuración restablecida", config: user.config });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// devolver grupos de usuario
router.post('/user/getGroups', AuthenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: "Acceso denegado: No autorizado para consultar grupos de usuarios" });
    }
    // Buscar los grupos a los que pertenece el usuario
    const userGroups = await Group.find({ members: req.user._id }).select('_id name');

    res.json({ groups: userGroups });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//mostrar usuario 
router.post('/user/get', AuthenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: "Acceso denegado: No autorizado para consultar grupos de usuarios" });
      }
      const users = await User.find();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
});


// registrar usuario.
router.post('/user/register', async (req, res) => {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const user = new User({
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword,
        role: 'User' // Asignar rol por defecto
      });
  
      const newUser = await user.save();
      res.status(201).json(newUser);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
});

// login
router.post('/user/login', async (req, res) => {
    try {
      const user = await User.findOne({ username: req.body.username });
      if (user && await bcrypt.compare(req.body.password, user.password)) {
        // Generar el token
        const token = jwt.sign({
            _id: user._id,
            username: user.username,
            role: user.role 
        }, process.env.JWT_SECRET, { expiresIn: '24h' });
  
        // Enviar el token como respuesta
        res
          .json({ message: "Login exitoso!", token: token })
          .cookie('access_token', token, {
            httpOnly: true
          })
      } else {
        // Enviar respuesta de credenciales incorrectas
        res.status(400).json({ message: "Credenciales incorrectas" });
      }
    } catch (error) {
      // Enviar respuesta de error
      res.status(500).json({ message: error.message });
    }
});


export default router;