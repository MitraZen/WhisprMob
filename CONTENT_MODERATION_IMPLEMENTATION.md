# Content Moderation Rule Engine Implementation

## 📋 Overview

A comprehensive client-side content moderation system has been implemented to detect and handle inappropriate content in both chat messages and notes. The system provides real-time feedback to users, blocking severe violations while warning about mild offenses.

## 🎯 Features

### Rule Types Detected

1. **Profanity / Offensive Words** (SOFT WARN)
   - Single words and family-sensitive terms
   - Configurable word list

2. **Hate Speech** (HARD BLOCK)
   - Content targeting protected classes
   - Escalated for human review

3. **Sexual Content** (SOFT WARN)
   - Explicit sexualization
   - Allows editing before sending

4. **Harassment / Threats** (HARD BLOCK)
   - Targeted abuse
   - Threats of violence
   - Escalated for human review

5. **Self-Harm / Suicide** (HARD BLOCK)
   - References to self-harm or suicide
   - Includes crisis messaging
   - Escalated for human review

6. **Personal Info / Doxxing** (HARD BLOCK)
   - Phone numbers
   - Email addresses
   - Social Security Numbers
   - Credit card numbers
   - IP addresses
   - Physical addresses

7. **Spam / Links** (SOFT WARN)
   - URLs and links
   - Allows editing before sending

8. **Policy Bypass Attempts** (SOFT WARN)
   - Leet speak (f*ck, sh!t, etc.)
   - Spaced out words (f u c k)
   - Character substitutions

## 🏗️ Architecture

### Core Components

1. **`contentModerationService.ts`**
   - Main moderation engine
   - Rule evaluation
   - Text normalization
   - Pattern matching
   - Violation detection

2. **`contentModeration.config.ts`**
   - Word lists for different rule types
   - Regex patterns for PII detection
   - Leet speak patterns
   - Link patterns

3. **`useContentModeration.ts`** (Hook)
   - React hook for real-time moderation
   - Debounced content checking
   - State management

4. **`ModerationWarning.tsx`** (Component)
   - UI component for displaying warnings
   - Different styles for soft/hard violations
   - Edit button for blocked content

### Integration Points

1. **Chat Screens**
   - `TelegramStyleChatScreen.tsx`
   - Real-time checking as user types
   - Block send button for hard violations
   - Show warning for soft violations

2. **Notes Screens**
   - `WhisprComposeScreen.tsx`
   - `SendNoteScreen.tsx`
   - Real-time checking as user types
   - Block send button for hard violations
   - Show warning for soft violations

## 🔧 How It Works

### Text Normalization

1. **Lowercase conversion**
2. **Diacritic removal** (é → e, ñ → n)
3. **Repeated character collapse** (helllllo → hello)
4. **Space/punctuation removal** (for bypass detection)

### Detection Flow

1. **Personal Information** (PII) - Checked first (HARD BLOCK)
2. **Self-Harm / Suicide** - Checked second (HARD BLOCK)
3. **Threats** - Checked third (HARD BLOCK)
4. **Harassment** - Checked fourth (HARD BLOCK)
5. **Hate Speech** - Checked fifth (HARD BLOCK)
6. **Policy Bypass** - Checked sixth (SOFT WARN)
7. **Other Violations** - Profanity, sexual content, links (SOFT WARN)

### Severity Levels

- **SOFT**: Show warning, allow editing, can still send
- **HARD**: Block send, show escalation UI, require editing

### Actions

- **WARN**: Show inline warning, allow user to edit
- **BLOCK**: Block send button, show escalation message
- **FLAG**: Flag for human review (future implementation)

## 📱 User Experience

### Soft Violations (Warnings)

- ⚠️ Yellow warning banner appears above input
- Message: "Your message contains [violation type]. Please review before sending."
- Send button remains enabled
- User can dismiss warning or edit message

### Hard Violations (Blocks)

- 🚨 Red error banner appears above input
- Message varies by violation type:
  - Self-harm: "This message contains self-harm references. If you're in crisis, please reach out for help. Your message cannot be sent."
  - Threats: "This message contains threats of violence and cannot be sent."
  - Personal Info: "This message contains personal information and cannot be sent for your safety."
  - Harassment: "This message contains harassment and cannot be sent."
  - Hate Speech: "This message contains hate speech and cannot be sent."
- Send button is disabled
- "Edit Message" button appears
- User must edit content to send

## 🔒 Security Considerations

1. **Client-Side Only**: This is a client-side implementation for instant feedback
2. **Server-Side Validation**: Server-side validation should still be implemented
3. **Word Lists**: Word lists are configurable and can be updated
4. **False Positives**: System is designed to minimize false positives
5. **Bypass Detection**: Includes detection for common bypass attempts

## 📝 Configuration

### Word Lists

Word lists are defined in `src/config/contentModeration.config.ts`:

- `PROFANITY_WORDS`: Common offensive words
- `HATE_SPEECH_WORDS`: Hate speech keywords
- `SEXUAL_CONTENT_WORDS`: Sexual content keywords
- `HARASSMENT_WORDS`: Harassment keywords
- `THREAT_WORDS`: Threat keywords
- `SELF_HARM_WORDS`: Self-harm/suicide keywords

### Patterns

- `PII_PATTERNS`: Regex patterns for personal information
- `LINK_PATTERNS`: Regex patterns for URLs/links
- `LEET_SPEAK_PATTERNS`: Patterns for bypass attempts

## 🚀 Future Enhancements

1. **Server-Side Validation**: Implement server-side moderation API
2. **Machine Learning**: Integrate ML models for better accuracy
3. **Human Review Queue**: Build admin interface for reviewing flagged content
4. **User Reporting**: Allow users to report violations
5. **Custom Rules**: Allow admins to configure custom rules
6. **Analytics**: Track violation types and patterns
7. **A/B Testing**: Test different moderation strategies

## 📊 Testing

### Test Cases

1. **Profanity**: Test with common profanity words
2. **Self-Harm**: Test with suicide references
3. **Threats**: Test with threat keywords
4. **PII**: Test with phone numbers, emails, etc.
5. **Bypass**: Test with leet speak and spaced words
6. **Links**: Test with URLs
7. **False Positives**: Test with legitimate content

### Example Test Messages

- ✅ "Hello, how are you?" (Should pass)
- ⚠️ "This is damn good" (Should warn for profanity)
- 🚨 "I want to kill myself" (Should block for self-harm)
- 🚨 "I will kill you" (Should block for threats)
- 🚨 "My email is test@example.com" (Should block for PII)
- ⚠️ "Check out https://example.com" (Should warn for links)
- ⚠️ "f*ck this" (Should warn for bypass attempt)

## 📚 Files Created/Modified

### New Files

1. `src/services/contentModerationService.ts`
2. `src/config/contentModeration.config.ts`
3. `src/hooks/useContentModeration.ts`
4. `src/components/ContentModeration/ModerationWarning.tsx`

### Modified Files

1. `src/screens/TelegramStyleChatScreen.tsx`
2. `src/screens/WhisprComposeScreen.tsx`
3. `src/screens/SendNoteScreen.tsx`

## 🎨 UI Components

### ModerationWarning Component

- Displays warnings/errors above input
- Different styles for soft/hard violations
- Dismiss button for warnings
- Edit button for blocked content
- Responsive and theme-aware

## ⚙️ Configuration Options

The `useContentModeration` hook accepts options:

```typescript
{
  debounceMs?: number; // Default: 500ms
  onViolation?: (result: ModerationResult) => void; // Callback
}
```

## 🔍 Debugging

Enable debug logging by checking console logs:
- `✅ Content Moderation Service initialized`
- Violation detection logs
- Pattern match logs

## 📖 Usage Example

```typescript
import { useContentModeration } from '@/hooks/useContentModeration';
import { ModerationWarning } from '@/components/ContentModeration/ModerationWarning';

const MyComponent = () => {
  const { moderationResult, checkContent, clearResult } = useContentModeration({
    debounceMs: 500,
  });

  return (
    <>
      <TextInput
        onChangeText={(text) => {
          setMessage(text);
          checkContent(text);
        }}
      />
      {moderationResult && moderationResult.message && (
        <ModerationWarning
          result={moderationResult}
          onDismiss={clearResult}
        />
      )}
    </>
  );
};
```

## ✅ Implementation Status

- ✅ Content moderation service
- ✅ Word lists and patterns
- ✅ Text normalization
- ✅ Pattern matching
- ✅ UI warning component
- ✅ Chat screen integration
- ✅ Notes screen integration
- ✅ Real-time checking
- ✅ Send button blocking
- ✅ User-friendly messages

## 🎯 Next Steps

1. **Expand Word Lists**: Add more comprehensive word lists
2. **Server Integration**: Implement server-side validation
3. **Analytics**: Track violation patterns
4. **Admin Dashboard**: Build admin interface for reviewing violations
5. **User Education**: Add tooltips/help text about community guidelines

---

**Note**: This is a client-side implementation. Server-side validation should be implemented for production use to prevent bypassing client-side checks.

