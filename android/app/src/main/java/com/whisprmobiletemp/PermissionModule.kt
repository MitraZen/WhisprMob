package com.whisprmobiletemp

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.PermissionListener

class PermissionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), PermissionListener {
    
    private var permissionCallback: Promise? = null
    private val permissionManager = PermissionManager(reactContext)
    
    override fun getName(): String {
        return "PermissionModule"
    }
    
    @ReactMethod
    fun checkNotificationPermissions(promise: Promise) {
        try {
            val hasPermission = permissionManager.checkNotificationPermissions()
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun checkStoragePermissions(promise: Promise) {
        try {
            val hasPermission = permissionManager.checkStoragePermissions()
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun checkCameraPermissions(promise: Promise) {
        try {
            val hasPermission = permissionManager.checkCameraPermissions()
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun checkLocationPermissions(promise: Promise) {
        try {
            val hasPermission = permissionManager.checkLocationPermissions()
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun checkContactPermissions(promise: Promise) {
        try {
            val hasPermission = permissionManager.checkContactPermissions()
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun checkPhonePermissions(promise: Promise) {
        try {
            val hasPermission = permissionManager.checkPhonePermissions()
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getAllPermissionStatus(promise: Promise) {
        try {
            val status = permissionManager.getAllPermissionStatus()
            val result = Arguments.createMap()
            status.forEach { (key, value) ->
                result.putBoolean(key, value)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun requestNotificationPermissions(promise: Promise) {
        try {
            val activity = getCurrentActivity()
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity")
                return
            }
            
            permissionCallback = promise
            permissionManager.requestNotificationPermissions(activity as Activity)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun requestStoragePermissions(promise: Promise) {
        try {
            val activity = getCurrentActivity()
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity")
                return
            }
            
            permissionCallback = promise
            permissionManager.requestStoragePermissions(activity as Activity)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun requestCameraPermissions(promise: Promise) {
        try {
            val activity = getCurrentActivity()
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity")
                return
            }
            
            permissionCallback = promise
            permissionManager.requestCameraPermissions(activity as Activity)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun requestLocationPermissions(promise: Promise) {
        try {
            val activity = getCurrentActivity()
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity")
                return
            }
            
            permissionCallback = promise
            permissionManager.requestLocationPermissions(activity as Activity)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun requestContactPermissions(promise: Promise) {
        try {
            val activity = getCurrentActivity()
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity")
                return
            }
            
            permissionCallback = promise
            permissionManager.requestContactPermissions(activity as Activity)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun requestPhonePermissions(promise: Promise) {
        try {
            val activity = getCurrentActivity()
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity")
                return
            }
            
            permissionCallback = promise
            permissionManager.requestPhonePermissions(activity as Activity)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun shouldShowRequestRationale(permissionType: String, promise: Promise) {
        try {
            val activity = getCurrentActivity()
            if (activity == null) {
                promise.resolve(false)
                return
            }
            
            val shouldShow = permissionManager.shouldShowRequestRationale(permissionType, activity as Activity)
            promise.resolve(shouldShow)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray): Boolean {
        if (requestCode == PermissionManager.PERMISSION_REQUEST_CODE) {
            val callback = permissionCallback
            permissionCallback = null
            
            if (callback != null) {
                val allGranted = grantResults.all { it == PackageManager.PERMISSION_GRANTED }
                callback.resolve(allGranted)
            }
            return true
        }
        return false
    }
}
