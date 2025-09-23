package com.whisprmobiletemp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

class NotificationService(private val context: Context) {
    
    companion object {
        const val CHANNEL_ID_MESSAGES = "whispr_messages"
        const val CHANNEL_ID_NOTES = "whispr_notes"
        const val CHANNEL_ID_GENERAL = "whispr_general"
        
        const val NOTIFICATION_ID_MESSAGE = 1001
        const val NOTIFICATION_ID_NOTE = 1002
        const val NOTIFICATION_ID_GENERAL = 1003
    }
    
    init {
        createNotificationChannels()
    }
    
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Messages channel
            val messagesChannel = NotificationChannel(
                CHANNEL_ID_MESSAGES,
                "Whispr Messages",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for new messages from buddies"
                enableVibration(true)
                enableLights(true)
            }
            
            // Notes channel
            val notesChannel = NotificationChannel(
                CHANNEL_ID_NOTES,
                "Whispr Notes",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifications for new Whispr notes"
                enableVibration(true)
            }
            
            // General channel
            val generalChannel = NotificationChannel(
                CHANNEL_ID_GENERAL,
                "Whispr General",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "General Whispr notifications"
            }
            
            notificationManager.createNotificationChannels(listOf(messagesChannel, notesChannel, generalChannel))
        }
    }
    
    fun showMessageNotification(title: String, message: String, buddyName: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(context, CHANNEL_ID_MESSAGES)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("New message from $buddyName")
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setVibrate(longArrayOf(0, 300, 100, 300))
            .build()
        
        with(NotificationManagerCompat.from(context)) {
            notify(NOTIFICATION_ID_MESSAGE, notification)
        }
    }
    
    fun showNoteNotification(title: String, content: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(context, CHANNEL_ID_NOTES)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("New Whispr Note")
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setVibrate(longArrayOf(0, 200, 100, 200))
            .build()
        
        with(NotificationManagerCompat.from(context)) {
            notify(NOTIFICATION_ID_NOTE, notification)
        }
    }
    
    fun showGeneralNotification(title: String, content: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(context, CHANNEL_ID_GENERAL)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()
        
        with(NotificationManagerCompat.from(context)) {
            notify(NOTIFICATION_ID_GENERAL, notification)
        }
    }
    
    fun cancelAllNotifications() {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancelAll()
    }
    
    fun cancelNotification(notificationId: Int) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(notificationId)
    }
}
