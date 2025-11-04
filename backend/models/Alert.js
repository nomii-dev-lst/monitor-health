import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  monitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Monitor',
    required: true,
    index: true
  },
  alertType: {
    type: String,
    enum: ['failure', 'recovery'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  recipients: {
    type: [String],
    required: true
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailError: {
    type: String,
    default: null
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Index for efficient queries
alertSchema.index({ monitorId: 1, sentAt: -1 });
alertSchema.index({ alertType: 1 });

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
