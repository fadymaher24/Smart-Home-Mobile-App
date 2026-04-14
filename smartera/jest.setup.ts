import '@testing-library/jest-native/extend-expect';

const silentConsole = () => {};

console.log = jest.fn(silentConsole);
console.info = jest.fn(silentConsole);
console.warn = jest.fn(silentConsole);
console.error = jest.fn(silentConsole);
console.debug = jest.fn(silentConsole);
