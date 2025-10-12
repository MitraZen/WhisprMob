// Simple utility test to verify Jest setup
describe('Jest Setup Verification', () => {
  it('should have __DEV__ global defined', () => {
    expect(__DEV__).toBe(true);
  });

  it('should have __TEST__ global defined', () => {
    expect(__TEST__).toBe(true);
  });

  it('should be able to run basic JavaScript', () => {
    const result = 2 + 2;
    expect(result).toBe(4);
  });

  it('should be able to use async/await', async () => {
    const promise = Promise.resolve('test');
    const result = await promise;
    expect(result).toBe('test');
  });
});
