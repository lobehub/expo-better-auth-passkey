// Create mock functions at module scope
const mockRegisterPasskey = jest.fn();
const mockAuthenticatePasskey = jest.fn();

// Mock dependencies before importing
jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("expo", () => ({
  requireNativeModule: jest.fn(() => ({
    registerPasskey: mockRegisterPasskey,
    authenticatePasskey: mockAuthenticatePasskey,
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
  getPasskeyActions: jest.fn(() => ({
    signIn: { passkey: jest.fn() },
    passkey: { addPasskey: jest.fn() },
  })),
}));

// Import after mocks are set up
import { atom } from "nanostores";
import { expoPasskeyClient, getPasskeyActionsNative } from "../plugin";
import { Platform } from "react-native";

describe("expoPasskeyClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a valid BetterAuthClientPlugin structure", () => {
    const client = expoPasskeyClient();

    expect(client).toHaveProperty("id", "passkey");
    expect(client).toHaveProperty("$InferServerPlugin");
    expect(client).toHaveProperty("getActions");
    expect(client).toHaveProperty("getAtoms");
    expect(client).toHaveProperty("pathMethods");
    expect(client).toHaveProperty("atomListeners");
    expect(typeof client.getActions).toBe("function");
  });

  it("should use native actions on iOS platform", () => {
    const client = expoPasskeyClient();
    const mockFetch = jest.fn();
    const mockStore = { notify: jest.fn() };

    const actions = client.getActions(mockFetch, mockStore);

    expect(actions).toHaveProperty("signIn");
    expect(actions).toHaveProperty("passkey");
  });

  it("should use web actions on web platform", () => {
    // Temporarily override Platform.OS
    const originalOS = Platform.OS;
    (Platform as any).OS = "web";

    const { getPasskeyActions } = require("@better-auth/passkey/client");

    const client = expoPasskeyClient();
    const mockFetch = jest.fn();
    const mockStore = { notify: jest.fn() };

    client.getActions(mockFetch, mockStore);

    expect(getPasskeyActions).toHaveBeenCalled();

    // Restore
    (Platform as any).OS = originalOS;
  });
});

describe("getPasskeyActionsNative", () => {
  let mockFetch: jest.Mock;
  let mockStore: { notify: jest.Mock };
  let $listPasskeys: ReturnType<typeof atom<number>>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    mockStore = { notify: jest.fn() };
    $listPasskeys = atom<number>(0);
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("signInPasskey", () => {
    it("should return actions with correct structure", () => {
      const actions = getPasskeyActionsNative(mockFetch, {
        $listPasskeys,
        $store: mockStore,
      });

      expect(actions).toHaveProperty("signIn.passkey");
      expect(actions).toHaveProperty("passkey.addPasskey");
      expect(actions).toHaveProperty("$Infer");
      expect(typeof actions.signIn.passkey).toBe("function");
      expect(typeof actions.passkey.addPasskey).toBe("function");
    });

    it("should handle successful authentication", async () => {
      const mockOptions = {
        challenge: "test-challenge",
        rpId: "example.com",
        allowCredentials: [],
      };
      const mockAssertion = {
        id: "credential-id",
        rawId: "raw-id",
        response: { clientDataJSON: "test", authenticatorData: "test" },
        type: "public-key",
      };
      const mockSession = {
        session: { id: "session-1" },
        user: { id: "user-1" },
      };

      mockFetch
        .mockResolvedValueOnce({ data: mockOptions })
        .mockResolvedValueOnce({ data: mockSession });

      mockAuthenticatePasskey.mockResolvedValueOnce(mockAssertion);

      const actions = getPasskeyActionsNative(mockFetch, {
        $listPasskeys,
        $store: mockStore,
      });

      const result = await actions.signIn.passkey();

      expect(mockFetch).toHaveBeenCalledWith(
        "/passkey/generate-authenticate-options",
        expect.objectContaining({ method: "GET" })
      );
      expect(mockAuthenticatePasskey).toHaveBeenCalledWith({
        optionsJSON: mockOptions,
        useAutofill: undefined,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "/passkey/verify-authentication",
        expect.objectContaining({
          method: "POST",
          body: { response: mockAssertion },
        })
      );
      expect(mockStore.notify).toHaveBeenCalledWith("$sessionSignal");
      expect(result).toEqual({ data: mockSession });
    });

    it("should return early if options fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({ data: null, error: { message: "error" } });

      const actions = getPasskeyActionsNative(mockFetch, {
        $listPasskeys,
        $store: mockStore,
      });

      const result = await actions.signIn.passkey();

      expect(result).toEqual({ data: null, error: { message: "error" } });
      expect(mockAuthenticatePasskey).not.toHaveBeenCalled();
    });

    it("should handle authentication error", async () => {
      mockFetch.mockResolvedValueOnce({
        data: { challenge: "test", rpId: "example.com" },
      });

      mockAuthenticatePasskey.mockRejectedValueOnce(new Error("User cancelled"));

      const actions = getPasskeyActionsNative(mockFetch, {
        $listPasskeys,
        $store: mockStore,
      });

      const result = await actions.signIn.passkey();

      expect(result).toEqual({
        data: null,
        error: {
          code: "AUTH_CANCELLED",
          message: "User cancelled",
          status: 400,
          statusText: "BAD_REQUEST",
        },
      });
    });

    it("should pass autoFill option to authenticatePasskey", async () => {
      const mockOptions = { challenge: "test", rpId: "example.com" };

      mockFetch
        .mockResolvedValueOnce({ data: mockOptions })
        .mockResolvedValueOnce({ data: { session: {}, user: {} } });

      mockAuthenticatePasskey.mockResolvedValueOnce({
        id: "credential-id",
      });

      const actions = getPasskeyActionsNative(mockFetch, {
        $listPasskeys,
        $store: mockStore,
      });

      await actions.signIn.passkey({ autoFill: true });

      expect(mockAuthenticatePasskey).toHaveBeenCalledWith({
        optionsJSON: mockOptions,
        useAutofill: true,
      });
    });
  });

  describe("registerPasskey", () => {
    it("should handle successful registration", async () => {
      const mockOptions = {
        challenge: "test-challenge",
        rp: { id: "example.com", name: "Example" },
        user: { id: "user-id", name: "test@example.com" },
        pubKeyCredParams: [],
      };
      const mockAttestation = {
        id: "credential-id",
        rawId: "raw-id",
        response: { clientDataJSON: "test", attestationObject: "test" },
        type: "public-key",
      };
      const mockPasskey = { passkey: { id: "passkey-1" } };

      mockFetch
        .mockResolvedValueOnce({ data: mockOptions })
        .mockResolvedValueOnce({ data: mockPasskey });

      mockRegisterPasskey.mockResolvedValueOnce(mockAttestation);

      const actions = getPasskeyActionsNative(mockFetch, {
        $listPasskeys,
        $store: mockStore,
      });

      const result = await actions.passkey.addPasskey({ name: "My Passkey" });

      expect(mockFetch).toHaveBeenCalledWith(
        "/passkey/generate-register-options",
        expect.objectContaining({
          method: "GET",
          query: { name: "My Passkey" },
        })
      );
      expect(mockRegisterPasskey).toHaveBeenCalledWith({
        optionsJSON: mockOptions,
        useAutoRegister: undefined,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "/passkey/verify-registration",
        expect.objectContaining({
          method: "POST",
          body: { response: mockAttestation, name: "My Passkey" },
        })
      );
      expect(result).toEqual({ data: mockPasskey });
    });

    it("should return early if options fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        data: null,
        error: { message: "Not authorized" },
      });

      const actions = getPasskeyActionsNative(mockFetch, {
        $listPasskeys,
        $store: mockStore,
      });

      const result = await actions.passkey.addPasskey();

      expect(result).toEqual({ data: null, error: { message: "Not authorized" } });
      expect(mockRegisterPasskey).not.toHaveBeenCalled();
    });

    it("should handle registration error", async () => {
      mockFetch.mockResolvedValueOnce({
        data: { challenge: "test", rp: {}, user: {} },
      });

      mockRegisterPasskey.mockRejectedValueOnce(new Error("Registration failed"));

      const actions = getPasskeyActionsNative(mockFetch, {
        $listPasskeys,
        $store: mockStore,
      });

      const result = await actions.passkey.addPasskey();

      expect(result).toEqual({
        data: null,
        error: {
          code: "AUTH_CANCELLED",
          message: "Registration failed",
          status: 400,
          statusText: "BAD_REQUEST",
        },
      });
    });

    it("should pass authenticatorAttachment option", async () => {
      const mockOptions = { challenge: "test", rp: {}, user: {} };

      mockFetch.mockResolvedValueOnce({ data: mockOptions });
      mockRegisterPasskey.mockResolvedValueOnce({ id: "id" });
      mockFetch.mockResolvedValueOnce({ data: { passkey: {} } });

      const actions = getPasskeyActionsNative(mockFetch, {
        $listPasskeys,
        $store: mockStore,
      });

      await actions.passkey.addPasskey({
        authenticatorAttachment: "cross-platform",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/passkey/generate-register-options",
        expect.objectContaining({
          query: { authenticatorAttachment: "cross-platform" },
        })
      );
    });

    it("should pass useAutoRegister option to registerPasskey", async () => {
      const mockOptions = { challenge: "test", rp: {}, user: {} };

      mockFetch.mockResolvedValueOnce({ data: mockOptions });
      mockRegisterPasskey.mockResolvedValueOnce({ id: "id" });
      mockFetch.mockResolvedValueOnce({ data: { passkey: {} } });

      const actions = getPasskeyActionsNative(mockFetch, {
        $listPasskeys,
        $store: mockStore,
      });

      await actions.passkey.addPasskey({ useAutoRegister: true });

      expect(mockRegisterPasskey).toHaveBeenCalledWith({
        optionsJSON: mockOptions,
        useAutoRegister: true,
      });
    });

    it("should return early if verification fails", async () => {
      const mockOptions = { challenge: "test", rp: {}, user: {} };

      mockFetch.mockResolvedValueOnce({ data: mockOptions });
      mockRegisterPasskey.mockResolvedValueOnce({ id: "id" });
      mockFetch.mockResolvedValueOnce({
        data: null,
        error: { message: "Verification failed" },
      });

      const actions = getPasskeyActionsNative(mockFetch, {
        $listPasskeys,
        $store: mockStore,
      });

      const result = await actions.passkey.addPasskey();

      expect(result).toEqual({
        data: null,
        error: { message: "Verification failed" },
      });
    });
  });

  describe("$listPasskeys atom updates", () => {
    it("should update $listPasskeys after successful authentication", async () => {
      mockFetch
        .mockResolvedValueOnce({ data: { challenge: "test" } })
        .mockResolvedValueOnce({ data: { session: {}, user: {} } });

      mockAuthenticatePasskey.mockResolvedValueOnce({ id: "id" });

      const initialValue = $listPasskeys.get();

      const actions = getPasskeyActionsNative(mockFetch, {
        $listPasskeys,
        $store: mockStore,
      });

      await actions.signIn.passkey();

      expect($listPasskeys.get()).not.toBe(initialValue);
    });

    it("should update $listPasskeys after successful registration", async () => {
      mockFetch
        .mockResolvedValueOnce({ data: { challenge: "test", rp: {}, user: {} } })
        .mockResolvedValueOnce({ data: { passkey: {} } });

      mockRegisterPasskey.mockResolvedValueOnce({ id: "id" });

      const initialValue = $listPasskeys.get();

      const actions = getPasskeyActionsNative(mockFetch, {
        $listPasskeys,
        $store: mockStore,
      });

      await actions.passkey.addPasskey();

      expect($listPasskeys.get()).not.toBe(initialValue);
    });
  });
});
