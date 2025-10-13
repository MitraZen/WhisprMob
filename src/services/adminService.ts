import { supabase } from '@/config/supabase';

export class AdminService {
  /**
   * Check if the current user is an admin
   * @param userId - The user ID to check
   * @returns Promise<boolean> - True if user is admin, false otherwise
   */
  static async isUserAdmin(userId: string): Promise<boolean> {
    try {
      if (!userId) {
        console.warn('AdminService: No user ID provided');
        return false;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('AdminService: Error checking admin status:', error);
        return false;
      }

      const isAdmin = data?.is_admin === true;
      console.log(`AdminService: User ${userId} admin status:`, isAdmin);
      return isAdmin;
    } catch (error) {
      console.error('AdminService: Exception checking admin status:', error);
      return false;
    }
  }

  /**
   * Get user profile with admin status
   * @param userId - The user ID to check
   * @returns Promise<{isAdmin: boolean, profile: any}> - Admin status and profile data
   */
  static async getUserWithAdminStatus(userId: string): Promise<{isAdmin: boolean, profile: any}> {
    try {
      if (!userId) {
        console.warn('AdminService: No user ID provided');
        return { isAdmin: false, profile: null };
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('AdminService: Error fetching user profile:', error);
        return { isAdmin: false, profile: null };
      }

      const isAdmin = data?.is_admin === true;
      console.log(`AdminService: User ${userId} profile loaded, admin status:`, isAdmin);
      return { isAdmin, profile: data };
    } catch (error) {
      console.error('AdminService: Exception fetching user profile:', error);
      return { isAdmin: false, profile: null };
    }
  }
}
