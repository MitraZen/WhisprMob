package com.whisprmobiletemp

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

class PermissionManager(private val context: Context) {
    
    companion object {
        const val PERMISSION_REQUEST_CODE = 1000
        
        // Permission groups with proper Android version handling
        val NOTIFICATION_PERMISSIONS = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            arrayOf() // Not needed for older versions
        }
        
        val STORAGE_PERMISSIONS = when {
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> {
                // Android 13+ - granular media permissions
                arrayOf(
                    Manifest.permission.READ_MEDIA_IMAGES,
                    Manifest.permission.READ_MEDIA_VIDEO,
                    Manifest.permission.READ_MEDIA_AUDIO
                )
            }
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.R -> {
                // Android 11-12 - scoped storage with read permission
                arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
            else -> {
                // Android 10 and below
                arrayOf(
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
                )
            }
        }
        
        val CAMERA_PERMISSIONS = arrayOf(
            Manifest.permission.CAMERA
        )
        
        val LOCATION_PERMISSIONS = arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        
        val CONTACT_PERMISSIONS = arrayOf(
            Manifest.permission.READ_CONTACTS,
            Manifest.permission.WRITE_CONTACTS
        )
        
        val PHONE_PERMISSIONS = arrayOf(
            Manifest.permission.READ_PHONE_STATE
        )
    }
    
    // ============================================================
    // CHECK PERMISSIONS
    // ============================================================
    
    fun checkNotificationPermissions(): Boolean {
        return when {
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> {
                // Android 13+ - check POST_NOTIFICATIONS permission
                ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
            }
            else -> {
                // Older versions - check if notifications are enabled in system settings
                NotificationManagerCompat.from(context).areNotificationsEnabled()
            }
        }
    }
    
    fun checkStoragePermissions(): Boolean {
        return when {
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.R -> {
                // Android 11+ - scoped storage (app-specific dirs don't need permission)
                // Check if we have media permissions for Android 13+, or READ for Android 11-12
                STORAGE_PERMISSIONS.isEmpty() || STORAGE_PERMISSIONS.all { permission ->
                    ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
                }
            }
            else -> {
                // Android 10 and below
                STORAGE_PERMISSIONS.all { permission ->
                    ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
                }
            }
        }
    }
    
    fun checkCameraPermissions(): Boolean {
        return checkAllPermissions(CAMERA_PERMISSIONS)
    }
    
    fun checkLocationPermissions(): Boolean {
        return checkAllPermissions(LOCATION_PERMISSIONS)
    }
    
    fun checkContactPermissions(): Boolean {
        return checkAllPermissions(CONTACT_PERMISSIONS)
    }
    
    fun checkPhonePermissions(): Boolean {
        return checkAllPermissions(PHONE_PERMISSIONS)
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
    
    // ============================================================
    // REQUEST PERMISSIONS
    // ============================================================
    
    fun requestNotificationPermissions(activity: Activity) {
        when {
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> {
                // Android 13+ - request POST_NOTIFICATIONS permission
                ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    PERMISSION_REQUEST_CODE
                )
            }
            else -> {
                // Older versions - open notification settings
                openAppNotificationSettings()
            }
        }
    }
    
    fun requestStoragePermissions(activity: Activity) {
        when {
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.R -> {
                // Android 11+ - For accessing all files, need special handling
                // For media files, request READ_MEDIA_* permissions (Android 13+)
                if (STORAGE_PERMISSIONS.isNotEmpty()) {
                    val permissionsToRequest = getMissingPermissionsFromArray(STORAGE_PERMISSIONS)
                    if (permissionsToRequest.isNotEmpty()) {
                        ActivityCompat.requestPermissions(
                            activity,
                            permissionsToRequest,
                            PERMISSION_REQUEST_CODE
                        )
                    }
                } else {
                    // Android 11-12 with scoped storage - might need to open settings
                    openAppPermissionsSettings()
                }
            }
            else -> {
                // Android 10 and below
                requestPermissionsIfNeeded(activity, STORAGE_PERMISSIONS)
            }
        }
    }
    
    fun requestCameraPermissions(activity: Activity) {
        requestPermissionsIfNeeded(activity, CAMERA_PERMISSIONS)
    }
    
    fun requestLocationPermissions(activity: Activity) {
        requestPermissionsIfNeeded(activity, LOCATION_PERMISSIONS)
    }
    
    fun requestContactPermissions(activity: Activity) {
        requestPermissionsIfNeeded(activity, CONTACT_PERMISSIONS)
    }
    
    fun requestPhonePermissions(activity: Activity) {
        requestPermissionsIfNeeded(activity, PHONE_PERMISSIONS)
    }
    
    // ============================================================
    // RATIONALE & UTILITY
    // ============================================================
    
    fun shouldShowRequestRationale(permissionType: String, activity: Activity): Boolean {
        val permissions = when (permissionType) {
            "notifications" -> NOTIFICATION_PERMISSIONS
            "storage" -> STORAGE_PERMISSIONS
            "camera" -> CAMERA_PERMISSIONS
            "location" -> LOCATION_PERMISSIONS
            "contacts" -> CONTACT_PERMISSIONS
            "phone" -> PHONE_PERMISSIONS
            else -> return false
        }
        
        return permissions.any { permission ->
            ActivityCompat.shouldShowRequestPermissionRationale(activity, permission)
        }
    }
    
    fun getMissingPermissions(): List<String> {
        val status = getAllPermissionStatus()
        return status.filter { !it.value }.keys.toList()
    }
    
    fun getDetailedPermissionStatus(permissionType: String): Map<String, Any> {
        val permissions = when (permissionType) {
            "notifications" -> NOTIFICATION_PERMISSIONS
            "storage" -> STORAGE_PERMISSIONS
            "camera" -> CAMERA_PERMISSIONS
            "location" -> LOCATION_PERMISSIONS
            "contacts" -> CONTACT_PERMISSIONS
            "phone" -> PHONE_PERMISSIONS
            else -> arrayOf()
        }
        
        val grantedPermissions = permissions.filter { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
        
        return mapOf(
            "type" to permissionType,
            "allGranted" to (grantedPermissions.size == permissions.size),
            "grantedCount" to grantedPermissions.size,
            "totalCount" to permissions.size,
            "grantedPermissions" to grantedPermissions,
            "permissions" to permissions.toList()
        )
    }
    
    // ============================================================
    // SETTINGS NAVIGATION
    // ============================================================
    
    fun openBatteryOptimizationSettings() {
        try {
            val packageName = context.packageName
            val intent = when {
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M -> {
                    Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                }
                else -> {
                    Intent(Settings.ACTION_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                }
            }
            
            if (intent.resolveActivity(context.packageManager) != null) {
                context.startActivity(intent)
            } else {
                // Fallback to general settings
                openGeneralSettings()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            openGeneralSettings()
        }
    }
    
    fun openAppPermissionsSettings() {
        try {
            val packageName = context.packageName
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$packageName")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            
            if (intent.resolveActivity(context.packageManager) != null) {
                context.startActivity(intent)
            } else {
                // Fallback to application settings list
                val fallbackIntent = Intent(Settings.ACTION_APPLICATION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallbackIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            openGeneralSettings()
        }
    }
    
    fun openAppNotificationSettings() {
        try {
            val packageName = context.packageName
            val intent = when {
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O -> {
                    // Android 8+ - direct notification settings
                    Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                        putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                }
                else -> {
                    // Older versions - app details settings
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.parse("package:$packageName")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                }
            }
            
            if (intent.resolveActivity(context.packageManager) != null) {
                context.startActivity(intent)
            } else {
                openAppPermissionsSettings()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            openAppPermissionsSettings()
        }
    }
    
    // ============================================================
    // HELPER METHODS
    // ============================================================
    
    /**
     * Check if all permissions in array are granted
     */
    private fun checkAllPermissions(permissions: Array<String>): Boolean {
        return permissions.all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    /**
     * Check if any permission in array is granted
     */
    private fun checkAnyPermission(permissions: Array<String>): Boolean {
        return permissions.any { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    /**
     * Get missing permissions from an array
     */
    private fun getMissingPermissionsFromArray(permissions: Array<String>): Array<String> {
        return permissions.filter { permission ->
            ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED
        }.toTypedArray()
    }
    
    /**
     * Request only the missing permissions from an array
     */
    private fun requestPermissionsIfNeeded(activity: Activity, permissions: Array<String>) {
        val permissionsToRequest = getMissingPermissionsFromArray(permissions)
        
        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                activity,
                permissionsToRequest,
                PERMISSION_REQUEST_CODE
            )
        }
    }
    
    /**
     * Open general device settings
     */
    private fun openGeneralSettings() {
        try {
            val intent = Intent(Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    /**
     * Check if battery optimization is ignored for this app
     */
    fun isBatteryOptimizationIgnored(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            powerManager.isIgnoringBatteryOptimizations(context.packageName)
        } else {
            true // Not applicable for older versions
        }
    }
    
    /**
     * Check if a specific permission is granted
     */
    fun isPermissionGranted(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    }
}