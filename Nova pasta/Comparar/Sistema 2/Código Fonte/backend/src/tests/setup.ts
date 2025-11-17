import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { sequelize } from '../database';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Sync database
  await sequelize.sync({ force: false });
});

afterAll(async () => {
  // Close database connection
  await sequelize.close();
});

beforeEach(async () => {
  // Clean up any test data if needed
});

afterEach(async () => {
  // Clean up after each test if needed
});

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};