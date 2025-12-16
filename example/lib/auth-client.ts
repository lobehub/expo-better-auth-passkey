import { expoClient } from "@better-auth/expo/client";
import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { expoPasskeyClient } from "@lobehub/expo-better-auth-passkey";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
	baseURL: `https://${process.env.EXPO_PUBLIC_NGROK_URL}`,
	plugins: [
		anonymousClient(),
		expoPasskeyClient(),
		expoClient({
			scheme: "com.lobehub.betterauthreactnativepasskey.example",
			storagePrefix: "better-auth-react-native-passkey-example",
			storage: SecureStore,
		}),
	],
});
