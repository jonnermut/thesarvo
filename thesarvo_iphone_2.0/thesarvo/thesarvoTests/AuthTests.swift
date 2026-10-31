import XCTest
@testable import thesarvo

final class AuthTests: XCTestCase {
    func testPkceChallengeMatchesRFC7636() {
        XCTAssertEqual(Pkce.challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
        let v = Pkce.verifier()
        XCTAssertGreaterThanOrEqual(v.count, 43)
        XCTAssertFalse(v.contains("=") || v.contains("+") || v.contains("/"))
    }

    func testAuthorizeURL() throws {
        let u = try XCTUnwrap(Pkce.authorizeURL(domain: AuthSession.domain, clientId: "abc", redirect: "thesarvo://auth/callback", state: "s", challenge: "c"))
        let q = Dictionary(uniqueKeysWithValues: (URLComponents(url: u, resolvingAgainstBaseURL: false)?.queryItems ?? []).map { ($0.name, $0.value ?? "") })
        XCTAssertEqual(u.path, "/oauth2/authorize")
        XCTAssertEqual(q["redirect_uri"], "thesarvo://auth/callback")
        XCTAssertEqual(q["code_challenge_method"], "S256")
        XCTAssertEqual(q["response_type"], "code")
    }

    private func jwt(_ claims: [String: Any]) -> String {
        let body = try! JSONSerialization.data(withJSONObject: claims)
        return "e30." + Pkce.base64url(body) + ".sig"
    }

    func testUserFromIdToken() {
        let u = Pkce.user(from: jwt(["email": "a@b.c", "name": "Ann", "cognito:groups": ["editors"]]))
        XCTAssertEqual(u, AuthUser(email: "a@b.c", name: "Ann", groups: ["editors"]))
        XCTAssertTrue(u?.canEdit ?? false)
        XCTAssertFalse(Pkce.user(from: jwt(["email": "x@y.z"]))?.canEdit ?? true)
        XCTAssertNil(Pkce.user(from: "garbage"))
    }

    func testBridgeRequestOnlyAcceptsOurAPI() {
        XCTAssertNotNil(BridgeRequest(["id": 1, "path": "/g/api/me"]))
        XCTAssertNil(BridgeRequest(["id": 1, "path": "/other"]))
        XCTAssertNil(BridgeRequest(["id": 1, "path": "https://evil.example/g/api/me"]))
        XCTAssertEqual(BridgeRequest(["id": 2, "path": "/g/api/save", "method": "post"])?.method, "POST")
    }

    func testReplyScriptEscapesBody() {
        let js = BridgeAPI.replyScript(id: 3, status: 200, body: "{\"a\":\"x\\\"y\"}\n</script>")
        XCTAssertTrue(js.hasPrefix("window.thesarvoBridge && window.thesarvoBridge.reply(3, 200, ["))
        XCTAssertFalse(js.contains("\n"))
    }

    func testKeychainRoundTrip() {
        let key = "test-\(UUID().uuidString)"
        XCTAssertNil(Keychain.read(key))
        Keychain.write(key, Data("one".utf8))
        Keychain.write(key, Data("two".utf8))
        XCTAssertEqual(Keychain.read(key), Data("two".utf8))
        Keychain.delete(key)
        XCTAssertNil(Keychain.read(key))
    }

    func testCallbackHandling() throws {
        XCTAssertEqual(try AuthSession.code(from: URL(string: "thesarvo://auth/callback?code=abc&state=s1")!, state: "s1"), "abc")
        XCTAssertThrowsError(try AuthSession.code(from: URL(string: "thesarvo://auth/callback?code=abc&state=other")!, state: "s1"))
        XCTAssertThrowsError(try AuthSession.code(from: URL(string: "thesarvo://auth/callback?code=abc")!, state: "s1"))
        XCTAssertThrowsError(try AuthSession.code(from: URL(string: "thesarvo://auth/callback?error=access_denied&error_description=No")!, state: "s1")) { XCTAssertEqual(($0 as? AuthError)?.text, "No") }
    }

    func testAuthorizeURLUsesTheMobileClient() throws {
        XCTAssertEqual(AuthSession.mobileClientId, "7b9l6bgg8aln7jo1s877d49q8i")
        let u = try XCTUnwrap(Pkce.authorizeURL(domain: AuthSession.domain, clientId: AuthSession.mobileClientId, redirect: AuthSession.redirect, state: "s", challenge: "c"))
        XCTAssertEqual(u.host, "auth.thesarvo.com")
        XCTAssertTrue(u.absoluteString.contains("client_id=7b9l6bgg8aln7jo1s877d49q8i"))
    }
}
