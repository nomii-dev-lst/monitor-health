import mongoose from 'mongoose';

const checkResultSchema = new mongoose.Schema({
  monitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Monitor',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['success', 'failure'],
    required: true
  },
  httpStatus: {
    type: Number,
    default: null
  },
  latency: {
    type: Number, // milliseconds
    required: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  // Store validation failures
  validationErrors: {
    type: [String],
    default: []
  },
  // Sample response data for debugging (truncated)
  responseData: {
    type: String,
    default: null
  },
  checkedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Compound index for efficient queries
checkResultSchema.index({ monitorId: 1, checkedAt: -1 });
checkResultSchema.index({ status: 1, checkedAt: -1 });

const CheckResult = mongoose.model('CheckResult', checkResultSchema);

export default CheckResult;
