module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          target: "es2019",
          module: "esnext",
          moduleResolution: "bundler",
          jsx: "react",
          esModuleInterop: true,
          isolatedModules: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    "^nanostores$": "<rootDir>/src/__tests__/__mocks__/nanostores.ts",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  testMatch: ["**/__tests__/**/*.(test|spec).(ts|tsx|js)"],
  watchman: false,
};
