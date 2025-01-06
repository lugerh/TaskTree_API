import User from './models/User.js' // Asegúrate de tener la ruta correcta a tu modelo de usuario
import { Bun } from 'bun'

// Función para crear un usuario administrador si no existe
async function createAdminUser() {
  try {
    const adminExists = await User.findOne({
      username: process.env.BACKEND_ADMIN_USER,
    })
    if (!adminExists) {
      const hashedPassword = await Bun.password.hash(
        process.env.BACKEND_ADMIN_PASSWORD,
        {
          algorithm: 'bcrypt',
          cost: 10, // Ajusta el coste según sea necesario
        }
      )
      const adminUser = new User({
        username: process.env.BACKEND_ADMIN_USER,
        email: process.env.BACKEND_ADMIN_EMAIL,
        password: hashedPassword,
        role: 'Admin',
      })
      await adminUser.save()
      console.log('Administrador creado exitosamente')
    } else {
      console.log('El administrador ya existe')
    }
  } catch (error) {
    console.error('Error creando el usuario administrador:', error)
  }
}

export default createAdminUser
