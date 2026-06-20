import mongoose from '../db/connect.js';

const scrapedContentSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    required: false,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  external: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  usage: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  scrapedAt: {
    type: Date,
    default: Date.now
  },
  isGlobal: {
    type: Boolean,
    default: false
  },
  userIds: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

export default mongoose.model('ScrapedContent', scrapedContentSchema);