import mongoose from '../db/connect.js';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  telegram_chat_id: {
    type: String,
    required: true,
    unique: true
  },
  blocked: {
    type: Boolean,
    default: false
  },
  blacklisted: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  premium: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);