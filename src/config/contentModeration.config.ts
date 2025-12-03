/**
 * Content Moderation Configuration
 * Word lists and patterns for content moderation
 * 
 * Note: These are basic lists. For production, consider:
 * - Using a professional content moderation API
 * - Regularly updating word lists
 * - Using machine learning models for better accuracy
 */

import { RuleType } from '@/services/contentModerationService';

/**
 * Profanity word list (common offensive words)
 * Add more as needed
 */
export const PROFANITY_WORDS = [
  'damn',
  'hell',
  'sex',
  'boobs',
  'crap',
  'ass',
  'asshole',
  'bitch',
  'bastard',
  'shit',
  'fuck',
  'fucking',
  'piss',
  'pissed',
  'dick',
  'cock',
  'pussy',
  'whore',
  'slut',
  'retard',
  'retarded',
  'idiot',
  'stupid',
  'moron',
  'dumbass',
  'douchebag',
  'motherfucker',
  'fucker',
  'bullshit',
  'goddamn',
  'damnit',
];

/**
 * Hate speech keywords
 * Words/phrases that target protected classes
 */
export const HATE_SPEECH_WORDS = [
  // Add hate speech keywords here
  // Target: race, religion, gender, sexual orientation, etc.
];

/**
 * Sexual content keywords
 * Explicit sexual references
 */
export const SEXUAL_CONTENT_WORDS = [
  // Add sexual content keywords here
];

/**
 * Harassment keywords
 * Targeted abuse and harassment
 */
export const HARASSMENT_WORDS = [
  'kill yourself',
  'kys',
  'you should die',
  'go die',
  'nobody likes you',
  'you\'re worthless',
];

/**
 * Threat keywords
 * Threats of violence or harm
 */
export const THREAT_WORDS = [
  'i will kill',
  'i will hurt',
  'i will harm',
  'i will attack',
  'threaten',
  'i\'ll kill',
  'i\'ll hurt',
];

/**
 * Self-harm / Suicide keywords
 * References to self-harm or suicide
 */
export const SELF_HARM_WORDS = [
  'suicide',
  'kill myself',
  'end my life',
  'self harm',
  'cutting',
  'overdose',
  'hang myself',
  'jump off',
  'kms',
  'unalive',
  'commit suicide',
  'take my life',
  'end it all',
];

/**
 * Personal Information Patterns
 * Regex patterns for detecting PII
 */
export const PII_PATTERNS = {
  // Phone numbers (US format)
  PHONE: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  
  // Email addresses
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Social Security Number
  SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // Credit card numbers
  CREDIT_CARD: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  
  // IP addresses
  IP_ADDRESS: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  
  // Physical addresses (basic pattern)
  ADDRESS: /\b\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|blvd|boulevard)\b/gi,
};

/**
 * Link/URL patterns
 */
export const LINK_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /[a-z0-9-]+\.[a-z]{2,}/gi,
];

/**
 * Leet speak patterns (common character substitutions)
 */
export const LEET_SPEAK_PATTERNS = [
  { pattern: /[a@][s$][s$]/gi, word: 'ass' },
  { pattern: /[f][u@][c][k]/gi, word: 'fuck' },
  { pattern: /[s][h][i1][t]/gi, word: 'shit' },
  { pattern: /[b][i1][t][c][h]/gi, word: 'bitch' },
  { pattern: /[f][u@][c][k][i1][n][g]/gi, word: 'fucking' },
];

/**
 * Word list mapping
 */
export const WORD_LISTS: Record<RuleType, string[]> = {
  [RuleType.PROFANITY]: PROFANITY_WORDS,
  [RuleType.HATE_SPEECH]: HATE_SPEECH_WORDS,
  [RuleType.SEXUAL_CONTENT]: SEXUAL_CONTENT_WORDS,
  [RuleType.HARASSMENT]: HARASSMENT_WORDS,
  [RuleType.THREATS]: THREAT_WORDS,
  [RuleType.SELF_HARM]: SELF_HARM_WORDS,
  [RuleType.PERSONAL_INFO]: [],
  [RuleType.SPAM]: [],
  [RuleType.LINKS]: [],
  [RuleType.IMPERSONATION]: [],
  [RuleType.POLICY_BYPASS]: [],
};

