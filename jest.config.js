/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react",
        },
      },
    ],
  },
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  collectCoverageFrom: ["src/**/*.ts", "src/**/*.tsx", "!src/**/*.d.ts"],
};

module.exports = config;
