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
        // MATCH RN channel IDs (use hyphen)
        const val CHANNEL_ID_MESSAGES = "whispr-messages"
        const val CHANNEL_ID_NOTES = "whispr-notes"
        const val CHANNEL_ID_GENERAL = "whispr-general"

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

            // Messages channel (high importance)
            val messagesChannel = NotificationChannel(
                CHANNEL_ID_MESSAGES,
                "Whispr Messages",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for new messages from buddies"
                enableVibration(true)
                enableLights(true)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }

            // Notes channel (high importance to wake screen like messages)
            val notesChannel = NotificationChannel(
                CHANNEL_ID_NOTES,
                "Whispr Notes",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for new Whispr notes"
                enableVibration(true)
                enableLights(true)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
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

    fun showMessageNotification(title: String?, message: String, buddyName: String?, buddyId: String? = null) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Prefer buddyName; fallback to provided title; fallback to generic
        val displayTitle = when {
            !buddyName.isNullOrBlank() -> buddyName
            !title.isNullOrBlank() && title != "New Message" -> title
            else -> "New Message"
        }

        val notificationBuilder = NotificationCompat.Builder(context, CHANNEL_ID_MESSAGES)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(displayTitle)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setVibrate(longArrayOf(0, 300, 100, 300))
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

        // Use buddyId (hash) as id if present so updates replace previous notifications for same buddy
        val notifyId = buddyId?.hashCode() ?: NOTIFICATION_ID_MESSAGE

        with(NotificationManagerCompat.from(context)) {
            notify(notifyId, notificationBuilder.build())
        }
    }

    // keep other functions, but ensure their channel ids match (whispr-notes / whispr-general)...
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
            .setContentTitle(title.ifBlank { "New Whispr Note" })
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setVibrate(longArrayOf(0, 300, 100, 300))
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
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
