import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  
  // Category and Priority
  category: {
    type: String,
    required: true,
    enum: [
      'roads_transport',
      'water_sewage',
      'electricity',
      'waste_management',
      'public_safety',
      'parks_recreation',
      'street_lighting',
      'noise_pollution',
      'air_pollution',
      'building_violations',
      'other'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  
  // Location Information
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  address: {
    street: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: String,
    country: { type: String, default: 'USA' }
  },
  landmark: String,
  
  // Media Attachments
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    filename: String,
    size: Number,
    mimeType: String,
    thumbnailUrl: String // For videos
  }],
  
  // Reporter Information
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  
  // Status and Workflow
  status: {
    type: String,
    enum: ['submitted', 'validated', 'in_progress', 'resolved', 'rejected', 'duplicate'],
    default: 'submitted'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  aiPriorityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  
  // Department Assignment
  assignedDepartment: {
    code: String,
    name: String
  },
  assignedStaff: [{
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: { type: Date, default: Date.now },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Validation and Voting
  validation: {
    isValidated: { type: Boolean, default: false },
    validatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    validatedAt: Date,
    validationNotes: String
  },
  
  // Public Voting System
  votes: {
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    totalVotes: { type: Number, default: 0 }
  },
  
  // Comments and Updates
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    isPublic: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  }],
  
  statusUpdates: [{
    status: String,
    message: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: { type: Date, default: Date.now },
    isPublic: { type: Boolean, default: true }
  }],
  
  // Duplicate Detection
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  },
  duplicates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  }],
  
  // Analytics and Metrics
  views: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  
  // SLA and Timeline
  sla: {
    expectedResolutionTime: Number, // in hours
    actualResolutionTime: Number,
    isOverdue: { type: Boolean, default: false },
    escalationLevel: { type: Number, default: 0 }
  },
  
  // Resolution Information
  resolution: {
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolutionNotes: String,
    resolutionImages: [String], // URLs to before/after images
    satisfactionRating: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  
  // Metadata
  tags: [String],
  isPublic: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  reportNumber: { type: String, unique: true }, // Auto-generated unique ID
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for performance
reportSchema.index({ location: '2dsphere' });
reportSchema.index({ category: 1, status: 1 });
reportSchema.index({ reporterId: 1 });
reportSchema.index({ status: 1, priority: 1 });
reportSchema.index({ 'assignedDepartment.code': 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ reportNumber: 1 });
reportSchema.index({ aiPriorityScore: -1 });

// Generate unique report number before saving
reportSchema.pre('save', async function(next) {
  if (!this.reportNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.reportNumber = `REP-${timestamp}-${random}`;
  }
  next();
});

// Virtual for full address
reportSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street || ''}, ${addr.city}, ${addr.state} ${addr.zipCode || ''}`.trim();
});

// Instance methods
reportSchema.methods.updateStatus = function(newStatus, updatedBy, message = '') {
  this.status = newStatus;
  this.statusUpdates.push({
    status: newStatus,
    message,
    updatedBy,
    updatedAt: new Date()
  });
  
  if (newStatus === 'resolved') {
    this.resolution.resolvedAt = new Date();
    this.resolution.resolvedBy = updatedBy;
  }
  
  return this.save();
};

reportSchema.methods.addComment = function(userId, message, isPublic = true) {
  this.comments.push({
    userId,
    message,
    isPublic,
    createdAt: new Date()
  });
  return this.save();
};

// Static methods
reportSchema.statics.findNearby = function(longitude, latitude, maxDistance = 5000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    isPublic: true,
    status: { $ne: 'rejected' }
  });
};

reportSchema.statics.findByCategory = function(category, status = null) {
  const query = { category, isPublic: true };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

reportSchema.statics.getAnalytics = function(startDate, endDate) {
  const matchStage = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          category: '$category',
          status: '$status'
        },
        count: { $sum: 1 },
        avgResolutionTime: { $avg: '$sla.actualResolutionTime' },
        avgPriority: { $avg: '$aiPriorityScore' }
      }
    }
  ]);
};

export default mongoose.model('Report', reportSchema);