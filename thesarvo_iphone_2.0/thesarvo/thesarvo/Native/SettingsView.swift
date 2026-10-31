import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var app: AppModel
    @AppStorage("syncBase") private var syncBase = ""
    @State private var confirmReset = false

    var body: some View {
        NavigationStack {
            Form {
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
                    Text("Leave empty for the normal site.").font(.caption).foregroundStyle(.secondary)
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
            .confirmationDialog("Remove everything downloaded and go back to the guides that came with the app?", isPresented: $confirmReset, titleVisibility: .visible) {
                Button("Reset", role: .destructive) { app.resetStore() }
            }
        }
    }
}
