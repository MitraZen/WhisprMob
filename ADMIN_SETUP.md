# Whispr Admin Setup & Debug Tools

This document describes the admin panel and debug tools built into the Whispr mobile app, designed similar to the [Whispr website](https://www.gowhispr.site/).

## 🚀 Quick Start

### Accessing Admin Mode
1. **Tap the logo 5 times** on the Welcome screen to enable admin mode
2. Enter the admin password: `whispr_admin_2024`
3. Access all debug tools and system controls

### Debug Overlay
- **Toggle Debug Mode**: Enable/disable debug information display
- **Show Debug Info**: Toggle detailed system information overlay
- **Admin Panel Access**: Quick access to full admin controls

## 🛠️ Admin Features

### Database Management
- **Test Database Connection**: Verify Supabase connectivity
- **Refresh Statistics**: Update real-time system stats
- **Clear All Data**: Reset entire database (⚠️ DANGER)
- **Table Status**: Check accessibility of all database tables

### User Management
- **User Statistics**: View total, active, and online users
- **Reset User Data**: Clear specific user's data and activity
- **Simulate Activity**: Generate fake user activity for testing
- **User Search**: Find and manage specific users by ID

### Message System
- **Message Statistics**: View total messages, today's count, active chats
- **Send Test Messages**: Send system messages to specific users
- **Message Monitoring**: Track message flow and patterns

### System Monitoring
- **Real-time Stats**: Live database, user, and message statistics
- **Error Tracking**: Monitor and clear system errors
- **Performance Metrics**: Track app performance and connectivity

## 🔧 Debug Tools

### Debug Overlay (Top-right corner)
- **Authentication Status**: Shows login state and user info
- **Profile Completion**: Displays profile completion status
- **User Details**: Current user ID, mood, and other data
- **Quick Actions**: Fast access to admin panel

### Admin Panel Features
- **Debug Controls**: Toggle debug mode and info display
- **Database Controls**: Test connections and manage data
- **User Management**: Reset users and simulate activity
- **Message Testing**: Send test messages and monitor flow
- **System Statistics**: View comprehensive app metrics

## 🗄️ Database Operations

### Safe Operations
- Test database connections
- View statistics and metrics
- Monitor user activity
- Send test messages

### Destructive Operations (⚠️ Use with caution)
- Clear all user data
- Reset specific user data
- Delete all messages
- Clear all connections

## 🔐 Security

### Admin Authentication
- Password-protected access
- Session-based authentication
- Secure logout functionality
- Access logging (recommended for production)

### Access Control
- Hidden admin access (5-tap logo)
- Password: `whispr_admin_2024`
- Admin mode can be disabled
- Debug overlay can be toggled off

## 📊 Statistics Available

### Database Stats
- Table accessibility status
- Connection status
- Error tracking

### User Stats
- Total registered users
- Active users (last 24 hours)
- Currently online users

### Message Stats
- Total messages sent
- Messages sent today
- Active chat conversations

## 🚨 Emergency Procedures

### If Admin Panel is Unresponsive
1. Force close the app
2. Clear app data/cache
3. Restart the app
4. Re-enable admin mode

### If Database is Corrupted
1. Use "Test Database Connection"
2. Check table accessibility
3. Use "Clear All Data" if necessary
4. Restart the app

### If Users Report Issues
1. Check user statistics
2. Test message sending
3. Verify database connectivity
4. Reset specific user data if needed

## 🔄 Development Workflow

### Testing New Features
1. Enable debug mode
2. Use debug overlay for real-time monitoring
3. Send test messages to verify functionality
4. Monitor database operations

### Debugging Issues
1. Check system statistics
2. Test database connections
3. Verify user data integrity
4. Use admin tools to simulate scenarios

### Production Monitoring
1. Disable debug overlay in production
2. Keep admin access secure
3. Monitor system statistics regularly
4. Use admin tools for maintenance

## 📱 UI Design

The admin panel follows the same design principles as the main Whispr app:
- Clean, modern interface
- Consistent color scheme
- Intuitive navigation
- Responsive design
- Error handling and feedback

## 🎯 Best Practices

### Development
- Always test admin features before deployment
- Use debug overlay for development
- Monitor system performance
- Keep admin password secure

### Production
- Disable debug mode in production
- Monitor system statistics
- Regular database maintenance
- User data protection

### Security
- Change default admin password
- Implement proper access logging
- Regular security audits
- User data privacy compliance

## 🆘 Support

If you encounter issues with the admin panel:
1. Check the debug overlay for error information
2. Test database connectivity
3. Verify admin authentication
4. Review system statistics
5. Contact development team if needed

---

**Note**: This admin setup is designed for development and testing purposes. In production, ensure proper security measures are in place and consider implementing additional access controls and logging.
