import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/types";
import type { Session, User } from "better-auth";
import type { BetterFetch, BetterFetchOption } from "better-auth/client";
import { getPasskeyActions, passkeyClient } from "@better-auth/passkey/client";
import type { Passkey } from "@better-auth/passkey";
import { atom } from "nanostores";
import { Platform } from "react-native";
import PasskeyModule from "./BetterAuthReactNativePasskeyModule";

type BasePasskeyClient = ReturnType<typeof passkeyClient>;
type PasskeyActions = ReturnType<BasePasskeyClient["getActions"]>;

/**
 * Expo/React Native passkey client that extends better-auth's `passkeyClient`
 * and overrides only the device WebAuthn calls to use React Native modules.
 */

export const expoPasskeyClient = (): BasePasskeyClient => {
  const baseClient = passkeyClient();
  const $listPasskeys = atom<number>(0);

  return {
    ...baseClient,
    getActions: ($fetch, $store) => {
      if (Platform.OS === "web") {
        return getPasskeyActions($fetch, { $listPasskeys, $store });
      }
      // Native covers the device-meaningful subset of the web actions
      // (no `returnWebAuthnResponse`, no `extensions`) and returns a
      // slightly different error/data shape. We cast to the base actions
      // type so the plugin slots into BetterAuthClient's type inference.
      // NOTE: this cast hides shape drift — if `@better-auth/passkey` adds
      // a new action (e.g. `passkey.deletePasskey`) and native doesn't
      // implement it, neither tsc nor the current tests will catch it.
      return getPasskeyActionsNative($fetch, {
        $listPasskeys,
        $store,
      }) as unknown as PasskeyActions;
    },
  };
};

export const getPasskeyActionsNative = (
  $fetch: BetterFetch,
  {
    $listPasskeys,
    $store,
  }: {
    $listPasskeys: ReturnType<typeof atom<number>>;
    $store: any;
  }
) => {
  const signInPasskey = async (
    opts?: {
      autoFill?: boolean;
      fetchOptions?: BetterFetchOption;
    },
    options?: BetterFetchOption
  ) => {
    const response = await $fetch<PublicKeyCredentialRequestOptionsJSON>(
      "/passkey/generate-authenticate-options",
      {
        method: "GET",
        throw: false,
      }
    );
    if (!response.data) return response;

    try {
      const assertion = await PasskeyModule.authenticatePasskey({
        optionsJSON: response.data,
        useAutofill: opts?.autoFill,
      });
      const verified = await $fetch<{
        session: Session;
        user: User;
      }>("/passkey/verify-authentication", {
        body: { response: assertion },
        ...opts?.fetchOptions,
        ...options,
        method: "POST",
        throw: false,
      });

      $listPasskeys.set(Math.random());
      $store.notify("$sessionSignal");
      return verified;
    } catch (e) {
      console.error("Passkey sign-in error:", e);
      let errorMessage = "auth cancelled";
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      return {
        data: null,
        error: {
          code: "AUTH_CANCELLED",
          message: errorMessage,
          status: 400,
          statusText: "BAD_REQUEST",
        },
      };
    }
  };

  const registerPasskey = async (
    opts?: {
      fetchOptions?: BetterFetchOption;
      name?: string;
      authenticatorAttachment?: "platform" | "cross-platform";
      useAutoRegister?: boolean;
    },
    fetchOpts?: BetterFetchOption
  ) => {
    const optionsRes = await $fetch<PublicKeyCredentialCreationOptionsJSON>(
      "/passkey/generate-register-options",
      {
        method: "GET",
        query: {
          ...(opts?.authenticatorAttachment && {
            authenticatorAttachment: opts.authenticatorAttachment,
          }),
          ...(opts?.name && { name: opts.name }),
        },
        throw: false,
      }
    );

    if (!optionsRes.data) return optionsRes;

    try {
      const attestation = await PasskeyModule.registerPasskey({
        optionsJSON: optionsRes.data,
        useAutoRegister: opts?.useAutoRegister,
      });

      const verified = await $fetch<{ passkey: Passkey }>(
        "/passkey/verify-registration",
        {
          ...opts?.fetchOptions,
          ...fetchOpts,
          body: {
            response: attestation,
            name: opts?.name,
          },
          method: "POST",
          throw: false,
        }
      );
      if (!verified.data) return verified;
      $listPasskeys.set(Math.random());
      return verified;
    } catch (e) {
      console.error("Passkey registration error:", e);
      let errorMessage = "auth cancelled";
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      return {
        data: null,
        error: {
          code: "AUTH_CANCELLED",
          message: errorMessage,
          status: 400,
          statusText: "BAD_REQUEST",
        },
      };
    }
  };

  return {
    signIn: {
      passkey: signInPasskey,
    },
    passkey: {
      addPasskey: registerPasskey,
    },
    $Infer: {} as {
      Passkey: Passkey;
    },
  };
};
