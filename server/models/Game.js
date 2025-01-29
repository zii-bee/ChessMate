import mongoose from 'mongoose';
import mongooseSlugPlugin from 'mongoose-slug-plugin';

const GameSchema = new mongoose.Schema({
  whiteUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blackUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  code: { type: String, unique: true, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['waiting', 'in-progress', 'terminated', 'completed'],
    default: 'waiting' 
  },
  pgn: { type: String, default: '' },
  gameResult: { 
    type: String, 
    enum: ['white', 'black', 'draw', 'undecided'],
    default: 'undecided' 
  },
  createdAt: { type: Date, default: Date.now },
  slug: { type: String, unique: true },
});

GameSchema.plugin(mongooseSlugPlugin, { tmpl: '<%=code%>' });

export default mongoose.model('Game', GameSchema);
