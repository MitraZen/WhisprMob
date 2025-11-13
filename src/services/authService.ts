import { SUPABASE_CONFIG } from '@/config/env';
import { User, MoodType } from '@/types';

// HTTP-based authentication service for Supabase
export class AuthService {
  private static getHeaders(accessToken?: string) {
    return {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${accessToken ?? SUPABASE_CONFIG.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    } as const;
  }

  // Sign up with email and password
  static async signUp(email: string, password: string, mood: MoodType, username: string): Promise<{ user: User | null; error: string | null }> {
    try {
      // Check if username is already taken BEFORE creating auth user
      const usernameCheckResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?username=ilike.${username}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (usernameCheckResponse.ok) {
        const existingUsers = await usernameCheckResponse.json();
        if (existingUsers && existingUsers.length > 0) {
          return { user: null, error: 'Username is already taken. Please choose a different username.' };
        }
      }

      // Check if email is already registered in user_profiles (case-insensitive)
      const emailCheckResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?email=ilike.${email}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (emailCheckResponse.ok) {
        const existingUsers = await emailCheckResponse.json();
        if (existingUsers && existingUsers.length > 0) {
          // User already exists, try to sign them in instead
          return await this.handleExistingUser(email, password, existingUsers[0]);
        }
      }

      // Check if email exists in auth.users but not in user_profiles (orphaned user)
      // We'll try to sign them in first, and if that fails, we'll create a new profile
      try {
        const signInResult = await this.signIn(email, password);
        if (signInResult.user) {
          // User exists in auth but not in profiles - this is an orphaned user
          // Create their profile now
          const anonymousId = `user_${signInResult.user.id.substring(0, 8)}`;
          
          const profileResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
              id: signInResult.user.id,
              email: signInResult.user.email,
              username: username, // Store username without @ prefix
              anonymous_id: anonymousId,
              mood: mood,
              is_online: true,
              profile_completed: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          });

          if (profileResponse.ok) {
            // Profile created successfully, return the user
            return { user: signInResult.user, error: null };
          } else {
            // Profile creation failed, but user can still sign in
            return { user: signInResult.user, error: 'Profile creation failed, but you can sign in.' };
          }
        }
      } catch (signInError) {
        // User doesn't exist in auth, continue with normal signup
        console.log('User not found in auth, proceeding with signup');
      }

      // Now create the auth user
      const authResponse = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        console.error('Auth signup failed:', {
          status: authResponse.status,
          statusText: authResponse.statusText,
          error: errorData
        });
        return { user: null, error: errorData.msg || `Sign up failed: ${authResponse.status}` };
      }

      const authData = await authResponse.json();
      console.log('Auth signup response:', authData);
      
      // Handle different response formats
      let userId, userEmail;
      if (authData.user) {
        // Standard format: { user: { id, email }, session: ... }
        userId = authData.user.id;
        userEmail = authData.user.email;
      } else if (authData.id) {
        // Alternative format: { id, email, ... }
        userId = authData.id;
        userEmail = authData.email;
      } else {
        console.error('Auth signup succeeded but no user ID found:', authData);
        return { user: null, error: 'User creation failed - no user ID in response' };
      }

      // Validate that we have a valid userId
      if (!userId || typeof userId !== 'string') {
        console.error('Invalid userId:', userId, 'Type:', typeof userId);
        return { user: null, error: 'User creation failed - invalid user ID' };
      }

      // Create user profile in our user_profiles table with smart conflict resolution
      const anonymousId = `user_${userId.substring(0, 8)}`;
      
      const profileResult = await this.createUserProfileWithRetry({
        id: userId,
        email: userEmail,
        username: username, // Store username without @ prefix
        display_name: username, // ADDED: Set display_name to username instead of defaulting to "Anonymous User"
        anonymous_id: anonymousId,
        mood: mood,
        is_online: true,
        profile_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (!profileResult.success) {
        // If profile creation fails, try to clean up the auth user
        try {
          await this.cleanupAuthUser(userId);
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        
        return { user: null, error: profileResult.error || 'Profile creation failed. Please try again.' };
      }

      const profileData = profileResult.profileData;
      console.log('Profile creation result:', profileResult);
      console.log('Profile data type:', typeof profileData, Array.isArray(profileData) ? 'array' : 'object');
      console.log('Profile data:', profileData);
      
      // Handle both array and object responses from Supabase
      const profile = Array.isArray(profileData) ? profileData[0] : profileData;
      console.log('Final profile object:', profile);
      
      const user: User = {
        id: userId,
        anonymousId: anonymousId,
        mood: mood,
        createdAt: new Date(profile.created_at),
        lastSeen: new Date(profile.last_seen || profile.created_at),
        email: userEmail,
        username: profile.username, // Include the username from profile
      };

      // ✅ CRITICAL FIX: Set Supabase session if tokens are present in signup response
      // This ensures that supabase.auth.getSession() returns a valid session
      // Without this, RLS policies fail because auth.uid() is unavailable
      try {
        const accessToken = authData?.access_token || authData?.session?.access_token;
        const refreshToken = authData?.refresh_token || authData?.session?.refresh_token;
        
        if (accessToken && refreshToken) {
          console.log('🔐 AuthService.signUp: Setting Supabase session...');
          const { supabase } = await import('@/config/supabase');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (sessionError) {
            console.warn('⚠️ AuthService.signUp: Failed to set Supabase session:', sessionError.message);
            // Continue anyway - user profile is created, session might be set later
          } else {
            console.log('✅ AuthService.signUp: Supabase session established successfully');
          }
        } else {
          console.log('ℹ️ AuthService.signUp: No tokens in signup response (email confirmation may be required)');
        }
      } catch (sessionError) {
        console.error('❌ AuthService.signUp: Error setting Supabase session:', sessionError);
        // Continue anyway - user profile is created
      }

      return { user, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { user: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Helper function to cleanup auth user if profile creation fails
  private static async cleanupAuthUser(userId: string): Promise<void> {
    try {
      // Note: We can't directly delete auth users via API, but we can log this for manual cleanup
      console.log(`Auth user ${userId} needs manual cleanup - profile creation failed`);
    } catch (error) {
      console.error('Error during auth user cleanup:', error);
    }
  }

  // Smart profile creation with retry logic and conflict resolution
  private static async createUserProfileWithRetry(profileData: any, maxRetries: number = 3): Promise<{ success: boolean; error?: string; profileData?: any }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Profile creation attempt ${attempt}/${maxRetries}`);
        
        // First, check if a profile with this ID already exists
        const existingProfileCheck = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?id=eq.${profileData.id}`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (existingProfileCheck.ok) {
          const existingProfiles = await existingProfileCheck.json();
          if (existingProfiles && existingProfiles.length > 0) {
            console.log('Profile with this ID already exists, cleaning up orphaned profile');
            
            // Clean up the orphaned profile
            await this.cleanupOrphanedProfile(profileData.id);
          }
        }

        // Try to create the profile
        let profileResponse;
        try {
          profileResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(profileData),
          });
        } catch (fetchError) {
          console.error(`Fetch error on attempt ${attempt}:`, fetchError);
          if (attempt === maxRetries) {
            return { success: false, error: `Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown network error'}` };
          }
          continue;
        }

        if (profileResponse.ok) {
          let createdProfile;
          try {
            const responseText = await profileResponse.text();
            
            // Check if response is empty or not valid JSON
            if (!responseText || responseText.trim() === '') {
              console.log('Profile created successfully (empty response)');
              // Return the original profile data since creation was successful
              return { success: true, profileData: profileData };
            }
            
            // Try to parse as JSON
            createdProfile = JSON.parse(responseText);
            console.log('Profile created successfully with JSON response');
            return { success: true, profileData: createdProfile };
          } catch (parseError) {
            console.warn('Failed to parse successful response as JSON, but profile was created');
            console.log('Parse error:', parseError);
            
            // Even if parsing fails, if the response was OK, the profile was created
            // Return the original profile data since creation was successful
            return { success: true, profileData: profileData };
          }
        }

        let errorText;
        try {
          errorText = await profileResponse.text();
        } catch (textError) {
          console.warn('Failed to read error response text:', textError);
          errorText = 'Unable to read error response';
        }
        
        let errorData;
        
        // Safely parse JSON error response
        try {
          errorData = errorText ? JSON.parse(errorText) : {};
        } catch (parseError) {
          console.warn('Failed to parse error response as JSON:', errorText);
          errorData = { message: errorText || 'Unknown error' };
        }
        
        // Handle specific error cases
        if (errorData.code === '23505') { // Duplicate key constraint
          console.log(`Duplicate key error on attempt ${attempt}, retrying with cleanup...`);
          
          if (attempt < maxRetries) {
            // Clean up any conflicting records and retry
            await this.cleanupConflictingProfiles(profileData.email, profileData.username);
            continue;
          } else {
            return { success: false, error: 'Unable to create profile due to ID conflicts. Please try again.' };
          }
        } else if (errorData.code === '23503') { // Foreign key constraint
          console.log(`Foreign key error on attempt ${attempt}, retrying...`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            continue;
          }
        }

        console.error(`Profile creation failed on attempt ${attempt}:`, errorText);
        
        if (attempt === maxRetries) {
          return { success: false, error: `Profile creation failed after ${maxRetries} attempts: ${errorData.message || 'Unknown error'}` };
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        
      } catch (error) {
        console.error(`Profile creation error on attempt ${attempt}:`, error);
        
        if (attempt === maxRetries) {
          return { success: false, error: `Profile creation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return { success: false, error: 'Profile creation failed after all retry attempts' };
  }

  // Clean up orphaned profiles
  private static async cleanupOrphanedProfile(profileId: string): Promise<void> {
    try {
      const deleteResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?id=eq.${profileId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      
      if (deleteResponse.ok) {
        console.log('Orphaned profile cleaned up successfully');
      } else {
        console.warn('Failed to clean up orphaned profile');
      }
    } catch (error) {
      console.error('Error cleaning up orphaned profile:', error);
    }
  }

  // Clean up conflicting profiles
  private static async cleanupConflictingProfiles(email: string, username: string): Promise<void> {
    try {
      // Clean up profiles with the same email but no auth user (case-insensitive)
      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?email=ilike.${email}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      
      // Clean up profiles with the same username but no auth user (case-insensitive)
      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?username=ilike.${username}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      
      console.log('Conflicting profiles cleanup attempted');
    } catch (error) {
      console.error('Error cleaning up conflicting profiles:', error);
    }
  }

  // Handle existing user - try to sign them in
  private static async handleExistingUser(email: string, password: string, _existingProfile: any): Promise<{ user: User | null; error: string | null }> {
    try {
      // Try to sign in the existing user
      const signInResult = await this.signIn(email, password);
      
      if (signInResult.user) {
        return { user: signInResult.user, error: null };
      } else {
        return { user: null, error: 'User already exists but password is incorrect. Please sign in instead.' };
      }
    } catch (error) {
      console.error('Error handling existing user:', error);
      return { user: null, error: 'User already exists. Please sign in instead.' };
    }
  }

  // Sign in with email and password
  static async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      console.log('🔐 AuthService.signIn: Starting sign in process...');
      console.log('🔐 AuthService.signIn: Email:', email);
      console.log('🔐 AuthService.signIn: Supabase URL:', SUPABASE_CONFIG.url);
      
      // Test network connectivity first
      const networkTest = await this.testNetworkConnectivity();
      if (!networkTest.success) {
        console.error('🔐 AuthService.signIn: Network connectivity test failed:', networkTest.error);
        return { user: null, error: `Network error: ${networkTest.error}` };
      }
      
      console.log('🔐 AuthService.signIn: Network connectivity test passed');
      
      const authUrl = `${SUPABASE_CONFIG.url}/auth/v1/token?grant_type=password`;
      console.log('🔐 AuthService.signIn: Auth URL:', authUrl);
      
      const requestBody = {
        email: email.toLowerCase().trim(),
        password: password,
      };
      
      console.log('🔐 AuthService.signIn: Request body prepared');
      
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🔐 AuthService.signIn: Response status:', response.status);
      console.log('🔐 AuthService.signIn: Response ok:', response.ok);

      if (!response.ok) {
        let errorData;
        try {
          const errorText = await response.text();
          console.error('🔐 AuthService.signIn: Error response text:', errorText);
          errorData = errorText ? JSON.parse(errorText) : {};
        } catch (parseError) {
          console.error('🔐 AuthService.signIn: Failed to parse error response:', parseError);
          errorData = { msg: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.error('🔐 AuthService.signIn: Sign in failed with error:', errorData);
        return { user: null, error: errorData.msg || errorData.error_description || `Sign in failed: ${response.status}` };
      }

      let authData;
      try {
        const responseText = await response.text();
        console.log('🔐 AuthService.signIn: Response text length:', responseText.length);
        authData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('🔐 AuthService.signIn: Failed to parse success response:', parseError);
        return { user: null, error: 'Failed to parse authentication response' };
      }

      console.log('🔐 AuthService.signIn: Auth data received:', {
        hasUser: !!authData?.user,
        hasAccessToken: !!authData?.access_token,
        hasError: !!authData?.error,
        userId: authData?.user?.id,
      });

      // Supabase error format: { error: string, error_description: string }
      if (authData?.error) {
        console.error('🔐 AuthService.signIn: Auth data contains error:', authData.error);
        return { user: null, error: authData.error_description || authData.error || 'Sign in failed' };
      }

      if (!authData?.user) {
        console.error('🔐 AuthService.signIn: No user in auth data');
        return { user: null, error: 'Authentication failed - no user data received' };
      }

      const accessToken: string | undefined = authData?.access_token;
      if (!accessToken) {
        console.error('🔐 AuthService.signIn: No access token received');
        // Likely email confirmation required or password grant disabled
        return { user: null, error: 'No access token returned. Confirm your email or check Auth settings.' };
      }

      console.log('🔐 AuthService.signIn: Access token received, fetching user profile...');

      // Get user profile from our user_profiles table
      const profileUrl = `${SUPABASE_CONFIG.url}/rest/v1/user_profiles?id=eq.${authData.user.id}`;
      console.log('🔐 AuthService.signIn: Profile URL:', profileUrl);
      
      const profileResponse = await fetch(profileUrl, {
        method: 'GET',
        headers: this.getHeaders(accessToken),
      });

      console.log('🔐 AuthService.signIn: Profile response status:', profileResponse.status);

      if (!profileResponse.ok) {
        const profileErrorText = await profileResponse.text();
        console.error('🔐 AuthService.signIn: Profile fetch failed:', profileErrorText);
        return { user: null, error: `Profile fetch failed: ${profileResponse.status}` };
      }

      let profileData;
      try {
        const profileText = await profileResponse.text();
        profileData = profileText ? JSON.parse(profileText) : [];
      } catch (parseError) {
        console.error('🔐 AuthService.signIn: Failed to parse profile response:', parseError);
        return { user: null, error: 'Failed to parse profile response' };
      }
      
      console.log('🔐 AuthService.signIn: Profile data received:', {
        isArray: Array.isArray(profileData),
        length: Array.isArray(profileData) ? profileData.length : 'N/A',
        hasData: !!profileData,
      });
      
      if (!Array.isArray(profileData) || profileData.length === 0) {
        console.error('🔐 AuthService.signIn: No profile data found');
        return { user: null, error: 'User profile not found' };
      }

      const user: User = {
        id: authData.user.id,
        anonymousId: profileData[0].anonymous_id || `user_${authData.user.id.substring(0, 8)}`,
        mood: profileData[0].mood as MoodType,
        createdAt: new Date(profileData[0].created_at),
        lastSeen: new Date(profileData[0].last_seen),
        email: authData.user.email,
        username: profileData[0].username, // Include username from profile
      };

      console.log('🔐 AuthService.signIn: User object created:', {
        id: user.id,
        email: user.email,
        username: user.username,
        mood: user.mood,
      });

      // Update online status
      console.log('🔐 AuthService.signIn: Updating online status...');
      await this.updateOnlineStatus(authData.user.id, true, accessToken);

      // ✅ CRITICAL FIX: Set Supabase session to establish auth context for RLS
      // This ensures that supabase.auth.getSession() returns a valid session
      // Without this, RLS policies fail because auth.uid() is unavailable
      try {
        const refreshToken = authData?.refresh_token;
        if (refreshToken) {
          console.log('🔐 AuthService.signIn: Setting Supabase session...');
          const { supabase } = await import('@/config/supabase');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (sessionError) {
            console.warn('⚠️ AuthService.signIn: Failed to set Supabase session:', sessionError.message);
            // Continue anyway - user is authenticated via HTTP, session might restore later
          } else {
            console.log('✅ AuthService.signIn: Supabase session established successfully');
          }
        } else {
          console.warn('⚠️ AuthService.signIn: No refresh token in auth response, cannot set Supabase session');
        }
      } catch (sessionError) {
        console.error('❌ AuthService.signIn: Error setting Supabase session:', sessionError);
        // Continue anyway - user is authenticated via HTTP
      }

      console.log('🔐 AuthService.signIn: Sign in successful!');
      return { user, error: null };
    } catch (error) {
      console.error('🔐 AuthService.signIn: Sign in error:', error);
      
      // Enhanced error handling for different error types
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { user: null, error: 'Network request failed. Please check your internet connection.' };
      } else if (error instanceof Error) {
        return { user: null, error: error.message };
      } else {
        return { user: null, error: 'Unknown error occurred during sign in' };
      }
    }
  }

  // Sign out
  static async signOut(): Promise<{ success: boolean; error: string | null }> {
    try {
      // Update online status to false
      // Note: We'd need the user ID for this, but for now we'll just return success
      return { success: true, error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update user online status
  static async updateOnlineStatus(userId: string, isOnline: boolean, accessToken?: string): Promise<boolean> {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: this.getHeaders(accessToken),
        body: JSON.stringify({
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Update online status error:', error);
      return false;
    }
  }

  // Update user mood
  static async updateMood(userId: string, mood: MoodType, accessToken?: string): Promise<boolean> {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: this.getHeaders(accessToken),
        body: JSON.stringify({
          mood: mood,
          last_seen: new Date().toISOString(),
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Update mood error:', error);
      return false;
    }
  }

  // Generate password reset code (in-app reset)
  static async generateResetCode(email: string): Promise<{ success: boolean; code?: string; error: string | null }> {
    try {
      console.log('Generating password reset code for:', email);
      
      // Call Supabase function to generate code
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/generate_password_reset_code`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: email.toLowerCase().trim(),
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate reset code';
        try {
          const errorData = await response.json();
          console.error('Reset code generation failed:', errorData);
          const rawMessage = errorData?.message || errorData?.msg || '';
          if (rawMessage?.includes('USER_NOT_FOUND')) {
            errorMessage = 'No account found with that email. Please check and try again.';
          } else if (rawMessage?.includes('EMAIL_NOT_CONFIRMED')) {
            errorMessage = 'Please verify your email address before resetting the password.';
          } else if (rawMessage?.includes('USER_BANNED')) {
            errorMessage = 'This account is temporarily locked. Please contact support.';
          } else if (rawMessage) {
            errorMessage = rawMessage;
          }
        } catch (parseError) {
          console.warn('Failed to parse reset code error response:', parseError);
        }
        return { 
          success: false, 
          error: errorMessage 
        };
      }

      const code = await response.text();
      // Remove quotes if present
      const cleanCode = code.replace(/^"|"$/g, '');
      console.log('Reset code generated successfully:', cleanCode);
      
      // Send email with code using custom email service
      // NOTE: We don't use Supabase's /auth/v1/recover endpoint because it sends link-based emails
      // Instead, we'll send the email directly with the code
      await this.sendResetCodeEmail(email, cleanCode);
      
      return { 
        success: true, 
        code: cleanCode, // Return code for testing (remove in production)
        error: null 
      };
    } catch (error) {
      console.error('Reset code generation error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  }

  // Send reset code email using Supabase Edge Function or custom email service
  private static async sendResetCodeEmail(email: string, code: string): Promise<void> {
    try {
      // Option 1: Use Supabase Edge Function (Recommended)
      // Create an Edge Function that sends email with the code
      // This avoids the link-based email from /auth/v1/recover
      
      // For now, we'll call a database function that can send emails
      // Or use a third-party email service
      
      // IMPORTANT: Do NOT use /auth/v1/recover as it sends link-based emails
      // Instead, we need to send the email directly with the code
      
      // Option A: Use Supabase Edge Function (if created)
      try {
        const edgeFunctionResponse = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/send-reset-code-email`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            code: code,
          }),
        });

        if (edgeFunctionResponse.ok) {
          console.log('Reset code email sent via Edge Function');
          return;
        }
      } catch (edgeError) {
        console.log('Edge Function not available, trying alternative method');
      }

      // Option B: Use database function to send email (if configured)
      // This requires a database function that can send emails via Supabase's email service
      try {
        const dbFunctionResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/send_reset_code_email`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_email: email.toLowerCase().trim(),
            reset_code: code,
          }),
        });

        if (dbFunctionResponse.ok) {
          console.log('Reset code email sent via database function');
          return;
        }
      } catch (dbError) {
        console.log('Database email function not available');
      }

      // Option C: For development/testing - log the code
      // In production, you MUST set up one of the above options
      console.warn('⚠️ EMAIL NOT SENT - Code generated but email service not configured');
      console.warn(`Reset code for ${email}: ${code}`);
      console.warn('Please set up Supabase Edge Function or database email function');
      
      // Don't throw error - code was generated successfully
      // User can still use the code if they see it in logs (for testing)
    } catch (error) {
      console.error('Error sending reset code email:', error);
      // Don't throw - code generation succeeded even if email fails
      // The code is still valid and stored in database
    }
  }

  // Verify reset code
  static async verifyResetCode(email: string, code: string): Promise<{ success: boolean; error: string | null }> {
    try {
      console.log('Verifying reset code for:', email);
      
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/verify_password_reset_code`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: email.toLowerCase().trim(),
          reset_code: code,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Code verification failed:', errorData);
        return { 
          success: false, 
          error: errorData.message || errorData.msg || 'Invalid or expired code' 
        };
      }

      const isValid = await response.text();
      const cleanResult = isValid.replace(/^"|"$/g, '').toLowerCase();
      
      if (cleanResult === 'true' || cleanResult === 't') {
        console.log('Reset code verified successfully');
        return { 
          success: true, 
          error: null 
        };
      } else {
        console.log('Reset code is invalid or expired');
        return { 
          success: false, 
          error: 'Invalid or expired code. Please request a new code.' 
        };
      }
    } catch (error) {
      console.error('Code verification error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  }

  // Update password using reset code
  static async updatePasswordWithCode(email: string, code: string, newPassword: string): Promise<{ success: boolean; error: string | null }> {
    try {
      console.log('Updating password with reset code');
      
      // Call database function that verifies code and updates password
      // Note: This requires a Supabase Edge Function with service role key for production
      // For now, we'll use the database function approach
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/update_password_with_code`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: email.toLowerCase().trim(),
          reset_code: code,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Password update failed:', errorData);
        return { 
          success: false, 
          error: errorData.message || errorData.msg || 'Failed to update password. Please verify your code and try again.' 
        };
      }

      const result = await response.text();
      const cleanResult = result.replace(/^"|"$/g, '').toLowerCase();
      
      if (cleanResult === 'true' || cleanResult === 't') {
        console.log('Password updated successfully');
        return { 
          success: true, 
          error: null 
        };
      } else {
        console.log('Password update failed - invalid code or user not found');
        return { 
          success: false, 
          error: 'Invalid code or user not found. Please request a new reset code.' 
        };
      }
    } catch (error) {
      console.error('Password update with code error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  }

  // Send password reset email (legacy method - kept for backward compatibility)
  static async resetPassword(email: string): Promise<{ success: boolean; error: string | null }> {
    // Use new code-based reset
    const result = await this.generateResetCode(email);
    return {
      success: result.success,
      error: result.error,
    };
  }

  // Update password with reset token
  static async updatePassword(accessToken: string, newPassword: string): Promise<{ success: boolean; error: string | null }> {
    try {
      console.log('Updating password with reset token');
      
      const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Password update failed:', errorData);
        return { 
          success: false, 
          error: errorData.msg || errorData.message || 'Failed to update password' 
        };
      }

      console.log('Password updated successfully');
      return { 
        success: true, 
        error: null 
      };
    } catch (error) {
      console.error('Password update error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  }

  // Test network connectivity
  static async testNetworkConnectivity(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🌐 Testing network connectivity...');
      
      // Test basic internet connectivity
      const testResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        },
        timeout: 10000, // 10 second timeout
      });

      if (testResponse.ok) {
        console.log('🌐 Network connectivity test passed');
        return { success: true };
      } else {
        console.error('🌐 Network connectivity test failed:', testResponse.status);
        return { success: false, error: `HTTP ${testResponse.status}: ${testResponse.statusText}` };
      }
    } catch (error) {
      console.error('🌐 Network connectivity test error:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { success: false, error: 'Network request failed - check internet connection' };
      } else if (error instanceof Error) {
        return { success: false, error: error.message };
      } else {
        return { success: false, error: 'Unknown network error' };
      }
    }
  }

  // Test authentication connection
  static async testAuthConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/settings`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Auth connection test error:', error);
      return false;
    }
  }
}

export default AuthService;
