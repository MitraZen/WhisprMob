# Comprehensive Spam Detection System
## For Whispr Notes & Live Whisprs

---

## 📊 **Current State Analysis**

### **Whispr Notes**
- **Creation**: `BuddiesService.sendWhisprNote()`
- **Validation**: Basic content validation (not empty)
- **No Spam Protection**: ❌ No rate limiting, duplicate detection, or bot detection
- **Lifetime**: 7 days (longer exposure to spam)

### **Live Whisprs**
- **Creation**: `TextWhisperService.createTextWhispr()`
- **Validation**: Content length (0-280 chars), not empty
- **No Spam Protection**: ❌ No rate limiting, duplicate detection, or bot detection
- **Lifetime**: 10 minutes (shorter exposure, but spam can still flood feed)

### **Common Vulnerabilities**
1. ❌ No rate limiting (users can spam unlimited posts)
2. ❌ No duplicate detection (same content posted repeatedly)
3. ❌ No bot detection (automated posting patterns)
4. ❌ No content similarity checks (slight variations of spam)
5. ❌ No user reputation system (can't identify repeat offenders)

---

## 🎯 **Spam Detection Strategy**

### **Multi-Layer Defense**

```
Layer 1: Rate Limiting (Preventive)
  ↓
Layer 2: Content Analysis (Detective)
  ↓
Layer 3: Behavioral Analysis (Detective)
  ↓
Layer 4: Auto-Moderation (Reactive)
  ↓
Layer 5: User Reputation (Long-term)
```

---

## 🏗️ **Database Schema**

### **1. Spam Detection Tables**

```sql
-- User spam tracking
CREATE TABLE public.user_spam_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('whispr_note', 'live_whispr')),
  
  -- Rate limiting counters
  posts_last_hour INTEGER DEFAULT 0,
  posts_last_day INTEGER DEFAULT 0,
  posts_last_week INTEGER DEFAULT 0,
  
  -- Spam flags
  spam_score INTEGER DEFAULT 0, -- 0-100, higher = more likely spam
  is_flagged BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  suspension_until TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  last_post_at TIMESTAMP WITH TIME ZONE,
  first_post_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, content_type)
);

-- Content fingerprinting (for duplicate detection)
CREATE TABLE public.content_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('whispr_note', 'live_whispr')),
  content_hash TEXT NOT NULL, -- SHA256 hash of normalized content
  similarity_hash TEXT NOT NULL, -- Hash for fuzzy matching (handles variations)
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content_id UUID NOT NULL, -- ID of the actual note/whispr
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(content_hash, content_type),
  UNIQUE(similarity_hash, content_type)
);

-- Spam reports (user-reported spam)
CREATE TABLE public.spam_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('whispr_note', 'live_whispr')),
  content_id UUID NOT NULL,
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  reported_user_id UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT, -- 'duplicate', 'inappropriate', 'spam', 'bot'
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spam detection logs (for analysis and improvement)
CREATE TABLE public.spam_detection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('whispr_note', 'live_whispr')),
  content_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Detection results
  rate_limit_check TEXT, -- 'passed', 'failed', 'warning'
  duplicate_check TEXT, -- 'passed', 'failed', 'similar'
  bot_check TEXT, -- 'passed', 'failed', 'suspicious'
  overall_decision TEXT, -- 'allowed', 'blocked', 'flagged'
  spam_score INTEGER,
  
  -- Details
  detection_details JSONB, -- Store detailed analysis
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_spam_tracking_user_id ON user_spam_tracking(user_id);
CREATE INDEX idx_user_spam_tracking_content_type ON user_spam_tracking(content_type);
CREATE INDEX idx_content_fingerprints_hash ON content_fingerprints(content_hash);
CREATE INDEX idx_content_fingerprints_similarity ON content_fingerprints(similarity_hash);
CREATE INDEX idx_content_fingerprints_user_id ON content_fingerprints(user_id);
CREATE INDEX idx_spam_reports_content ON spam_reports(content_type, content_id);
CREATE INDEX idx_spam_reports_status ON spam_reports(status) WHERE status = 'pending';
CREATE INDEX idx_spam_detection_logs_user_id ON spam_detection_logs(user_id);
CREATE INDEX idx_spam_detection_logs_created_at ON spam_detection_logs(created_at DESC);
```

### **2. Add Spam Fields to Existing Tables**

```sql
-- Add spam-related columns to whispr_notes
ALTER TABLE whispr_notes
ADD COLUMN IF NOT EXISTS spam_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hidden_reason TEXT,
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;

-- Add spam-related columns to whisprs (Live Whisprs)
ALTER TABLE whisprs
ADD COLUMN IF NOT EXISTS spam_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hidden_reason TEXT,
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;

-- Indexes for spam filtering
CREATE INDEX IF NOT EXISTS idx_whispr_notes_spam ON whispr_notes(is_hidden, spam_score) 
WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_whisprs_spam ON whisprs(is_hidden, spam_score) 
WHERE is_hidden = false;
```

---

## 🔧 **Spam Detection Functions**

### **1. Rate Limiting Function**

```sql
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_content_type TEXT
) RETURNS JSONB AS $$
DECLARE
  v_tracking RECORD;
  v_posts_last_hour INTEGER;
  v_posts_last_day INTEGER;
  v_posts_last_week INTEGER;
  v_result JSONB;
  v_limit_hour INTEGER := 10; -- Max 10 posts per hour
  v_limit_day INTEGER := 50;  -- Max 50 posts per day
  v_limit_week INTEGER := 200; -- Max 200 posts per week
BEGIN
  -- Get or create tracking record
  SELECT * INTO v_tracking
  FROM user_spam_tracking
  WHERE user_id = p_user_id AND content_type = p_content_type;
  
  IF NOT FOUND THEN
    -- First post, create tracking
    INSERT INTO user_spam_tracking (user_id, content_type, posts_last_hour, posts_last_day, posts_last_week, last_post_at)
    VALUES (p_user_id, p_content_type, 1, 1, 1, NOW())
    RETURNING * INTO v_tracking;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'first_post',
      'posts_last_hour', 1,
      'posts_last_day', 1,
      'posts_last_week', 1
    );
  END IF;
  
  -- Reset counters if time windows have passed
  IF v_tracking.last_post_at < NOW() - INTERVAL '1 hour' THEN
    v_posts_last_hour := 0;
  ELSE
    v_posts_last_hour := v_tracking.posts_last_hour;
  END IF;
  
  IF v_tracking.last_post_at < NOW() - INTERVAL '1 day' THEN
    v_posts_last_day := 0;
  ELSE
    v_posts_last_day := v_tracking.posts_last_day;
  END IF;
  
  IF v_tracking.last_post_at < NOW() - INTERVAL '7 days' THEN
    v_posts_last_week := 0;
  ELSE
    v_posts_last_week := v_tracking.posts_last_week;
  END IF;
  
  -- Check limits
  IF v_posts_last_hour >= v_limit_hour THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_hour',
      'message', format('Too many posts. Limit: %s per hour', v_limit_hour),
      'posts_last_hour', v_posts_last_hour,
      'limit', v_limit_hour,
      'retry_after', EXTRACT(EPOCH FROM (v_tracking.last_post_at + INTERVAL '1 hour' - NOW()))::INTEGER
    );
  END IF;
  
  IF v_posts_last_day >= v_limit_day THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_day',
      'message', format('Too many posts. Limit: %s per day', v_limit_day),
      'posts_last_day', v_posts_last_day,
      'limit', v_limit_day
    );
  END IF;
  
  IF v_posts_last_week >= v_limit_week THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_week',
      'message', format('Too many posts. Limit: %s per week', v_limit_week),
      'posts_last_week', v_posts_last_week,
      'limit', v_limit_week
    );
  END IF;
  
  -- Update counters
  UPDATE user_spam_tracking
  SET 
    posts_last_hour = v_posts_last_hour + 1,
    posts_last_day = v_posts_last_day + 1,
    posts_last_week = v_posts_last_week + 1,
    last_post_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id AND content_type = p_content_type;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'within_limits',
    'posts_last_hour', v_posts_last_hour + 1,
    'posts_last_day', v_posts_last_day + 1,
    'posts_last_week', v_posts_last_week + 1
  );
END;
$$ LANGUAGE plpgsql;
```

### **2. Duplicate Detection Function**

```sql
CREATE OR REPLACE FUNCTION check_duplicate_content(
  p_user_id UUID,
  p_content TEXT,
  p_content_type TEXT
) RETURNS JSONB AS $$
DECLARE
  v_normalized_content TEXT;
  v_content_hash TEXT;
  v_similarity_hash TEXT;
  v_existing_count INTEGER;
  v_similar_count INTEGER;
  v_result JSONB;
BEGIN
  -- Normalize content (lowercase, remove extra spaces, trim)
  v_normalized_content := lower(trim(regexp_replace(p_content, '\s+', ' ', 'g')));
  
  -- Generate hashes
  v_content_hash := encode(digest(v_normalized_content, 'sha256'), 'hex');
  v_similarity_hash := encode(digest(
    -- Remove common variations for fuzzy matching
    regexp_replace(
      regexp_replace(
        regexp_replace(v_normalized_content, '[!?.,;:]', '', 'g'),
        '\s+', ' ', 'g'
      ),
      '^(the|a|an)\s+', '', 'gi'
    ),
    'sha256'
  ), 'hex');
  
  -- Check for exact duplicates
  SELECT COUNT(*) INTO v_existing_count
  FROM content_fingerprints
  WHERE content_hash = v_content_hash
    AND content_type = p_content_type
    AND user_id = p_user_id
    AND created_at > NOW() - INTERVAL '24 hours'; -- Only check last 24 hours
  
  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object(
      'is_duplicate', true,
      'reason', 'exact_duplicate',
      'message', 'You have posted this exact content recently',
      'duplicate_count', v_existing_count
    );
  END IF;
  
  -- Check for similar content (fuzzy match)
  SELECT COUNT(*) INTO v_similar_count
  FROM content_fingerprints
  WHERE similarity_hash = v_similarity_hash
    AND content_type = p_content_type
    AND user_id = p_user_id
    AND created_at > NOW() - INTERVAL '24 hours';
  
  IF v_similar_count >= 3 THEN -- Allow 2 similar posts, flag 3rd+
    RETURN jsonb_build_object(
      'is_duplicate', true,
      'reason', 'similar_content',
      'message', 'You have posted similar content multiple times recently',
      'similar_count', v_similar_count
    );
  END IF;
  
  -- Store fingerprint for future checks
  -- (Will be inserted by trigger after content is created)
  
  RETURN jsonb_build_object(
    'is_duplicate', false,
    'content_hash', v_content_hash,
    'similarity_hash', v_similarity_hash
  );
END;
$$ LANGUAGE plpgsql;
```

### **3. Bot Detection Function**

```sql
CREATE OR REPLACE FUNCTION detect_bot_behavior(
  p_user_id UUID,
  p_content_type TEXT
) RETURNS JSONB AS $$
DECLARE
  v_tracking RECORD;
  v_posts_count INTEGER;
  v_time_span INTERVAL;
  v_posts_per_minute NUMERIC;
  v_avg_time_between_posts INTERVAL;
  v_suspicious_patterns INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Get user tracking
  SELECT * INTO v_tracking
  FROM user_spam_tracking
  WHERE user_id = p_user_id AND content_type = p_content_type;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('is_bot', false, 'reason', 'insufficient_data');
  END IF;
  
  -- Calculate time span
  v_time_span := NOW() - v_tracking.first_post_at;
  
  IF v_time_span < INTERVAL '1 minute' THEN
    RETURN jsonb_build_object('is_bot', false, 'reason', 'too_recent');
  END IF;
  
  -- Get total posts
  IF p_content_type = 'whispr_note' THEN
    SELECT COUNT(*) INTO v_posts_count
    FROM whispr_notes
    WHERE sender_id = p_user_id
      AND created_at > NOW() - INTERVAL '1 hour';
  ELSE
    SELECT COUNT(*) INTO v_posts_count
    FROM whisprs
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '1 hour';
  END IF;
  
  -- Calculate posts per minute
  v_posts_per_minute := v_posts_count / GREATEST(EXTRACT(EPOCH FROM v_time_span) / 60, 1);
  
  -- Bot detection patterns
  -- Pattern 1: Very high posting rate (>5 posts/minute)
  IF v_posts_per_minute > 5 THEN
    v_suspicious_patterns := v_suspicious_patterns + 3;
  ELSIF v_posts_per_minute > 2 THEN
    v_suspicious_patterns := v_suspicious_patterns + 1;
  END IF;
  
  -- Pattern 2: Consistent timing (posts at exact intervals)
  -- (Would need more complex analysis, simplified here)
  
  -- Pattern 3: Very short content (bot-like messages)
  -- (Checked in content analysis)
  
  -- Pattern 4: No engagement (all posts ignored)
  -- (Would need engagement tracking)
  
  -- Determine if bot
  IF v_suspicious_patterns >= 3 THEN
    RETURN jsonb_build_object(
      'is_bot', true,
      'reason', 'high_posting_rate',
      'posts_per_minute', v_posts_per_minute,
      'suspicious_patterns', v_suspicious_patterns
    );
  ELSIF v_suspicious_patterns >= 1 THEN
    RETURN jsonb_build_object(
      'is_bot', false,
      'is_suspicious', true,
      'reason', 'moderate_posting_rate',
      'posts_per_minute', v_posts_per_minute,
      'suspicious_patterns', v_suspicious_patterns
    );
  END IF;
  
  RETURN jsonb_build_object(
    'is_bot', false,
    'is_suspicious', false,
    'posts_per_minute', v_posts_per_minute
  );
END;
$$ LANGUAGE plpgsql;
```

### **4. Comprehensive Spam Check Function**

```sql
CREATE OR REPLACE FUNCTION check_spam_before_create(
  p_user_id UUID,
  p_content TEXT,
  p_content_type TEXT
) RETURNS JSONB AS $$
DECLARE
  v_rate_limit_result JSONB;
  v_duplicate_result JSONB;
  v_bot_result JSONB;
  v_spam_score INTEGER := 0;
  v_allowed BOOLEAN := true;
  v_reason TEXT;
  v_message TEXT;
  v_details JSONB := '{}'::JSONB;
BEGIN
  -- Check 1: Rate limiting
  v_rate_limit_result := check_rate_limit(p_user_id, p_content_type);
  
  IF NOT (v_rate_limit_result->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked_by', 'rate_limit',
      'reason', v_rate_limit_result->>'reason',
      'message', v_rate_limit_result->>'message',
      'spam_score', 100,
      'details', v_rate_limit_result
    );
  END IF;
  
  -- Check 2: Duplicate detection
  v_duplicate_result := check_duplicate_content(p_user_id, p_content, p_content_type);
  
  IF (v_duplicate_result->>'is_duplicate')::BOOLEAN THEN
    v_spam_score := v_spam_score + 50;
    v_details := v_details || jsonb_build_object('duplicate', v_duplicate_result);
    
    -- Block if too many duplicates
    IF (v_duplicate_result->>'duplicate_count')::INTEGER > 2 THEN
      v_allowed := false;
      v_reason := 'excessive_duplicates';
      v_message := 'You have posted this content too many times';
    END IF;
  END IF;
  
  -- Check 3: Bot detection
  v_bot_result := detect_bot_behavior(p_user_id, p_content_type);
  
  IF (v_bot_result->>'is_bot')::BOOLEAN THEN
    v_spam_score := v_spam_score + 80;
    v_allowed := false;
    v_reason := 'bot_behavior';
    v_message := 'Automated posting detected';
    v_details := v_details || jsonb_build_object('bot', v_bot_result);
  ELSIF (v_bot_result->>'is_suspicious')::BOOLEAN THEN
    v_spam_score := v_spam_score + 20;
    v_details := v_details || jsonb_build_object('bot', v_bot_result);
  END IF;
  
  -- Check 4: Content analysis (simple heuristics)
  -- Very short content (< 10 chars) = suspicious
  IF length(trim(p_content)) < 10 THEN
    v_spam_score := v_spam_score + 10;
    v_details := v_details || jsonb_build_object('content_analysis', jsonb_build_object(
      'too_short', true,
      'length', length(trim(p_content))
    ));
  END IF;
  
  -- All caps = suspicious
  IF p_content = upper(p_content) AND length(p_content) > 20 THEN
    v_spam_score := v_spam_score + 15;
    v_details := v_details || jsonb_build_object('content_analysis', jsonb_build_object(
      'all_caps', true
    ));
  END IF;
  
  -- Excessive special characters = suspicious
  IF (length(p_content) - length(regexp_replace(p_content, '[!@#$%^&*()_+=\[\]{}|;:,.<>?]', '', 'g')))::FLOAT / length(p_content) > 0.3 THEN
    v_spam_score := v_spam_score + 20;
    v_details := v_details || jsonb_build_object('content_analysis', jsonb_build_object(
      'excessive_special_chars', true
    ));
  END IF;
  
  -- Final decision
  IF v_spam_score >= 100 THEN
    v_allowed := false;
    IF v_reason IS NULL THEN
      v_reason := 'high_spam_score';
      v_message := 'Content flagged as spam';
    END IF;
  ELSIF v_spam_score >= 50 THEN
    -- Flag but allow (for review)
    v_details := v_details || jsonb_build_object('flagged', true);
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'spam_score', v_spam_score,
    'reason', COALESCE(v_reason, 'passed'),
    'message', COALESCE(v_message, 'Content approved'),
    'details', v_details,
    'rate_limit', v_rate_limit_result,
    'duplicate', v_duplicate_result,
    'bot', v_bot_result
  );
END;
$$ LANGUAGE plpgsql;
```

### **5. Trigger to Store Content Fingerprints**

```sql
-- Trigger function to store fingerprints after insert
CREATE OR REPLACE FUNCTION store_content_fingerprint()
RETURNS TRIGGER AS $$
DECLARE
  v_content_hash TEXT;
  v_similarity_hash TEXT;
  v_normalized_content TEXT;
  v_content_type TEXT;
BEGIN
  -- Determine content type
  IF TG_TABLE_NAME = 'whispr_notes' THEN
    v_content_type := 'whispr_note';
    v_normalized_content := lower(trim(regexp_replace(NEW.content, '\s+', ' ', 'g')));
  ELSIF TG_TABLE_NAME = 'whisprs' THEN
    v_content_type := 'live_whispr';
    v_normalized_content := lower(trim(regexp_replace(NEW.content, '\s+', ' ', 'g')));
  ELSE
    RETURN NEW;
  END IF;
  
  -- Generate hashes
  v_content_hash := encode(digest(v_normalized_content, 'sha256'), 'hex');
  v_similarity_hash := encode(digest(
    regexp_replace(
      regexp_replace(
        regexp_replace(v_normalized_content, '[!?.,;:]', '', 'g'),
        '\s+', ' ', 'g'
      ),
      '^(the|a|an)\s+', '', 'gi'
    ),
    'sha256'
  ), 'hex');
  
  -- Store fingerprint
  INSERT INTO content_fingerprints (
    content_type,
    content_hash,
    similarity_hash,
    user_id,
    content_id
  ) VALUES (
    v_content_type,
    v_content_hash,
    v_similarity_hash,
    COALESCE(NEW.sender_id, NEW.user_id),
    NEW.id
  )
  ON CONFLICT (content_hash, content_type) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER store_whispr_note_fingerprint
AFTER INSERT ON whispr_notes
FOR EACH ROW
EXECUTE FUNCTION store_content_fingerprint();

CREATE TRIGGER store_whispr_fingerprint
AFTER INSERT ON whisprs
FOR EACH ROW
EXECUTE FUNCTION store_content_fingerprint();
```

---

## 💻 **Service Implementation**

### **SpamDetectionService.ts**

```typescript
import { supabase } from '@/config/supabase';

export interface SpamCheckResult {
  allowed: boolean;
  spam_score: number;
  reason: string;
  message: string;
  details: {
    rate_limit?: any;
    duplicate?: any;
    bot?: any;
    content_analysis?: any;
    flagged?: boolean;
  };
  retry_after?: number; // Seconds until retry allowed
}

export interface SpamReportData {
  content_type: 'whispr_note' | 'live_whispr';
  content_id: string;
  reason: 'duplicate' | 'inappropriate' | 'spam' | 'bot';
}

class SpamDetectionService {
  private static instance: SpamDetectionService;

  static getInstance(): SpamDetectionService {
    if (!SpamDetectionService.instance) {
      SpamDetectionService.instance = new SpamDetectionService();
    }
    return SpamDetectionService.instance;
  }

  /**
   * Check if content is spam before creating
   */
  async checkSpamBeforeCreate(
    userId: string,
    content: string,
    contentType: 'whispr_note' | 'live_whispr'
  ): Promise<SpamCheckResult> {
    try {
      const { data, error } = await supabase.rpc('check_spam_before_create', {
        p_user_id: userId,
        p_content: content,
        p_content_type: contentType
      });

      if (error) {
        console.error('Spam check error:', error);
        // Fail open (allow content) if spam check fails
        return {
          allowed: true,
          spam_score: 0,
          reason: 'check_failed',
          message: 'Spam check unavailable',
          details: {}
        };
      }

      return data as SpamCheckResult;
    } catch (error) {
      console.error('Error checking spam:', error);
      // Fail open
      return {
        allowed: true,
        spam_score: 0,
        reason: 'check_failed',
        message: 'Spam check unavailable',
        details: {}
      };
    }
  }

  /**
   * Report spam content
   */
  async reportSpam(data: SpamReportData): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get reported user ID
      let reportedUserId: string;
      
      if (data.content_type === 'whispr_note') {
        const { data: note } = await supabase
          .from('whispr_notes')
          .select('sender_id')
          .eq('id', data.content_id)
          .single();
        
        if (!note) throw new Error('Content not found');
        reportedUserId = note.sender_id;
      } else {
        const { data: whispr } = await supabase
          .from('whisprs')
          .select('user_id')
          .eq('id', data.content_id)
          .single();
        
        if (!whispr) throw new Error('Content not found');
        reportedUserId = whispr.user_id;
      }

      // Create report
      const { error } = await supabase
        .from('spam_reports')
        .insert({
          content_type: data.content_type,
          content_id: data.content_id,
          reporter_id: user.id,
          reported_user_id: reportedUserId,
          reason: data.reason
        });

      if (error) throw error;

      // Auto-hide if multiple reports (3+)
      const { data: reportCount } = await supabase
        .from('spam_reports')
        .select('id', { count: 'exact', head: true })
        .eq('content_type', data.content_type)
        .eq('content_id', data.content_id)
        .eq('status', 'pending');

      if (reportCount && reportCount >= 3) {
        await this.autoHideContent(data.content_type, data.content_id, 'multiple_reports');
      }

      return true;
    } catch (error) {
      console.error('Error reporting spam:', error);
      return false;
    }
  }

  /**
   * Auto-hide content
   */
  async autoHideContent(
    contentType: 'whispr_note' | 'live_whispr',
    contentId: string,
    reason: string
  ): Promise<void> {
    try {
      const table = contentType === 'whispr_note' ? 'whispr_notes' : 'whisprs';
      
      await supabase
        .from(table)
        .update({
          is_hidden: true,
          hidden_reason: reason,
          hidden_at: new Date().toISOString()
        })
        .eq('id', contentId);
    } catch (error) {
      console.error('Error auto-hiding content:', error);
    }
  }

  /**
   * Get user's spam status
   */
  async getUserSpamStatus(
    userId: string,
    contentType: 'whispr_note' | 'live_whispr'
  ): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_spam_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('content_type', contentType)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

      return data || null;
    } catch (error) {
      console.error('Error getting spam status:', error);
      return null;
    }
  }
}

export default SpamDetectionService.getInstance();
```

---

## 🔄 **Integration with Existing Services**

### **Update TextWhisperService (Live Whisprs)**

```typescript
// In textWhisperServiceClean.ts

import SpamDetectionService from './spamDetectionService';

async createTextWhispr(data: {
  content: string;
  mood: string;
  is_anonymous?: boolean;
  radius_meters?: number;
  userId?: string;
}): Promise<TextWhispr> {
  try {
    console.log('📝 Creating text whispr:', data);

    // Get current user
    let userId = data.userId;
    if (!userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      userId = user.id;
    }

    // ✅ SPAM CHECK: Check for spam before creating
    const spamCheck = await SpamDetectionService.checkSpamBeforeCreate(
      userId,
      data.content,
      'live_whispr'
    );

    if (!spamCheck.allowed) {
      throw new Error(spamCheck.message || 'Content blocked by spam detection');
    }

    // Log spam check result
    if (spamCheck.spam_score > 0) {
      console.warn(`⚠️ Spam score: ${spamCheck.spam_score}`, spamCheck.details);
    }

    // Validate content
    if (!data.content || data.content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    if (data.content.length > 280) {
      throw new Error('Content cannot exceed 280 characters');
    }

    const trimmedContent = data.content.trim();

    // Create whispr
    const { data: whisprData, error } = await supabase.rpc('create_text_whispr_simplified', {
      p_content: trimmedContent,
      p_mood: data.mood,
      p_user_id: userId,
      p_is_anonymous: data.is_anonymous || false,
      p_radius_meters: data.radius_meters || 1000
    });

    if (error) {
      console.log('⚠️ Could not create whispr:', error);
      throw new Error(`Failed to create whispr: ${error.message}`);
    }

    // Update spam score if flagged
    if (spamCheck.spam_score >= 50) {
      await supabase
        .from('whisprs')
        .update({ spam_score: spamCheck.spam_score, is_flagged: true })
        .eq('id', whisprData.id);
    }

    console.log('✅ Text whispr created successfully');
    return whisprData;
  } catch (error) {
    console.error('❌ Error in createTextWhispr:', error);
    throw error;
  }
}
```

### **Update BuddiesService (Whispr Notes)**

```typescript
// In buddiesService.ts

import SpamDetectionService from './spamDetectionService';

static async sendWhisprNote(
  userId: string,
  content: string,
  mood: MoodType
): Promise<string> {
  try {
    // ✅ SPAM CHECK: Check for spam before creating
    const spamCheck = await SpamDetectionService.checkSpamBeforeCreate(
      userId,
      content,
      'whispr_note'
    );

    if (!spamCheck.allowed) {
      throw new Error(spamCheck.message || 'Content blocked by spam detection');
    }

    // Log spam check result
    if (spamCheck.spam_score > 0) {
      console.warn(`⚠️ Spam score: ${spamCheck.spam_score}`, spamCheck.details);
    }

    // Handle retry_after if rate limited
    if (spamCheck.details.rate_limit?.retry_after) {
      const retryAfter = spamCheck.details.rate_limit.retry_after;
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(retryAfter / 60)} minutes before posting again.`
      );
    }

    // ... existing creation logic ...
    
    // Update spam score if flagged
    if (spamCheck.spam_score >= 50 && noteId) {
      await supabase
        .from('whispr_notes')
        .update({ spam_score: spamCheck.spam_score, is_flagged: true })
        .eq('id', noteId);
    }

    return noteId;
  } catch (error) {
    console.error('Error sending whispr note:', error);
    throw error;
  }
}
```

---

## 🎨 **UI/UX Implementation**

### **1. Spam Check Before Posting**

```typescript
// In RecordTextWhisper.tsx and WhisprComposeScreen.tsx

const handleCreateWhisper = async () => {
  // ... existing validation ...
  
  setIsCreating(true);

  try {
    // ✅ SPAM CHECK
    const spamCheck = await SpamDetectionService.checkSpamBeforeCreate(
      user.id,
      content.trim(),
      'live_whispr' // or 'whispr_note'
    );

    if (!spamCheck.allowed) {
      Alert.alert(
        'Content Blocked',
        spamCheck.message || 'Your content was blocked by spam detection.',
        [
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
      
      // Show retry timer if rate limited
      if (spamCheck.retry_after) {
        const minutes = Math.ceil(spamCheck.retry_after / 60);
        Alert.alert(
          'Rate Limit',
          `Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before posting again.`,
          [{ text: 'OK' }]
        );
      }
      
      return;
    }

    // Show warning if flagged but allowed
    if (spamCheck.spam_score >= 50 && spamCheck.spam_score < 100) {
      Alert.alert(
        'Content Flagged',
        'Your content has been flagged for review. It may be hidden if reported.',
        [{ text: 'Continue', onPress: () => createWhispr() }]
      );
      return;
    }

    // Proceed with creation
    await createWhispr();
  } catch (error) {
    // ... error handling ...
  } finally {
    setIsCreating(false);
  }
};
```

### **2. Report Spam Button**

```typescript
// In WhisperFeed.tsx and WhisprNotesScreen.tsx

const handleReportSpam = async (contentId: string, contentType: 'whispr_note' | 'live_whispr') => {
  Alert.alert(
    'Report Spam',
    'Why are you reporting this?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Duplicate Content',
        onPress: () => reportSpam(contentId, contentType, 'duplicate')
      },
      {
        text: 'Spam',
        onPress: () => reportSpam(contentId, contentType, 'spam')
      },
      {
        text: 'Inappropriate',
        onPress: () => reportSpam(contentId, contentType, 'inappropriate')
      },
      {
        text: 'Bot/Automated',
        onPress: () => reportSpam(contentId, contentType, 'bot')
      }
    ]
  );
};

const reportSpam = async (
  contentId: string,
  contentType: 'whispr_note' | 'live_whispr',
  reason: 'duplicate' | 'inappropriate' | 'spam' | 'bot'
) => {
  const success = await SpamDetectionService.reportSpam({
    content_type: contentType,
    content_id: contentId,
    reason
  });

  if (success) {
    Alert.alert('Reported', 'Thank you for reporting. We will review this content.');
  } else {
    Alert.alert('Error', 'Failed to report. Please try again.');
  }
};
```

### **3. Hide Spam Content in Feed**

```typescript
// In WhisperFeed.tsx

// Filter out hidden content
const visibleWhisprs = whisprs.filter(w => !w.is_hidden);

// In WhisprNotesScreen.tsx

// Filter out hidden notes
const visibleNotes = notes.filter(n => !n.is_hidden);
```

---

## 📊 **Configuration & Limits**

### **Rate Limits (Configurable)**

```typescript
// spamDetectionConfig.ts

export const SPAM_DETECTION_CONFIG = {
  // Rate limits
  RATE_LIMITS: {
    WHISPR_NOTE: {
      PER_HOUR: 10,
      PER_DAY: 50,
      PER_WEEK: 200
    },
    LIVE_WHISPR: {
      PER_HOUR: 20, // More lenient for ephemeral content
      PER_DAY: 100,
      PER_WEEK: 500
    }
  },
  
  // Spam score thresholds
  SPAM_SCORE_THRESHOLDS: {
    FLAG: 50,    // Flag for review
    BLOCK: 100   // Block completely
  },
  
  // Duplicate detection
  DUPLICATE_DETECTION: {
    EXACT_DUPLICATE_WINDOW_HOURS: 24,
    SIMILAR_CONTENT_THRESHOLD: 3, // Flag after 3 similar posts
    SIMILAR_CONTENT_WINDOW_HOURS: 24
  },
  
  // Bot detection
  BOT_DETECTION: {
    POSTS_PER_MINUTE_THRESHOLD: 5,
    SUSPICIOUS_POSTS_PER_MINUTE: 2
  },
  
  // Auto-hide thresholds
  AUTO_HIDE: {
    REPORT_COUNT_THRESHOLD: 3, // Auto-hide after 3 reports
    SPAM_SCORE_THRESHOLD: 100
  }
};
```

---

## 🚀 **Implementation Phases**

### **Phase 1: Database & Core Functions** (Week 1)
- [ ] Create database tables
- [ ] Implement rate limiting function
- [ ] Implement duplicate detection function
- [ ] Implement bot detection function
- [ ] Implement comprehensive spam check function
- [ ] Create triggers for fingerprint storage

### **Phase 2: Service Integration** (Week 2)
- [ ] Create SpamDetectionService
- [ ] Integrate with TextWhisperService
- [ ] Integrate with BuddiesService
- [ ] Add spam check before creation
- [ ] Add spam score updates

### **Phase 3: UI/UX** (Week 3)
- [ ] Add spam check feedback in UI
- [ ] Add report spam button
- [ ] Add rate limit error messages
- [ ] Hide spam content in feeds
- [ ] Add admin moderation UI (optional)

### **Phase 4: Testing & Tuning** (Week 4)
- [ ] Test rate limiting
- [ ] Test duplicate detection
- [ ] Test bot detection
- [ ] Tune thresholds
- [ ] Monitor false positives
- [ ] Performance optimization

---

## ✅ **Summary**

This comprehensive spam detection system provides:

✅ **Rate Limiting**: Prevents spam flooding  
✅ **Duplicate Detection**: Catches repeated content  
✅ **Bot Detection**: Identifies automated behavior  
✅ **Content Analysis**: Flags suspicious patterns  
✅ **Auto-Moderation**: Hides content automatically  
✅ **User Reporting**: Community-driven moderation  
✅ **Configurable**: Easy to adjust thresholds  

**Works for both**:
- ✅ Whispr Notes (7-day lifetime)
- ✅ Live Whisprs (10-minute lifetime)

The system is **fail-open** (allows content if check fails) to prevent blocking legitimate users, but logs everything for analysis and improvement.



