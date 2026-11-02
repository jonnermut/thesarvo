import SwiftUI

/// Shown once: how many photos to keep on the phone. The guides themselves (text, topos, maps, small pictures) are already in the app.
struct FirstRunView: View {
    @EnvironmentObject var app: AppModel
    @State private var choice: DownloadMode = .allPhotos

    var body: some View {
        // Scrolls (and the text shrinks first) so nothing is cut off on a small phone or with large text.
        ScrollView {
        VStack(alignment: .leading, spacing: 20) {
            Text("Welcome to thesarvo").font(.largeTitle.bold()).lineLimit(1).minimumScaleFactor(0.5)
            Text("Every guide is already on this device and works without a signal. Choose how many full-size photos to keep as well. You can change this later in Downloads.")
                .foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            VStack(spacing: 10) {
                ForEach(DownloadMode.allCases) { m in
                    Button { choice = m } label: {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(m.title).font(.headline).lineLimit(1).minimumScaleFactor(0.7)
                                Text(app.sizeLabel(m)).font(.subheadline).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.7)
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
            Toggle(isOn: $app.cellularImages) {
                VStack(alignment: .leading) {
                    Text("Use mobile data for photos").font(.headline)
                    Text(app.cellularImages ? "Photos download on any connection." : "Photos wait for Wi-Fi.").font(.subheadline).foregroundStyle(.secondary)
                }
            }
            .padding()
            .background(RoundedRectangle(cornerRadius: 12).fill(Color(.secondarySystemBackground)))
            Button {
                app.mode = choice
                app.firstRunDone = true
            } label: { Text("Continue").foregroundStyle(Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0.106, green: 0.078, blue: 0.392, alpha: 1) : .white })).frame(maxWidth: .infinity).padding(.vertical, 6) }
                .buttonStyle(.borderedProminent)
        }
        .padding(24)
        }
        .scrollBounceBehavior(.basedOnSize)
        .frame(maxWidth: 560)
        .frame(maxWidth: .infinity)
        .background(Color(.systemBackground))
    }
}
