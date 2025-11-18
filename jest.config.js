/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.(ts|tsx|js)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.jest.json" }],
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setupTests.ts"],
  clearMocks: true,
};
