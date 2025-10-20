import React from 'react';
import { ChatScreen } from '@/screens/ChatScreen';
import { TelegramStyleChatScreen } from '@/screens/TelegramStyleChatScreen';
import { USE_TELEGRAM_STYLE_CHAT, MIGRATION_STATUS } from '@/config/migrationConfig';

interface UnifiedChatScreenProps {
  onNavigate: (screen: string) => void;
  buddy: any;
  user: any;
  onBack?: () => void;
  onMessagesRead?: (buddyId: string) => void;
}

export const UnifiedChatScreen: React.FC<UnifiedChatScreenProps> = (props) => {
  // Use Telegram-style chat if enabled and ready
  if (USE_TELEGRAM_STYLE_CHAT && MIGRATION_STATUS.CHAT_SCREEN) {
    console.log('🚀 Using Telegram-style chat system');
    return <TelegramStyleChatScreen {...props} />;
  }
  
  // Fall back to legacy system
  console.log('📱 Using legacy chat system');
  return <ChatScreen {...props} />;
};
