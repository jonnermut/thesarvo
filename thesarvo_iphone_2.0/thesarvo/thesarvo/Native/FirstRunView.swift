import SwiftUI

/// Shown once: how many photos to keep on the phone. The guides themselves (text, topos, maps, small pictures) are already in the app.
struct FirstRunView: View {
    @EnvironmentObject var app: AppModel
    @State private var choice: DownloadMode = .thumbnails

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Spacer()
            Text("Welcome to thesarvo").font(.largeTitle.bold())
            Text("Every guide is already on this device and works without a signal. Choose how many full-size photos to keep as well. You can change this later in Downloads.")
                .foregroundStyle(.secondary)
            VStack(spacing: 10) {
                ForEach(DownloadMode.allCases) { m in
                    Button { choice = m } label: {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(m.title).font(.headline)
                                Text(m == .pinned ? "You pick the guides in Downloads" : app.sizeLabel(m)).font(.subheadline).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: choice == m ? "checkmark.circle.fill" : "circle").foregroundStyle(choice == m ? brandTint : .secondary)
                        }
                        .padding()
                        .background(RoundedRectangle(cornerRadius: 12).fill(Color(.secondarySystemBackground)))
                    }
                    .buttonStyle(.plain)
                }
            }
            Text("Photos download on Wi-Fi unless you allow mobile data.").font(.footnote).foregroundStyle(.secondary)
            Spacer()
            Button {
                app.mode = choice
                app.firstRunDone = true
            } label: { Text("Continue").foregroundStyle(Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0.106, green: 0.078, blue: 0.392, alpha: 1) : .white })).frame(maxWidth: .infinity).padding(.vertical, 6) }
                .buttonStyle(.borderedProminent)
        }
        .padding(24)
        .frame(maxWidth: 560)
        .frame(maxWidth: .infinity)
        .background(Color(.systemBackground))
    }
}
