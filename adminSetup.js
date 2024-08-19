import UserRepository from './repositories/UserRepository.js' // Asegúrate de importar tu repositorio de usuarios adecuadamente

// Función para crear un usuario administrador si no existe
async function createAdminUser() {
  const adminExists = await UserRepository.findOne({ role: 'admin' })
  if (!adminExists) {
    UserRepository.create({
      username: process.env.BACKEND_ADMIN_USER,
      password: process.env.BACKEND_ADMIN_PASSWORD,
      role: 'admin',
    })
      .then(() => {
        console.log('Administrador creado exitosamente')
      })
      .catch((err) => {
        console.error('Error creando el usuario administrador:', err)
      })
  }
}

export default createAdminUser
