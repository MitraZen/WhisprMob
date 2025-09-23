package com.whisprmobiletemp

import android.app.Activity
import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

class NotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val notificationService = NotificationService(reactContext)
    
    override fun getName(): String {
        return "NotificationModule"
    }
    
    @ReactMethod
    fun showMessageNotification(title: String, message: String, buddyName: String, promise: Promise) {
        try {
            notificationService.showMessageNotification(title, message, buddyName)
            promise.resolve("Notification sent successfully")
        } catch (e: Exception) {
            promise.reject("NOTIFICATION_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun showNoteNotification(title: String, content: String, promise: Promise) {
        try {
            notificationService.showNoteNotification(title, content)
            promise.resolve("Notification sent successfully")
        } catch (e: Exception) {
            promise.reject("NOTIFICATION_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun showGeneralNotification(title: String, content: String, promise: Promise) {
        try {
            notificationService.showGeneralNotification(title, content)
            promise.resolve("Notification sent successfully")
        } catch (e: Exception) {
            promise.reject("NOTIFICATION_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun cancelAllNotifications(promise: Promise) {
        try {
            notificationService.cancelAllNotifications()
            promise.resolve("All notifications cancelled")
        } catch (e: Exception) {
            promise.reject("NOTIFICATION_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun testNotification(promise: Promise) {
        try {
            notificationService.showGeneralNotification(
                "Whispr Test", 
                "This is a test notification from Whispr!"
            )
            promise.resolve("Test notification sent")
        } catch (e: Exception) {
            promise.reject("NOTIFICATION_ERROR", e.message, e)
        }
    }
}
