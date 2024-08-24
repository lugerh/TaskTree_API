import express, { json } from 'express'
import cors from 'cors'

import mongoose from 'mongoose'
import cookieParser from 'cookie-parser'

import projectRoutes from './routes/projectRoutes.js'
import groupRoutes from './routes/groupRoutes.js'
import userRoutes from './routes/userRoutes.js'
import createAdminUser from './adminSetup.js'

const { connect, connection } = mongoose
const app = express()

// Conexión a MongoDB
connect(process.env.MONGO_URI)
const db = connection
db.on('error', console.error.bind(console, 'Error de conexión a MongoDB:'))
db.once('open', () => {
  console.log('Conectado exitosamente a MongoDB')
  createAdminUser()
})

// use cors para evitar errores con la resolucion del frontend react
app.use(cors())
app.use(cookieParser())

// Middleware
app.use(json())

// Rutas
app.get('/', (req, res) => {
  res.send('TaskTree backend WORKING! 24/8/24 CODE BEERS !!')
})

app.use('/api', [projectRoutes, groupRoutes, userRoutes])

const PORT = process.env.PORT || 8080
// const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto http://localhost:${PORT}`)
})
