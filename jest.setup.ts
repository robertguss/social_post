import '@testing-library/jest-dom';

// Mock ResizeObserver for Radix UI components (tooltips, popovers, etc.)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
