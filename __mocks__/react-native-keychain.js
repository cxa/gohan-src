const getGenericPassword = jest.fn(async () => false);
const setGenericPassword = jest.fn(async () => true);
const resetGenericPassword = jest.fn(async () => true);

module.exports = {
  getGenericPassword,
  setGenericPassword,
  resetGenericPassword,
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'WHEN_UNLOCKED',
  },
};
