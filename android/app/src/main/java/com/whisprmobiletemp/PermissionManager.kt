package com.whisprmobiletemp

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class PermissionManager(private val context: Context) {
    
    companion object {
        const val PERMISSION_REQUEST_CODE = 1000
        
        // Permission groups
        val NOTIFICATION_PERMISSIONS = arrayOf(
            Manifest.permission.POST_NOTIFICATIONS,
            Manifest.permission.VIBRATE,
            Manifest.permission.WAKE_LOCK
        )
        
        val STORAGE_PERMISSIONS = arrayOf(
            Manifest.permission.READ_EXTERNAL_STORAGE,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
        )
        
        val CAMERA_PERMISSIONS = arrayOf(
            Manifest.permission.CAMERA
        )
        
        val LOCATION_PERMISSIONS = arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        
        val CONTACT_PERMISSIONS = arrayOf(
            Manifest.permission.READ_CONTACTS
        )
        
        val PHONE_PERMISSIONS = arrayOf(
            Manifest.permission.READ_PHONE_STATE
        )
    }
    
    fun checkNotificationPermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        } else {
            true // Notifications are granted by default on older versions
        }
    }
    
    fun checkStoragePermissions(): Boolean {
        return STORAGE_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    fun checkCameraPermissions(): Boolean {
        return CAMERA_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    fun checkLocationPermissions(): Boolean {
        return LOCATION_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    fun checkContactPermissions(): Boolean {
        return CONTACT_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    fun checkPhonePermissions(): Boolean {
        return PHONE_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    fun requestNotificationPermissions(activity: Activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                PERMISSION_REQUEST_CODE
            )
        }
    }
    
    fun requestStoragePermissions(activity: Activity) {
        val permissionsToRequest = STORAGE_PERMISSIONS.filter { permission ->
            ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED
        }.toTypedArray()
        
        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                activity,
                permissionsToRequest,
                PERMISSION_REQUEST_CODE
            )
        }
    }
    
    fun requestCameraPermissions(activity: Activity) {
        val permissionsToRequest = CAMERA_PERMISSIONS.filter { permission ->
            ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED
        }.toTypedArray()
        
        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                activity,
                permissionsToRequest,
                PERMISSION_REQUEST_CODE
            )
        }
    }
    
    fun requestLocationPermissions(activity: Activity) {
        val permissionsToRequest = LOCATION_PERMISSIONS.filter { permission ->
            ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED
        }.toTypedArray()
        
        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                activity,
                permissionsToRequest,
                PERMISSION_REQUEST_CODE
            )
        }
    }
    
    fun requestContactPermissions(activity: Activity) {
        val permissionsToRequest = CONTACT_PERMISSIONS.filter { permission ->
            ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED
        }.toTypedArray()
        
        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                activity,
                permissionsToRequest,
                PERMISSION_REQUEST_CODE
            )
        }
    }
    
    fun requestPhonePermissions(activity: Activity) {
        val permissionsToRequest = PHONE_PERMISSIONS.filter { permission ->
            ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED
        }.toTypedArray()
        
        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                activity,
                permissionsToRequest,
                PERMISSION_REQUEST_CODE
            )
        }
    }
    
    fun getAllPermissionStatus(): Map<String, Boolean> {
        return mapOf(
            "notifications" to checkNotificationPermissions(),
            "storage" to checkStoragePermissions(),
            "camera" to checkCameraPermissions(),
            "location" to checkLocationPermissions(),
            "contacts" to checkContactPermissions(),
            "phone" to checkPhonePermissions()
        )
    }
    
    fun getMissingPermissions(): List<String> {
        val status = getAllPermissionStatus()
        return status.filter { !it.value }.keys.toList()
    }
    
    fun shouldShowRequestRationale(permissionType: String, activity: Activity): Boolean {
        return when (permissionType) {
            "notifications" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.POST_NOTIFICATIONS)
                } else {
                    false
                }
            }
            "storage" -> {
                STORAGE_PERMISSIONS.any { permission ->
                    ActivityCompat.shouldShowRequestPermissionRationale(activity, permission)
                }
            }
            "camera" -> {
                CAMERA_PERMISSIONS.any { permission ->
                    ActivityCompat.shouldShowRequestPermissionRationale(activity, permission)
                }
            }
            "location" -> {
                LOCATION_PERMISSIONS.any { permission ->
                    ActivityCompat.shouldShowRequestPermissionRationale(activity, permission)
                }
            }
            "contacts" -> {
                CONTACT_PERMISSIONS.any { permission ->
                    ActivityCompat.shouldShowRequestPermissionRationale(activity, permission)
                }
            }
            "phone" -> {
                PHONE_PERMISSIONS.any { permission ->
                    ActivityCompat.shouldShowRequestPermissionRationale(activity, permission)
                }
            }
            else -> false
        }
    }
}
