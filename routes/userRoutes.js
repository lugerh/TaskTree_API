import express from 'express'
import { Bun } from 'bun'
import jwt from 'jsonwebtoken'
import yaml from 'js-yaml'
import fs from 'fs'
import User from '../models/User.js'
import Group from '../models/Group.js'
import AuthenticateToken from '../middleware/authenticateToken.js'

const router = express.Router()

// Utilidad para verificar roles
const checkAdmin = (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({
      message: 'Acceso denegado: No tienes permisos suficientes',
    })
  }
}

// Obtener configuración del usuario
router.post('/user/config/get', AuthenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    res.json(user.config)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// Actualizar configuración del usuario
router.post('/user/config/set', AuthenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    user.config = { ...user.config, ...req.body }
    await user.save()
    res.json({ message: 'Configuración actualizada', config: user.config })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// Restablecer configuración a valores predeterminados
router.post('/user/config/reset', AuthenticateToken, async (req, res) => {
  try {
    const configFile = fs.readFileSync('./defaultConfig.yaml', 'utf8')
    const defaultConfig = yaml.load(configFile)

    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    user.config = defaultConfig
    await user.save()
    res.json({ message: 'Configuración restablecida', config: user.config })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// Obtener grupos de usuario (solo admin)
router.post('/user/getGroups', AuthenticateToken, async (req, res) => {
  try {
    if (checkAdmin(req, res)) return
    const userGroups = await Group.find({ members: req.user._id }).select(
      '_id name'
    )
    res.json({ groups: userGroups })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// Mostrar usuarios (solo admin)
router.post('/user/get', AuthenticateToken, async (req, res) => {
  try {
    if (checkAdmin(req, res)) return
    const users = await User.find()
    res.json(users)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// Registrar usuario (solo admin)
router.post('/user/register', AuthenticateToken, async (req, res) => {
  try {
    if (checkAdmin(req, res)) return

    const hashedPassword = await Bun.password.hash(req.body.password, {
      algorithm: 'bcrypt',
      cost: 10,
    })

    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      role: 'User',
    })

    const newUser = await user.save()
    res.status(201).json(newUser)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// Inicio de sesión
router.post('/user/login', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username })
    if (user && (await Bun.password.verify(req.body.password, user.password))) {
      const token = jwt.sign(
        { _id: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      )
      res
        .cookie('access_token', token, { httpOnly: true })
        .json({ message: 'Login exitoso!', token })
    } else {
      res.status(400).json({ message: 'Credenciales incorrectas' })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

export default router
