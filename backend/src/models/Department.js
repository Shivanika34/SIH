import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Contact Information
  contactInfo: {
    phone: String,
    email: String,
    address: String,
    website: String
  },
  
  // Categories this department handles
  categories: [{
    type: String,
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
  }],
  
  // SLA Configuration
  sla: {
    responseTime: { type: Number, default: 24 }, // hours
    resolutionTime: { type: Number, default: 168 }, // hours (7 days)
    escalationThreshold: { type: Number, default: 72 } // hours
  },
  
  // Working Hours
  workingHours: {
    monday: { start: String, end: String },
    tuesday: { start: String, end: String },
    wednesday: { start: String, end: String },
    thursday: { start: String, end: String },
    friday: { start: String, end: String },
    saturday: { start: String, end: String },
    sunday: { start: String, end: String }
  },
  
  // Department Head
  head: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Statistics
  stats: {
    totalStaff: { type: Number, default: 0 },
    activeReports: { type: Number, default: 0 },
    resolvedReports: { type: Number, default: 0 },
    avgResolutionTime: { type: Number, default: 0 }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
departmentSchema.index({ code: 1 });
departmentSchema.index({ categories: 1 });

export default mongoose.model('Department', departmentSchema);