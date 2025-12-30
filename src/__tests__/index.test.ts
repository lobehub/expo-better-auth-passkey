// Mock dependencies before importing
jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("expo", () => ({
  requireNativeModule: jest.fn(() => ({
    registerPasskey: jest.fn(),
    authenticatePasskey: jest.fn(),
  })),
}));

jest.mock("@better-auth/passkey/client", () => ({
  passkeyClient: jest.fn(() => ({
    id: "passkey",
    $InferServerPlugin: {},
    getActions: jest.fn(),
    getAtoms: jest.fn(() => ({})),
    pathMethods: {},
    atomListeners: [],
  })),
  getPasskeyActions: jest.fn(),
}));

describe("index exports", () => {
  it("should export expoPasskeyClient", () => {
    const indexModule = require("../index");

    expect(indexModule.expoPasskeyClient).toBeDefined();
    expect(typeof indexModule.expoPasskeyClient).toBe("function");
  });

  it("should return a valid client when expoPasskeyClient is called", () => {
    const { expoPasskeyClient } = require("../index");

    const client = expoPasskeyClient();

    expect(client).toHaveProperty("id");
    expect(client).toHaveProperty("getActions");
    expect(client).toHaveProperty("getAtoms");
  });
});
