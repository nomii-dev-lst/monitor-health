import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 */
export async function connectDatabase() {
  try {
    const options = {
      // useNewUrlParser: true, // deprecated in mongoose 7+
      // useUnifiedTopology: true, // deprecated in mongoose 7+
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log('✓ MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}
