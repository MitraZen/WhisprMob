// Feature flag for Telegram-style chat migration
export const USE_TELEGRAM_STYLE_CHAT = true; // Set to false to use old system

// Migration status
export const MIGRATION_STATUS = {
  DATABASE_SCHEMA: true,
  CHAT_SCREEN: true, // ✅ Ready for migration
  BUDDIES_SCREEN: true, // ✅ Ready for migration
  REAL_TIME: false,
  CACHING: false,
  CLEANUP: false,
} as const;

// Helper function to check if migration is ready
export const isMigrationReady = (component: keyof typeof MIGRATION_STATUS): boolean => {
  return MIGRATION_STATUS[component];
};

// Helper function to get the appropriate chat service
export const getChatService = () => {
  if (USE_TELEGRAM_STYLE_CHAT && MIGRATION_STATUS.CHAT_SCREEN) {
    return 'telegram-style';
  }
  return 'legacy';
};
