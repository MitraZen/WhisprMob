export const formatLastSeen = (lastMessageTime?: Date): string => {
  if (!lastMessageTime) return 'No messages';
  
  const now = new Date();
  const diff = now.getTime() - lastMessageTime.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return lastMessageTime.toLocaleDateString();
};

export const formatTimestamp = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return timestamp.toLocaleDateString();
};
