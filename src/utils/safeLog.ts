// Safe logging utilities to prevent "TOO BIG" errors in React Native
// Use these instead of console.log for large objects

export const safeLog = {
  // Log object count instead of full object
  array: (label: string, array: any[]) => {
    console.log(`${label}: ${array.length} items`);
  },

  // Log object keys instead of full object
  object: (label: string, obj: any) => {
    if (obj && typeof obj === 'object') {
      const keys = Object.keys(obj);
      console.log(`${label}: {${keys.join(', ')}}`);
    } else {
      console.log(`${label}:`, obj);
    }
  },

  // Log success/failure instead of full result
  result: (label: string, result: any) => {
    console.log(`${label}:`, result ? 'Success' : 'Failed');
  },

  // Log ID instead of full user object
  user: (label: string, user: any) => {
    console.log(`${label}:`, user?.id ? `User ID: ${user.id}` : 'No user');
  },

  // Log basic info instead of full error
  error: (label: string, error: any) => {
    console.error(`${label}:`, error instanceof Error ? error.message : 'Unknown error');
  }
};

export default safeLog;



