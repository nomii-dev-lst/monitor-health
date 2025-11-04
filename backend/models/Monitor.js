import mongoose from 'mongoose';

const monitorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  authType: {
    type: String,
    enum: ['none', 'basic', 'token', 'login'],
    default: 'none'
  },
  // Stores authentication configuration as JSON
  // For 'basic': { username, password }
  // For 'token': { tokenUrl, username, password, tokenField, headerName }
  // For 'login': { loginUrl, username, password, tokenField, cookieName }
  authConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Validation rules for response
  // Example: { statusCode: 200, requiredKeys: ['data', 'status'], customCheck: 'data.users.length > 0' }
  validationRules: {
    type: mongoose.Schema.Types.Mixed,
    default: { statusCode: 200 }
  },
  checkInterval: {
    type: Number,
    default: 30, // minutes
    min: 1
  },
  alertEmails: {
    type: [String],
    default: []
  },
  enabled: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['pending', 'up', 'down', 'unknown'],
    default: 'pending'
  },
  lastCheckTime: {
    type: Date,
    default: null
  },
  nextCheckTime: {
    type: Date,
    default: null
  },
  lastLatency: {
    type: Number, // milliseconds
    default: null
  },
  consecutiveFailures: {
    type: Number,
    default: 0
  },
  totalChecks: {
    type: Number,
    default: 0
  },
  successfulChecks: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient querying
monitorSchema.index({ enabled: 1, nextCheckTime: 1 });
monitorSchema.index({ status: 1 });

// Virtual for uptime percentage
monitorSchema.virtual('uptimePercentage').get(function() {
  if (this.totalChecks === 0) return 0;
  return ((this.successfulChecks / this.totalChecks) * 100).toFixed(2);
});

const Monitor = mongoose.model('Monitor', monitorSchema);

export default Monitor;
