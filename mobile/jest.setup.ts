jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false, size: 0 }),
  getFreeDiskStorageAsync: jest.fn().mockResolvedValue(1024 * 1024 * 1024),
}));

global.fetch = jest.fn();
