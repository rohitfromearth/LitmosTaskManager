module.exports = {
  preset: '@react-native/jest-preset',
  // Packages that ship untranspiled ES modules must be transformed by Jest.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@reduxjs/toolkit|immer|redux|redux-thunk|reselect|react-redux)/)',
  ],
};
