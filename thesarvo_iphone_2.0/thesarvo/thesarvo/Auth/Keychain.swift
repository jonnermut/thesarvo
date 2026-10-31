import Foundation
import Security

/// The signed-in tokens, kept in the Keychain (available after first unlock, so a background refresh can read them).
enum Keychain {
    private static let service = "com.thesarvo.app.auth"

    private static func query(_ account: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
    }

    static func read(_ account: String) -> Data? {
        var q = query(account)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: AnyObject?
        return SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess ? out as? Data : nil
    }

    @discardableResult
    static func write(_ account: String, _ data: Data) -> Bool {
        SecItemDelete(query(account) as CFDictionary)
        var q = query(account)
        q[kSecValueData as String] = data
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        return SecItemAdd(q as CFDictionary, nil) == errSecSuccess
    }

    static func delete(_ account: String) { SecItemDelete(query(account) as CFDictionary) }
}
