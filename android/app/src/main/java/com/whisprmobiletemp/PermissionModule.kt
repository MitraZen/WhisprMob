package com.whisprmobiletemp

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.PermissionListener

class PermissionModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext), 
    PermissionListener {
    
    private var permissionCallback: Promise? = null
    private val permissionManager = PermissionManager(reactContext)
    
    companion object {
        private const val TAG = "PermissionModule"
        private const val ERROR_NO_ACTIVITY = "NO_ACTIVITY"
        private const val ERROR_PERMISSION = "PERMISSION_ERROR"
        private const val ERROR_ALREADY_REQUESTING = "ALREADY_REQUESTING"
    }
    
    override fun getName(): String = "PermissionModule"
    
    // ============================================================
    // CHECK PERMISSIONS
    // ============================================================
    
    @ReactMethod
    fun checkNotificationPermissions(promise: Promise) {
        safeExecute(promise) {
            permissionManager.checkNotificationPermissions()
        }
    }
    
    @ReactMethod
    fun checkStoragePermissions(promise: Promise) {
        safeExecute(promise) {
            permissionManager.checkStoragePermissions()
        }
    }
    
    @ReactMethod
    fun checkCameraPermissions(promise: Promise) {
        safeExecute(promise) {
            permissionManager.checkCameraPermissions()
        }
    }
    
    @ReactMethod
    fun checkLocationPermissions(promise: Promise) {
        safeExecute(promise) {
            permissionManager.checkLocationPermissions()
        }
    }
    
    @ReactMethod
    fun checkContactPermissions(promise: Promise) {
        safeExecute(promise) {
            permissionManager.checkContactPermissions()
        }
    }
    
    @ReactMethod
    fun checkPhonePermissions(promise: Promise) {
        safeExecute(promise) {
            permissionManager.checkPhonePermissions()
        }
    }
    
    @ReactMethod
    fun getAllPermissionStatus(promise: Promise) {
        try {
            val status = permissionManager.getAllPermissionStatus()
            val result = Arguments.createMap().apply {
                status.forEach { (key, value) ->
                    putBoolean(key, value)
                }
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject(ERROR_PERMISSION, "Failed to get permission status: ${e.message}", e)
        }
    }
    
    // ============================================================
    // REQUEST PERMISSIONS
    // ============================================================
    
    @ReactMethod
    fun requestNotificationPermissions(promise: Promise) {
        requestPermissionWithActivity(promise) { activity ->
            permissionManager.requestNotificationPermissions(activity)
        }
    }
    
    @ReactMethod
    fun requestStoragePermissions(promise: Promise) {
        requestPermissionWithActivity(promise) { activity ->
            permissionManager.requestStoragePermissions(activity)
        }
    }
    
    @ReactMethod
    fun requestCameraPermissions(promise: Promise) {
        requestPermissionWithActivity(promise) { activity ->
            permissionManager.requestCameraPermissions(activity)
        }
    }
    
    @ReactMethod
    fun requestLocationPermissions(promise: Promise) {
        requestPermissionWithActivity(promise) { activity ->
            permissionManager.requestLocationPermissions(activity)
        }
    }
    
    @ReactMethod
    fun requestContactPermissions(promise: Promise) {
        requestPermissionWithActivity(promise) { activity ->
            permissionManager.requestContactPermissions(activity)
        }
    }
    
    @ReactMethod
    fun requestPhonePermissions(promise: Promise) {
        requestPermissionWithActivity(promise) { activity ->
            permissionManager.requestPhonePermissions(activity)
        }
    }
    
    // ============================================================
    // RATIONALE & SETTINGS
    // ============================================================
    
    @ReactMethod
    fun shouldShowRequestRationale(permissionType: String, promise: Promise) {
        try {
            val activity = getCurrentActivity()
            if (activity == null) {
                promise.resolve(false)
                return
            }
            
            val shouldShow = permissionManager.shouldShowRequestRationale(permissionType, activity)
            promise.resolve(shouldShow)
        } catch (e: Exception) {
            promise.reject(ERROR_PERMISSION, "Failed to check rationale: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun openBatteryOptimizationSettings(promise: Promise) {
        try {
            permissionManager.openBatteryOptimizationSettings()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject(ERROR_PERMISSION, "Failed to open battery settings: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun openAppPermissionsSettings(promise: Promise) {
        try {
            permissionManager.openAppPermissionsSettings()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject(ERROR_PERMISSION, "Failed to open app settings: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun openAppNotificationSettings(promise: Promise) {
        try {
            permissionManager.openAppNotificationSettings()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject(ERROR_PERMISSION, "Failed to open notification settings: ${e.message}", e)
        }
    }
    
    // ============================================================
    // ADDITIONAL UTILITY METHODS
    // ============================================================
    
    @ReactMethod
    fun getMissingPermissions(promise: Promise) {
        try {
            val missing = permissionManager.getMissingPermissions()
            val result = Arguments.createArray().apply {
                missing.forEach { pushString(it) }
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject(ERROR_PERMISSION, "Failed to get missing permissions: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun isBatteryOptimizationIgnored(promise: Promise) {
        try {
            val isIgnored = permissionManager.isBatteryOptimizationIgnored()
            promise.resolve(isIgnored)
        } catch (e: Exception) {
            promise.reject(ERROR_PERMISSION, "Failed to check battery optimization: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun isPermissionGranted(permission: String, promise: Promise) {
        try {
            val granted = permissionManager.isPermissionGranted(permission)
            promise.resolve(granted)
        } catch (e: Exception) {
            promise.reject(ERROR_PERMISSION, "Failed to check permission: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun getPermissionInfo(permissionType: String, promise: Promise) {
        try {
            val activity = getCurrentActivity()
            val info = permissionManager.getDetailedPermissionStatus(permissionType)
            
            val result = Arguments.createMap().apply {
                putString("type", info["type"] as String)
                putBoolean("allGranted", info["allGranted"] as Boolean)
                putInt("grantedCount", info["grantedCount"] as Int)
                putInt("totalCount", info["totalCount"] as Int)
                
                // Add rationale info if activity available
                if (activity != null) {
                    val shouldShow = permissionManager.shouldShowRequestRationale(permissionType, activity)
                    val isGranted = info["allGranted"] as Boolean
                    
                    putBoolean("shouldShowRationale", shouldShow)
                    putBoolean("canRequest", !isGranted && shouldShow)
                    putBoolean("isPermanentlyDenied", !isGranted && !shouldShow)
                }
                
                // Add granted permissions array
                val grantedPerms = Arguments.createArray()
                @Suppress("UNCHECKED_CAST")
                (info["grantedPermissions"] as List<String>).forEach { 
                    grantedPerms.pushString(it) 
                }
                putArray("grantedPermissions", grantedPerms)
                
                // Add all permissions array
                val allPerms = Arguments.createArray()
                @Suppress("UNCHECKED_CAST")
                (info["permissions"] as List<String>).forEach { 
                    allPerms.pushString(it) 
                }
                putArray("permissions", allPerms)
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject(ERROR_PERMISSION, "Failed to get permission info: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun isPermissionPermanentlyDenied(permissionType: String, promise: Promise) {
        try {
            val activity = getCurrentActivity()
            if (activity == null) {
                promise.resolve(false)
                return
            }
            
            // If permission is granted, it's not permanently denied
            val isGranted = when (permissionType) {
                "notifications" -> permissionManager.checkNotificationPermissions()
                "storage" -> permissionManager.checkStoragePermissions()
                "camera" -> permissionManager.checkCameraPermissions()
                "location" -> permissionManager.checkLocationPermissions()
                "contacts" -> permissionManager.checkContactPermissions()
                "phone" -> permissionManager.checkPhonePermissions()
                else -> false
            }
            
            if (isGranted) {
                promise.resolve(false)
                return
            }
            
            // If we shouldn't show rationale and it's not granted, it's permanently denied
            val shouldShow = permissionManager.shouldShowRequestRationale(permissionType, activity)
            promise.resolve(!shouldShow)
        } catch (e: Exception) {
            promise.reject(ERROR_PERMISSION, "Failed to check permanent denial: ${e.message}", e)
        }
    }
    
    // ============================================================
    // PERMISSION RESULT HANDLING
    // ============================================================
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ): Boolean {
        if (requestCode != PermissionManager.PERMISSION_REQUEST_CODE) {
            return false
        }
        
        val callback = permissionCallback
        permissionCallback = null
        
        if (callback == null) {
            return false
        }
        
        try {
            when {
                grantResults.isEmpty() -> {
                    // Permission request was cancelled
                    callback.resolve(false)
                }
                grantResults.all { it == PackageManager.PERMISSION_GRANTED } -> {
                    // All permissions granted
                    callback.resolve(true)
                }
                else -> {
                    // Some or all permissions denied
                    callback.resolve(false)
                }
            }
        } catch (e: Exception) {
            callback.reject(ERROR_PERMISSION, "Error processing permission result: ${e.message}", e)
        }
        
        return true
    }
    
    // ============================================================
    // HELPER METHODS
    // ============================================================
    
    /**
     * Safely execute a permission check operation
     */
    private fun safeExecute(promise: Promise, operation: () -> Boolean) {
        try {
            val result = operation()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject(ERROR_PERMISSION, "Permission check failed: ${e.message}", e)
        }
    }
    
    /**
     * Request permission with activity validation
     */
    private fun requestPermissionWithActivity(
        promise: Promise,
        requestAction: (Activity) -> Unit
    ) {
        try {
            // Check if already requesting
            if (permissionCallback != null) {
                promise.reject(
                    ERROR_ALREADY_REQUESTING,
                    "A permission request is already in progress"
                )
                return
            }
            
            val activity = getCurrentActivity()
            if (activity == null) {
                promise.reject(ERROR_NO_ACTIVITY, "No current activity available")
                return
            }
            
            permissionCallback = promise
            requestAction(activity)
        } catch (e: Exception) {
            permissionCallback = null
            promise.reject(ERROR_PERMISSION, "Failed to request permission: ${e.message}", e)
        }
    }
}