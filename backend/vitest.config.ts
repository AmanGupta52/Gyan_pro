import { defineConfig } from 'vitest/config';

process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/gyan26_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
process.env.CLOUDINARY_API_KEY = 'test_key';
process.env.CLOUDINARY_API_SECRET = 'test_secret';
process.env.EMAIL_FROM = 'test@gyan26.com';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
