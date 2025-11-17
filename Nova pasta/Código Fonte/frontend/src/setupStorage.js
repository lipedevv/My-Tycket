// localStorage polyfill for Node.js build environment
// This prevents build errors when localStorage is accessed during compilation

const storageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null
};

// Define localStorage for Node.js environment
if (typeof global !== 'undefined' && !global.localStorage) {
  global.localStorage = storageMock;
  global.window = {
    localStorage: storageMock,
    location: { reload: () => {} }
  };
}

export default storageMock;