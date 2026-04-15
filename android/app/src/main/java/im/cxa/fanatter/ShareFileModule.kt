package im.cxa.fanatter

import android.content.Intent
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class ShareFileModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ShareFile"

  @ReactMethod
  fun share(filePath: String, mimeType: String, promise: Promise) {
    try {
      val file = File(filePath)
      if (!file.exists()) {
        promise.reject("FILE_NOT_FOUND", "File does not exist: $filePath")
        return
      }
      val context = reactApplicationContext
      val uri = FileProvider.getUriForFile(
          context,
          "${context.packageName}.fileprovider",
          file,
      )
      val intent = Intent(Intent.ACTION_SEND).apply {
        type = mimeType
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      val activity = reactApplicationContext.currentActivity
      if (activity != null) {
        activity.startActivity(Intent.createChooser(intent, null))
      } else {
        val chooser = Intent.createChooser(intent, null).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(chooser)
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SHARE_ERROR", e.message, e)
    }
  }
}
