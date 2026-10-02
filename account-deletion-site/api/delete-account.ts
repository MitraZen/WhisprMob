import { createClient } from '@supabase/supabase-js';

const allowedOrigins = new Set([
  'https://gowhispr.online',
  'https://www.gowhispr.online',
  'https://whispr-rust.vercel.app',
  'https://whisprmob-account-deletion-site.vercel.app',
]);

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: 'Origin is not allowed.' });
  }

  res.setHeader('Cache-Control', 'no-store');
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (req.body?.confirmation !== 'DELETE') return res.status(400).json({ error: 'Confirmation is required.' });

  const authorization = req.headers.authorization;
  const accessToken = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  if (!accessToken) return res.status(401).json({ error: 'Sign in again before confirming deletion.' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Account deletion endpoint is missing Supabase server environment variables.');
    return res.status(500).json({ error: 'Account deletion is temporarily unavailable.' });
  }

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: authError } = await authClient.auth.getUser(accessToken);
  const user = userData.user;
  if (authError || !user || !user.email || !user.email_confirmed_at) {
    return res.status(401).json({ error: 'Sign in with a confirmed account before confirming deletion.' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    // Audio uploads are stored under a per-user directory in this bucket.
    // Supabase Auth refuses to delete users who still own Storage objects.
    const audioBucket = admin.storage.from('whisprs');
    const audioPaths: string[] = [];
    const pageSize = 100;
    let offset = 0;
    while (true) {
      const { data: files, error: listError } = await audioBucket.list(user.id, { limit: pageSize, offset });
      if (listError) {
        console.error('Account audio cleanup listing failed:', listError.message);
        return res.status(500).json({ error: 'We could not remove account audio files. Please contact support before retrying.' });
      }

      const page = files ?? [];
      audioPaths.push(...page.filter(file => file.id !== null).map(file => `${user.id}/${file.name}`));
      if (page.length < pageSize) break;
      offset += page.length;
    }

    for (let index = 0; index < audioPaths.length; index += 100) {
      const { error: removeError } = await audioBucket.remove(audioPaths.slice(index, index + 100));
      if (removeError) {
        console.error('Account audio cleanup failed:', removeError.message);
        return res.status(500).json({ error: 'We could not remove account audio files. Please contact support before retrying.' });
      }
    }

    // Remove Whispr-owned data before deleting the Auth identity. These are the
    // core account tables used by the mobile app's existing deletion flow.
    const deletions = [
      admin.from('buddy_messages').delete().eq('sender_id', user.id),
      admin.from('buddies').delete().eq('user_id', user.id),
      admin.from('buddies').delete().eq('buddy_user_id', user.id),
      admin.from('blocked_users').delete().eq('blocker_id', user.id),
      admin.from('blocked_users').delete().eq('blocked_user_id', user.id),
      admin.from('whispr_notes').delete().eq('sender_id', user.id),
      admin.from('user_profiles').delete().eq('id', user.id),
    ];

    const results = await Promise.all(deletions);
    const failed = results.find(result => result.error);
    if (failed?.error) {
      console.error('Account data cleanup failed:', failed.error.code, failed.error.message);
      return res.status(500).json({ error: 'We could not remove all account data. Please contact support before retrying.' });
    }

    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      console.error('Auth user deletion failed:', deleteAuthError.message);
      return res.status(500).json({ error: 'We could not finish deleting the account. Please contact support.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Unexpected account deletion error:', error instanceof Error ? error.message : 'unknown error');
    return res.status(500).json({ error: 'Account deletion failed. Please contact support.' });
  }
}
