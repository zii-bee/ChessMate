import mongoose from 'mongoose';
import mongooseSlugPlugin from 'mongoose-slug-plugin';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: function () { return !this.googleId; } },
  salt: { type: String, required: function () { return !this.googleId; } },
  email: { type: String, required: function () { return !this.googleId; } },
  googleId: { type: String, unique: true, sparse: true }, // Google ID for OAuth login
  profilePicture: { type: String }, // Field for storing the Google profile picture URL
  rank: { type: Number, default: 0 },
  matchesPlayed: { type: Number, default: 0 },
  matchesWon: { type: Number, default: 0 },
  matchesLost: { type: Number, default: 0 },
  matchesDraw: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

UserSchema.plugin(mongooseSlugPlugin, { tmpl: '<%=username%>' });

export default mongoose.model('User', UserSchema);
