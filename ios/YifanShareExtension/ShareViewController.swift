import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
  private let appGroupID = "group.im.cxa.fanatter"
  private let appURLScheme = "yifan://compose"

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .clear
    loadSharedImage()
  }

  private func loadSharedImage() {
    guard
      let item = extensionContext?.inputItems.first as? NSExtensionItem,
      let attachments = item.attachments,
      !attachments.isEmpty
    else {
      complete(success: false)
      return
    }

    let imageTypeIDs = [
      UTType.jpeg.identifier,
      UTType.png.identifier,
      UTType.heic.identifier,
      UTType.image.identifier,
    ]

    guard let provider = attachments.first(where: { p in
      imageTypeIDs.contains(where: { p.hasItemConformingToTypeIdentifier($0) })
    }) else {
      complete(success: false)
      return
    }

    let typeID = imageTypeIDs.first { provider.hasItemConformingToTypeIdentifier($0) }
      ?? UTType.image.identifier

    provider.loadItem(forTypeIdentifier: typeID) { [weak self] data, _ in
      guard let self else { return }

      var imageData: Data?
      if let url = data as? URL {
        imageData = try? Data(contentsOf: url)
      } else if let img = data as? UIImage {
        imageData = img.jpegData(compressionQuality: 0.9)
      } else if let raw = data as? Data {
        imageData = raw
      }

      guard
        let imageData,
        let container = FileManager.default.containerURL(
          forSecurityApplicationGroupIdentifier: self.appGroupID)
      else {
        self.complete(success: false)
        return
      }

      let timestamp = Int(Date().timeIntervalSince1970 * 1000)
      let dest = container.appendingPathComponent("share-image-\(timestamp).jpg")
      do {
        try imageData.write(to: dest, options: .atomic)
        DispatchQueue.main.async { self.openMainAppAndComplete() }
      } catch {
        self.complete(success: false)
      }
    }
  }

  private func openMainAppAndComplete() {
    guard let url = URL(string: appURLScheme) else {
      complete(success: true)
      return
    }
    // Walk the responder chain to reach UIApplication — works in share extensions on iOS 14+
    var responder: UIResponder? = self
    while let r = responder {
      if let app = r as? UIApplication {
        app.open(url, options: [:]) { [weak self] _ in
          self?.complete(success: true)
        }
        return
      }
      responder = r.next
    }
    // Fallback: extensionContext open (iOS 16+)
    extensionContext?.open(url) { [weak self] _ in
      self?.complete(success: true)
    }
  }

  private func complete(success: Bool) {
    if success {
      extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    } else {
      extensionContext?.cancelRequest(withError: NSError(
        domain: "YifanShare", code: 0,
        userInfo: [NSLocalizedDescriptionKey: "Failed to load image"]))
    }
  }
}
