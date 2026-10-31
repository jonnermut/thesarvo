import AuthenticationServices
import CryptoKit
import Foundation

struct Tokens: Codable, Equatable {
    var idToken: String
    var accessToken: String?
    var refreshToken: String
    var expiresAt: Double  // milliseconds since 1970, as the website keeps it
}

/// What the page and the Account screen know about the signed-in person.
struct AuthUser: Equatable {
    var email: String
    var name: String
    var groups: [String]
    var canEdit: Bool { groups.contains("admins") || groups.contains("editors") }
}

/// Pure helpers, kept apart so they can be unit tested.
enum Pkce {
    static func base64url(_ data: Data) -> String {
        data.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }

    static func verifier() -> String {
        base64url(Data((0..<32).map { _ in UInt8.random(in: 0...255) }))
    }

    static func challenge(_ verifier: String) -> String {
        base64url(Data(SHA256.hash(data: Data(verifier.utf8))))
    }

    static func authorizeURL(domain: URL, clientId: String, redirect: String, state: String, challenge: String) -> URL? {
        var c = URLComponents(url: domain.appendingPathComponent("oauth2/authorize"), resolvingAgainstBaseURL: false)
        c?.queryItems = [
            .init(name: "client_id", value: clientId),
            .init(name: "response_type", value: "code"),
            .init(name: "scope", value: "openid email profile aws.cognito.signin.user.admin"),
            .init(name: "redirect_uri", value: redirect),
            .init(name: "state", value: state),
            .init(name: "code_challenge", value: challenge),
            .init(name: "code_challenge_method", value: "S256"),
        ]
        return c?.url
    }

    /// The claims of a JWT, unverified (the server verifies; this only shows who is signed in).
    static func claims(_ jwt: String) -> [String: Any]? {
        let parts = jwt.split(separator: ".")
        guard parts.count >= 2 else { return nil }
        var s = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while s.count % 4 != 0 { s += "=" }
        guard let d = Data(base64Encoded: s) else { return nil }
        return (try? JSONSerialization.jsonObject(with: d)) as? [String: Any]
    }

    static func user(from idToken: String) -> AuthUser? {
        guard let c = claims(idToken) else { return nil }
        return AuthUser(email: c["email"] as? String ?? "", name: c["name"] as? String ?? "", groups: c["cognito:groups"] as? [String] ?? [])
    }
}

/// Cognito sign-in with PKCE in `ASWebAuthenticationSession`. The Cognito mobile app client (callback `thesarvo://auth/callback`) is
/// created by the owner; until `mobileClientId` is set the button explains that. Tokens live in the Keychain.
@MainActor
final class AuthSession: NSObject, ObservableObject, ASWebAuthenticationPresentationContextProviding {
    static let callbackScheme = "thesarvo"
    static let redirect = "thesarvo://auth/callback"
    static let domain = URL(string: "https://auth.thesarvo.com")!
    /// The Cognito mobile client id. Empty until the owner registers the `thesarvo://auth/callback` client (Settings > Server can override it).
    static let mobileClientId = ""

    @Published private(set) var user: AuthUser?
    @Published var error: String?
    @Published private(set) var busy = false

    private(set) var tokens: Tokens?
    private var session: ASWebAuthenticationSession?
    private let account = "tokens"
    /// Called whenever tokens change (page script) and on sign-out (private store).
    var onChange: ((Tokens?) -> Void)?

    var clientId: String { UserDefaults.standard.string(forKey: "cognitoClientId").flatMap { $0.isEmpty ? nil : $0 } ?? Self.mobileClientId }
    var configured: Bool { !clientId.isEmpty }

    override init() {
        super.init()
        #if DEBUG
        if let t = UserDefaults.standard.string(forKey: "debugIdToken"), !t.isEmpty { // simulator tests: a fake token drives the UI only
            tokens = Tokens(idToken: t, accessToken: nil, refreshToken: "", expiresAt: Date().timeIntervalSince1970 * 1000 + 3_600_000)
            user = Pkce.user(from: t)
            return
        }
        #endif
        if let d = Keychain.read(account), let t = try? JSONDecoder().decode(Tokens.self, from: d) {
            tokens = t
            user = Pkce.user(from: t.idToken)
        }
    }

    private func store(_ t: Tokens?) {
        tokens = t
        user = t.flatMap { Pkce.user(from: $0.idToken) }
        if let t, let d = try? JSONEncoder().encode(t) { Keychain.write(account, d) } else { Keychain.delete(account) }
        onChange?(t)
    }

    /// Takes tokens the page refreshed for itself (it refreshes with the same refresh token), keeping the Keychain current.
    func adopt(_ t: Tokens) {
        guard t != tokens, !t.idToken.isEmpty, t.expiresAt >= (tokens?.expiresAt ?? 0) else { return }
        var next = t
        if next.refreshToken.isEmpty { next.refreshToken = tokens?.refreshToken ?? "" }
        store(next)
    }

    func signOut() { store(nil) }

    func signIn() async {
        guard configured else { error = "Sign-in on the phone is not set up yet."; return }
        error = nil
        busy = true
        defer { busy = false }
        let verifier = Pkce.verifier()
        let state = Pkce.verifier()
        guard let url = Pkce.authorizeURL(domain: Self.domain, clientId: clientId, redirect: Self.redirect, state: state, challenge: Pkce.challenge(verifier)) else { return }
        do {
            let callback: URL = try await withCheckedThrowingContinuation { cont in
                let s = ASWebAuthenticationSession(url: url, callbackURLScheme: Self.callbackScheme) { url, err in
                    if let url { cont.resume(returning: url) } else { cont.resume(throwing: err ?? URLError(.cancelled)) }
                }
                s.presentationContextProvider = self
                s.prefersEphemeralWebBrowserSession = false
                session = s
                s.start()
            }
            let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
            if let e = items.first(where: { $0.name == "error" })?.value { throw AuthError.message(items.first(where: { $0.name == "error_description" })?.value ?? e) }
            guard let code = items.first(where: { $0.name == "code" })?.value, items.first(where: { $0.name == "state" })?.value == state else { throw AuthError.message("This sign-in link has expired. Please try again.") }
            let r = try await Self.token(["grant_type": "authorization_code", "code": code, "code_verifier": verifier, "redirect_uri": Self.redirect], clientId: clientId)
            store(Tokens(idToken: r.id_token, accessToken: r.access_token, refreshToken: r.refresh_token ?? "", expiresAt: Date().timeIntervalSince1970 * 1000 + r.expires_in * 1000))
        } catch let e as ASWebAuthenticationSessionError where e.code == .canceledLogin {
            // the person closed the sheet
        } catch {
            self.error = (error as? AuthError)?.text ?? error.localizedDescription
        }
    }

    /// A current access/ID token pair, refreshed when within two minutes of expiry; nil when signed out or the refresh was refused.
    func freshTokens() async -> Tokens? {
        guard let t = tokens else { return nil }
        if t.expiresAt - 120_000 > Date().timeIntervalSince1970 * 1000 || t.refreshToken.isEmpty { return t }
        do {
            let r = try await Self.token(["grant_type": "refresh_token", "refresh_token": t.refreshToken], clientId: clientId)
            var next = t
            next.idToken = r.id_token
            next.accessToken = r.access_token
            next.expiresAt = Date().timeIntervalSince1970 * 1000 + r.expires_in * 1000
            store(next)
            return next
        } catch AuthError.refused {
            store(nil) // the refresh token expired or was revoked
            return nil
        } catch {
            return t // offline: keep what we have
        }
    }

    struct TokenReply: Decodable {
        var id_token: String
        var access_token: String
        var refresh_token: String?
        var expires_in: Double
    }

    static func token(_ params: [String: String], clientId: String) async throws -> TokenReply {
        var req = URLRequest(url: domain.appendingPathComponent("oauth2/token"))
        req.httpMethod = "POST"
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "content-type")
        var form = URLComponents()
        form.queryItems = (params.merging(["client_id": clientId]) { a, _ in a }).map { URLQueryItem(name: $0.key, value: $0.value) }
        req.httpBody = form.percentEncodedQuery?.data(using: .utf8)
        let (data, resp) = try await URLSession.shared.data(for: req)
        let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
        if status == 400 || status == 401 { throw AuthError.refused }
        guard status == 200 else { throw AuthError.message("Sign-in failed (\(status))") }
        return try JSONDecoder().decode(TokenReply.self, from: data)
    }

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            UIApplication.shared.connectedScenes.compactMap { ($0 as? UIWindowScene)?.keyWindow }.first ?? ASPresentationAnchor()
        }
    }
}

enum AuthError: Error {
    case refused
    case message(String)
    var text: String {
        switch self {
        case .refused: return "Sign-in was refused."
        case .message(let m): return m
        }
    }
}
