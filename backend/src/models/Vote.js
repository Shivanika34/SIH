import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    required: true
  },
  voteType: {
    type: String,
    enum: ['upvote', 'downvote'],
    required: true
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one vote per user per report
voteSchema.index({ userId: 1, reportId: 1 }, { unique: true });
voteSchema.index({ reportId: 1 });
voteSchema.index({ userId: 1 });

export default mongoose.model('Vote', voteSchema);