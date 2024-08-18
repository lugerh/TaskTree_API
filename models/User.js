// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  role: { 
    type: String, 
    enum: ['Admin', 'GroupAdmin', 'User'], 
    default: 'User' 
  },
  config: { 
    type: Object, 
    default: { 
      // Aquí puedes poner las configuraciones por defecto
      theme: 'breathDark', // Por ejemplo, un tema por defecto
      // Otras configuraciones por defecto
    }
  },
});

export default mongoose.model('User', userSchema);