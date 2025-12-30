// Mock expo before importing the module
const mockRegisterPasskey = jest.fn();
const mockAuthenticatePasskey = jest.fn();

jest.mock("expo", () => ({
  requireNativeModule: jest.fn(() => ({
    registerPasskey: mockRegisterPasskey,
    authenticatePasskey: mockAuthenticatePasskey,
  })),
}));

import PasskeyModule from "../BetterAuthReactNativePasskeyModule";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/types";

describe("BetterAuthReactNativePasskeyModule", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("registerPasskey", () => {
    const mockCreationOptions: PublicKeyCredentialCreationOptionsJSON = {
      challenge: "test-challenge-base64",
      rp: {
        id: "example.com",
        name: "Example App",
      },
      user: {
        id: "user-id-base64",
        name: "test@example.com",
        displayName: "Test User",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      timeout: 60000,
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
    };

    it("should call native module with correct parameters", async () => {
      const mockResponse = {
        id: "credential-id",
        rawId: "raw-id-base64",
        response: {
          clientDataJSON: "client-data-json-base64",
          attestationObject: "attestation-object-base64",
        },
        type: "public-key",
        clientExtensionResults: {},
      };

      mockRegisterPasskey.mockResolvedValueOnce(mockResponse);

      const result = await PasskeyModule.registerPasskey({
        optionsJSON: mockCreationOptions,
      });

      expect(mockRegisterPasskey).toHaveBeenCalledWith({
        optionsJSON: mockCreationOptions,
        useAutoRegister: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it("should pass useAutoRegister option", async () => {
      mockRegisterPasskey.mockResolvedValueOnce({ id: "id" });

      await PasskeyModule.registerPasskey({
        optionsJSON: mockCreationOptions,
        useAutoRegister: true,
      });

      expect(mockRegisterPasskey).toHaveBeenCalledWith({
        optionsJSON: mockCreationOptions,
        useAutoRegister: true,
      });
    });

    it("should propagate errors from native module", async () => {
      const nativeError = new Error("Native registration failed");
      mockRegisterPasskey.mockRejectedValueOnce(nativeError);

      await expect(
        PasskeyModule.registerPasskey({
          optionsJSON: mockCreationOptions,
        })
      ).rejects.toThrow("Native registration failed");
    });
  });

  describe("authenticatePasskey", () => {
    const mockRequestOptions: PublicKeyCredentialRequestOptionsJSON = {
      challenge: "auth-challenge-base64",
      rpId: "example.com",
      timeout: 60000,
      userVerification: "required",
      allowCredentials: [
        {
          type: "public-key",
          id: "credential-id-base64",
        },
      ],
    };

    it("should call native module with correct parameters", async () => {
      const mockResponse = {
        id: "credential-id",
        rawId: "raw-id-base64",
        response: {
          clientDataJSON: "client-data-json-base64",
          authenticatorData: "auth-data-base64",
          signature: "signature-base64",
          userHandle: "user-handle-base64",
        },
        type: "public-key",
        clientExtensionResults: {},
      };

      mockAuthenticatePasskey.mockResolvedValueOnce(mockResponse);

      const result = await PasskeyModule.authenticatePasskey({
        optionsJSON: mockRequestOptions,
      });

      expect(mockAuthenticatePasskey).toHaveBeenCalledWith({
        optionsJSON: mockRequestOptions,
        useAutofill: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it("should pass useAutofill option", async () => {
      mockAuthenticatePasskey.mockResolvedValueOnce({ id: "id" });

      await PasskeyModule.authenticatePasskey({
        optionsJSON: mockRequestOptions,
        useAutofill: true,
      });

      expect(mockAuthenticatePasskey).toHaveBeenCalledWith({
        optionsJSON: mockRequestOptions,
        useAutofill: true,
      });
    });

    it("should propagate errors from native module", async () => {
      const nativeError = new Error("User cancelled authentication");
      mockAuthenticatePasskey.mockRejectedValueOnce(nativeError);

      await expect(
        PasskeyModule.authenticatePasskey({
          optionsJSON: mockRequestOptions,
        })
      ).rejects.toThrow("User cancelled authentication");
    });
  });

  describe("module structure", () => {
    it("should export registerPasskey function", () => {
      expect(PasskeyModule.registerPasskey).toBeDefined();
      expect(typeof PasskeyModule.registerPasskey).toBe("function");
    });

    it("should export authenticatePasskey function", () => {
      expect(PasskeyModule.authenticatePasskey).toBeDefined();
      expect(typeof PasskeyModule.authenticatePasskey).toBe("function");
    });
  });
});
