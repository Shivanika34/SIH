import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  
  // Role Management
  role: {
    type: String,
    enum: ['citizen', 'department_staff', 'admin'],
    default: 'citizen'
  },
  
  // Profile Information
  avatar: {
    type: String, // URL to profile image
    default: null
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'USA' }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  
  // Citizen-specific fields
  gamification: {
    points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    badges: [{
      type: String,
      enum: ['reporter', 'validator', 'community_hero', 'frequent_reporter', 'photo_expert']
    }],
    streak: { type: Number, default: 0 },
    lastReportDate: Date
  },
  
  // Department Staff specific fields
  department: {
    name: String,
    code: String
  },
  staffId: String,
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Preferences
  preferences: {
    language: { type: String, default: 'en' },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    privacy: {
      showProfile: { type: Boolean, default: true },
      showLocation: { type: Boolean, default: true }
    }
  },
  
  // Firebase tokens for push notifications
  fcmTokens: [String],
  
  // Account status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  emailVerifiedAt: Date,
  lastLoginAt: Date,
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ location: '2dsphere' });
userSchema.index({ 'department.code': 1 });

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.fcmTokens;
  return userObject;
};

// Static methods
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

userSchema.statics.findNearby = function(longitude, latitude, maxDistance = 5000) {
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
    isActive: true
  });
};

export default mongoose.model('User', userSchema);