declare module 'react-native-push-notification' {
  interface PushNotificationPermissions {
    alert: boolean;
    badge: boolean;
    sound: boolean;
  }

  interface PushNotification {
    configure(options: any): void;
    requestPermissions(): Promise<PushNotificationPermissions>;
    localNotification(details: any): void;
    cancelAllLocalNotifications(): void;
    cancelLocalNotifications(details: any): void;
    getDeliveredNotifications(callback: (notifications: any[]) => void): void;
    removeAllDeliveredNotifications(): void;
    getApplicationIconBadgeNumber(callback: (badgeCount: number) => void): void;
    setApplicationIconBadgeNumber(badgeCount: number): void;
    createChannel(channel: any, callback?: (created: boolean) => void): void;
    onRegister(token: any): void;
    onNotification(notification: any): void;
  }

  const PushNotification: PushNotification;
  export default PushNotification;
}
