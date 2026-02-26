package im.cxa.fanatter

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "gohan"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    // Draw behind both system bars (edge-to-edge).
    WindowCompat.setDecorFitsSystemWindows(window, false)

    // API < 35: set color directly. Ignored on API 35+ but kept for older devices.
    @Suppress("DEPRECATION")
    window.statusBarColor = Color.TRANSPARENT
    @Suppress("DEPRECATION")
    window.navigationBarColor = Color.TRANSPARENT

    // API 29+: disable the contrast-enforcement scrim the system adds behind
    // gesture navigation bars and the status bar on some OEMs.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.isNavigationBarContrastEnforced = false
      window.isStatusBarContrastEnforced = false
    }

    super.onCreate(savedInstanceState)

    // API 35+ (Android 15): window.navigationBarColor is fully ignored.
    // WindowInsetsControllerCompat is the only way to influence bar appearance.
    // This must be called after super.onCreate() so the decorView is attached.
    WindowInsetsControllerCompat(window, window.decorView).also { controller ->
      // Setting light appearance to false keeps nav bar icons visible on a
      // transparent (dark) background. RN's StatusBar component handles the
      // status bar icons independently at the screen level.
      controller.isAppearanceLightNavigationBars = false
    }
  }
}
