import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)

    if let controller = window?.rootViewController as? FlutterViewController {
      let channel = FlutterMethodChannel(name: "com.sana.dev.fm/app_info", binaryMessenger: controller.binaryMessenger)
      channel.setMethodCallHandler { (call: FlutterMethodCall, result: @escaping FlutterResult) in
        if call.method == "getAppVersion" {
          let versionName = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? ""
          let versionCodeStr = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0"
          let versionCode = Int(versionCodeStr) ?? 0
          result([
            "versionName": versionName,
            "versionCode": versionCode
          ])
        } else {
          result(FlutterMethodNotImplemented)
        }
      }
    }

    return result
  }
}
