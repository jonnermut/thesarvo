import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var app: AppModel
    @ObservedObject var auth: AuthSession
    @AppStorage("cognitoClientId") private var clientId = ""
    @State private var confirmDelete = false
    @State private var deleteError: String?
    @AppStorage("syncBase") private var syncBase = ""
    @State private var confirmReset = false

    var body: some View {
        NavigationStack {
            Form {
                AccountSection(auth: auth, confirmDelete: $confirmDelete, deleteError: deleteError)
                Section("Reading") {
                    VStack(alignment: .leading) {
                        Text("Text size")
                        Slider(value: $app.textScale, in: 0.8...1.6, step: 0.05)
                    }
                    Toggle("Show climb counts in the menu", isOn: $app.showClimbsInMenu)
                }
                Section("Server") {
                    TextField(AppConfig.defaultBase.absoluteString, text: $syncBase)
                        .textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL)
                    TextField("Sign-in client id", text: $clientId)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                    Text("Leave both empty for the normal site.").font(.caption).foregroundStyle(.secondary)
                }
                Section("About") {
                    LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "")
                    LabeledContent("Guides", value: String((app.manifest?.contentCommit ?? "").prefix(8)))
                    Link("thesarvo.com", destination: URL(string: "https://thesarvo.com")!)
                }
                Section {
                    Button("Reset downloaded data", role: .destructive) { confirmReset = true }
                }
            }
            .navigationTitle("Settings")
            .confirmationDialog("Delete your thesarvo account? This cannot be undone.", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete account", role: .destructive) { Task { await deleteAccount() } }
            }
            .confirmationDialog("Remove everything downloaded and go back to the guides that came with the app?", isPresented: $confirmReset, titleVisibility: .visible) {
                Button("Reset", role: .destructive) { app.resetStore() }
            }
        }
    }

    private func deleteAccount() async {
        deleteError = nil
        let token = await auth.freshTokens()?.idToken
        let r = await BridgeAPI.perform(BridgeRequest(["id": 0, "method": "POST", "path": "/g/api/delete-account", "headers": ["content-type": "application/json"], "body": "{\"confirm\":\"delete\"}"])!, idToken: token)
        if r.status == 200 { auth.signOut() } else { deleteError = r.status == 0 ? "You are offline." : "Deleting accounts is not available yet. Email the site owner to have it removed." }
    }
}

struct AccountSection: View {
    @ObservedObject var auth: AuthSession
    @Binding var confirmDelete: Bool
    let deleteError: String?

    var body: some View {
        Section("Account") {
            if let user = auth.user {
                LabeledContent("Name", value: user.name.isEmpty ? "–" : user.name)
                LabeledContent("Email", value: user.email)
                if user.canEdit { LabeledContent("Access", value: "Can edit guides") }
                Button("Sign out") { auth.signOut() }
                Button("Delete account", role: .destructive) { confirmDelete = true }
                if let deleteError { Text(deleteError).font(.caption).foregroundStyle(.red) }
            } else {
                Button { Task { await auth.signIn() } } label: {
                    HStack { Text("Sign in"); if auth.busy { Spacer(); ProgressView() } }
                }
                .disabled(auth.busy)
                if let e = auth.error { Text(e).font(.caption).foregroundStyle(.red) }
                Text("Sign in to read members-only guides and to edit. Everything else works without an account.").font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}
