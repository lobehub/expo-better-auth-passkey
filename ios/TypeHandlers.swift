import Foundation
import AuthenticationServices

// Simplified WebAuthn JSON shapes, assuming inputs conform to @simplewebauthn/types.

// MARK: - Creation Options

struct PKCCreationRP {
  let id: String
  init?(dict: [String: Any]) {
    guard let id = dict["id"] as? String else { return nil }
    self.id = id
  }
}

struct PKCCreationUser {
  let id: String
  let name: String
  let displayName: String
  init?(dict: [String: Any]) {
    guard let id = dict["id"] as? String,
          let name = dict["name"] as? String,
          let displayName = dict["displayName"] as? String else { return nil }
    self.id = id
    self.name = name
    self.displayName = displayName
  }
}

struct PKCDescriptor {
  let id: String
  init?(dict: [String: Any]) {
    guard let id = dict["id"] as? String else { return nil }
    self.id = id
  }
}

struct PKCAuthenticatorSelection {
  let userVerification: String?
  init(dict: [String: Any]) { self.userVerification = dict["userVerification"] as? String }
}

struct PublicKeyCredentialCreationOptionsJSONLite {
  let rp: PKCCreationRP
  let challenge: String
  let user: PKCCreationUser
  let excludeCredentials: [PKCDescriptor]
  let authenticatorSelection: PKCAuthenticatorSelection?

  init?(dict: [String: Any]) {
    guard let rpDict = dict["rp"] as? [String: Any], let rp = PKCCreationRP(dict: rpDict) else { return nil }
    guard let challenge = dict["challenge"] as? String else { return nil }
    guard let userDict = dict["user"] as? [String: Any], let user = PKCCreationUser(dict: userDict) else { return nil }
    self.rp = rp
    self.challenge = challenge
    self.user = user
    if let arr = dict["excludeCredentials"] as? [[String: Any]] {
      self.excludeCredentials = arr.compactMap { PKCDescriptor(dict: $0) }
    } else {
      self.excludeCredentials = []
    }
    if let asel = dict["authenticatorSelection"] as? [String: Any] {
      self.authenticatorSelection = PKCAuthenticatorSelection(dict: asel)
    } else {
      self.authenticatorSelection = nil
    }
  }
}

// MARK: - Request Options
struct PublicKeyCredentialRequestOptionsJSONLite {
  let rpId: String
  let challenge: String
  let allowCredentials: [PKCDescriptor]
  let userVerification: String?

  init?(dict: [String: Any]) {
    guard let rpId = dict["rpId"] as? String else { return nil }
    guard let challenge = dict["challenge"] as? String else { return nil }
    self.rpId = rpId
    self.challenge = challenge
    if let arr = dict["allowCredentials"] as? [[String: Any]] {
      self.allowCredentials = arr.compactMap { PKCDescriptor(dict: $0) }
    } else {
      self.allowCredentials = []
    }
    self.userVerification = dict["userVerification"] as? String
  }
}

// MARK: - Registration Response JSON
struct RegistrationResponseJSONLite {
  struct ResponseFields {
    let clientDataJSON: String
    let attestationObject: String
    let transports: [String]

    func toDictionary() -> [String: Any] {
      return [
        "clientDataJSON": clientDataJSON,
        "attestationObject": attestationObject,
        "transports": transports,
      ]
    }
  }

  let id: String
  let rawId: String
  let type: String // "public-key"
  let response: ResponseFields
  let authenticatorAttachment: String? // "platform"
  let clientExtensionResults: [String: Any]

  func toDictionary() -> [String: Any] {
    var dict: [String: Any] = [
      "id": id,
      "rawId": rawId,
      "type": type,
      "response": response.toDictionary(),
      "clientExtensionResults": clientExtensionResults,
    ]
    if let aa = authenticatorAttachment { dict["authenticatorAttachment"] = aa }
    return dict
  }
}

// MARK: - Authentication Response JSON
struct AuthenticationResponseJSONLite {
  struct ResponseFields {
    let clientDataJSON: String
    let authenticatorData: String
    let signature: String
    let userHandle: String?

    func toDictionary() -> [String: Any] {
      var dict: [String: Any] = [
        "clientDataJSON": clientDataJSON,
        "authenticatorData": authenticatorData,
        "signature": signature,
      ]
      if let uh = userHandle { dict["userHandle"] = uh }
      return dict
    }
  }

  let id: String
  let rawId: String
  let type: String // "public-key"
  let response: ResponseFields
  let authenticatorAttachment: String? // "platform"
  let clientExtensionResults: [String: Any]

  func toDictionary() -> [String: Any] {
    var dict: [String: Any] = [
      "id": id,
      "rawId": rawId,
      "type": type,
      "response": response.toDictionary(),
      "clientExtensionResults": clientExtensionResults,
    ]
    if let aa = authenticatorAttachment { dict["authenticatorAttachment"] = aa }
    return dict
  }
}
