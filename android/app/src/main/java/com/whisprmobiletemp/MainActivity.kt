package com.whisprmobiletemp

import android.os.Bundle
import android.view.View
import android.view.KeyEvent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener

class MainActivity : ReactActivity(), PermissionAwareActivity {

  private var permissionListener: PermissionListener? = null

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "WhisprMobileTemp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Let the theme handle system UI styling
    // Remove conflicting system UI flags that interfere with styles.xml
    
    // Initialize notification service
    NotificationService(this)
    
    // Initialize permission manager
    PermissionManager(this)
  }
  
  override fun onBackPressed() {
    // Handle back button - exit app instead of minimizing
    finishAffinity()
    System.exit(0)
  }

  override fun requestPermissions(permissions: Array<String>, requestCode: Int, listener: PermissionListener?) {
    permissionListener = listener
    super.requestPermissions(permissions, requestCode)
  }

  override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    permissionListener?.onRequestPermissionsResult(requestCode, permissions, grantResults)
  }
}
