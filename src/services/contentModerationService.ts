/**
 * Content Moderation Service
 * Client-side rule engine for detecting and handling inappropriate content
 * 
 * Features:
 * - Profanity/offensive words detection
 * - Hate speech detection
 * - Sexual content detection
 * - Harassment/threats detection
 * - Self-harm/suicide detection
 * - Personal info/doxxing detection
 * - Spam/links/impersonation detection
 * - Policy bypass detection (leet speak, spaces, punctuation)
 */

import { WORD_LISTS, PII_PATTERNS, LINK_PATTERNS, LEET_SPEAK_PATTERNS } from '@/config/contentModeration.config';

export enum RuleType {
  PROFANITY = 'profanity',
  HATE_SPEECH = 'hate_speech',
  SEXUAL_CONTENT = 'sexual_content',
  HARASSMENT = 'harassment',
  THREATS = 'threats',
  SELF_HARM = 'self_harm',
  PERSONAL_INFO = 'personal_info',
  SPAM = 'spam',
  LINKS = 'links',
  IMPERSONATION = 'impersonation',
  POLICY_BYPASS = 'policy_bypass',
}

export enum Severity {
  SOFT = 'soft', // Mild offense - show warning
  HARD = 'hard', // Severe offense - block send
}

export enum Action {
  WARN = 'warn', // Show inline warning, allow edit
  BLOCK = 'block', // Block send, show escalation UI
  FLAG = 'flag', // Flag for human review
}

export interface ModerationRule {
  type: RuleType;
  severity: Severity;
  action: Action;
  escalation?: 'human_review' | 'auto_ban' | 'none';
  patterns?: string[]; // Regex patterns
  keywords?: string[]; // Keyword lists
  description: string;
}

export interface ModerationResult {
  isAllowed: boolean;
  violations: ModerationViolation[];
  severity: Severity;
  action: Action;
  message: string;
  canEdit: boolean;
}

export interface ModerationViolation {
  type: RuleType;
  severity: Severity;
  action: Action;
  matchedText: string;
  position: { start: number; end: number };
  description: string;
}

class ContentModerationService {
  private rules: ModerationRule[] = [];
  private wordLists: Map<RuleType, Set<string>> = new Map();
  private initialized = false;

  /**
   * Initialize the moderation service with rules and word lists
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load word lists
    await this.loadWordLists();

    // Initialize rules
    this.initializeRules();

    this.initialized = true;
    console.log('✅ Content Moderation Service initialized');
  }

  /**
   * Load word lists for different rule types
   */
  private async loadWordLists(): Promise<void> {
    // Load word lists from config
    for (const [ruleType, words] of Object.entries(WORD_LISTS)) {
      if (words.length > 0) {
        this.wordLists.set(ruleType as RuleType, new Set(words.map(w => this.normalizeText(w, false))));
        console.log(`📝 Loaded ${words.length} words for ${ruleType}:`, words.slice(0, 5));
      }
    }
    console.log('✅ Word lists loaded. Total rule types:', this.wordLists.size);
  }

  /**
   * Initialize moderation rules
   */
  private initializeRules(): void {
    this.rules = [
      // Self-harm / Suicide - HARD BLOCK
      {
        type: RuleType.SELF_HARM,
        severity: Severity.HARD,
        action: Action.BLOCK,
        escalation: 'human_review',
        description: 'Content contains self-harm or suicide references',
      },
      // Threats - HARD BLOCK
      {
        type: RuleType.THREATS,
        severity: Severity.HARD,
        action: Action.BLOCK,
        escalation: 'human_review',
        description: 'Content contains threats of violence',
      },
      // Personal Info / Doxxing - HARD BLOCK
      {
        type: RuleType.PERSONAL_INFO,
        severity: Severity.HARD,
        action: Action.BLOCK,
        escalation: 'human_review',
        patterns: [
          PII_PATTERNS.PHONE,
          PII_PATTERNS.EMAIL,
          PII_PATTERNS.SSN,
          PII_PATTERNS.CREDIT_CARD,
          PII_PATTERNS.IP_ADDRESS,
          PII_PATTERNS.ADDRESS,
        ],
        description: 'Content contains personal information',
      },
      // Harassment - HARD BLOCK
      {
        type: RuleType.HARASSMENT,
        severity: Severity.HARD,
        action: Action.BLOCK,
        escalation: 'human_review',
        description: 'Content contains harassment',
      },
      // Hate Speech - HARD BLOCK
      {
        type: RuleType.HATE_SPEECH,
        severity: Severity.HARD,
        action: Action.BLOCK,
        escalation: 'human_review',
        description: 'Content contains hate speech',
      },
      // Sexual Content - SOFT WARN
      {
        type: RuleType.SEXUAL_CONTENT,
        severity: Severity.SOFT,
        action: Action.WARN,
        description: 'Content may contain sexual content',
      },
      // Profanity - SOFT WARN
      {
        type: RuleType.PROFANITY,
        severity: Severity.SOFT,
        action: Action.WARN,
        description: 'Content contains profanity',
      },
      // Spam / Links - SOFT WARN
      {
        type: RuleType.LINKS,
        severity: Severity.SOFT,
        action: Action.WARN,
        patterns: LINK_PATTERNS,
        description: 'Content contains links',
      },
      // Policy Bypass - SOFT WARN
      {
        type: RuleType.POLICY_BYPASS,
        severity: Severity.SOFT,
        action: Action.WARN,
        description: 'Content may attempt to bypass moderation',
      },
    ];
  }

  /**
   * Normalize text for matching
   * - Convert to lowercase
   * - Remove diacritics
   * - Collapse repeated characters
   * - Remove spaces and punctuation (for bypass detection)
   */
  normalizeText(text: string, removeSpaces = false): string {
    let normalized = text.toLowerCase();

    // Remove diacritics (é -> e, ñ -> n, etc.)
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Collapse repeated characters (helllllo -> hello)
    normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');

    if (removeSpaces) {
      // Remove spaces and punctuation for bypass detection
      normalized = normalized.replace(/[^a-z0-9]/g, '');
    }

    return normalized;
  }

  /**
   * Check for policy bypass attempts (leet speak, spaces, punctuation)
   */
  private detectPolicyBypass(text: string, normalizedText: string): ModerationViolation[] {
    const violations: ModerationViolation[] = [];

    // Check for leet speak patterns (common substitutions)
    for (const { pattern } of LEET_SPEAK_PATTERNS) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            type: RuleType.POLICY_BYPASS,
            severity: Severity.SOFT,
            action: Action.WARN,
            matchedText: match[0],
            position: { start: match.index, end: match.index + match[0].length },
            description: 'Content may attempt to bypass moderation',
          });
        }
      }
    }

    // Check for spaced out words (f u c k, s h i t)
    const spacedPattern = /\b([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\b/gi;
    const spacedMatches = text.matchAll(spacedPattern);
    for (const match of spacedMatches) {
      const spacedWord = match[0].replace(/\s+/g, '');
      const normalizedSpaced = this.normalizeText(spacedWord, true);
      
      // Check if spaced word matches any banned word
      for (const [ruleType, wordList] of this.wordLists.entries()) {
        for (const bannedWord of wordList) {
          if (normalizedSpaced.includes(bannedWord) || bannedWord.includes(normalizedSpaced)) {
            violations.push({
              type: RuleType.POLICY_BYPASS,
              severity: Severity.SOFT,
              action: Action.WARN,
              matchedText: match[0],
              position: { start: match.index || 0, end: (match.index || 0) + match[0].length },
              description: 'Content may attempt to bypass moderation',
            });
            break;
          }
        }
      }
    }

    return violations;
  }

  /**
   * Check for personal information (PII)
   */
  private detectPersonalInfo(text: string): ModerationViolation[] {
    const violations: ModerationViolation[] = [];
    const personalInfoRule = this.rules.find(r => r.type === RuleType.PERSONAL_INFO);

    if (!personalInfoRule?.patterns) return violations;

    for (const pattern of personalInfoRule.patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            type: RuleType.PERSONAL_INFO,
            severity: Severity.HARD,
            action: Action.BLOCK,
            matchedText: match[0],
            position: { start: match.index, end: match.index + match[0].length },
            description: personalInfoRule.description,
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check for links/URLs
   */
  private detectLinks(text: string): ModerationViolation[] {
    const violations: ModerationViolation[] = [];
    const linksRule = this.rules.find(r => r.type === RuleType.LINKS);

    if (!linksRule?.patterns) return violations;

    for (const pattern of linksRule.patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            type: RuleType.LINKS,
            severity: Severity.SOFT,
            action: Action.WARN,
            matchedText: match[0],
            position: { start: match.index, end: match.index + match[0].length },
            description: linksRule.description,
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check for keywords in word lists
   */
  private detectKeywords(text: string, normalizedText: string): ModerationViolation[] {
    const violations: ModerationViolation[] = [];

    // Check each rule type
    for (const rule of this.rules) {
      if (!rule.keywords && !this.wordLists.has(rule.type)) continue;

      const keywords = rule.keywords || Array.from(this.wordLists.get(rule.type) || []);
      if (keywords.length === 0) continue;
      
      // Check for keyword matches
      for (const originalKeyword of keywords) {
        // For single words, use word boundaries; for phrases, use flexible matching
        let regex: RegExp;
        if (originalKeyword.includes(' ')) {
          // Multi-word phrase: allow extra spaces between words
          const phrasePattern = originalKeyword
            .split(/\s+/)
            .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('\\s+');
          regex = new RegExp(phrasePattern, 'gi');
        } else {
          // Single word: use strict word boundaries
          const escapedKeyword = originalKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
        }
        
        const matches = text.matchAll(regex);
        for (const match of matches) {
          if (match.index !== undefined) {
            violations.push({
              type: rule.type,
              severity: rule.severity,
              action: rule.action,
              matchedText: match[0],
              position: { start: match.index, end: match.index + match[0].length },
              description: rule.description,
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Find original text match from normalized position
   */
  private findOriginalMatch(text: string, keyword: string, normalizedIndex: number): { text: string; position: { start: number; end: number } } | null {
    // Simple approach: search for keyword in original text
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const match = text.match(regex);
    if (match) {
      const index = text.toLowerCase().indexOf(match[0].toLowerCase());
      if (index !== -1) {
        return {
          text: match[0],
          position: { start: index, end: index + match[0].length },
        };
      }
    }
    return null;
  }

  /**
   * Main moderation check function
   */
  async checkContent(text: string): Promise<ModerationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!text || text.trim().length === 0) {
      return {
        isAllowed: true,
        violations: [],
        severity: Severity.SOFT,
        action: Action.WARN,
        message: '',
        canEdit: true,
      };
    }

    console.log('🔍 Checking content for moderation:', text.substring(0, 50));

    // Normalize text for matching (keep spaces for multi-word phrases)
    const normalizedText = this.normalizeText(text, false);
    const normalizedTextNoSpaces = this.normalizeText(text, true); // For bypass detection
    const violations: ModerationViolation[] = [];

    // 1. Check for personal information (PII) - HARD BLOCK
    violations.push(...this.detectPersonalInfo(text));

    // 2. Check for self-harm / suicide - HARD BLOCK
    violations.push(...this.detectKeywords(text, normalizedText).filter(v => v.type === RuleType.SELF_HARM));

    // 3. Check for threats - HARD BLOCK
    violations.push(...this.detectKeywords(text, normalizedText).filter(v => v.type === RuleType.THREATS));

    // 4. Check for harassment - HARD BLOCK
    violations.push(...this.detectKeywords(text, normalizedText).filter(v => v.type === RuleType.HARASSMENT));

    // 5. Check for hate speech - HARD BLOCK
    violations.push(...this.detectKeywords(text, normalizedText).filter(v => v.type === RuleType.HATE_SPEECH));

    // 6. Check for policy bypass attempts
    violations.push(...this.detectPolicyBypass(text, normalizedTextNoSpaces));

    // 7. Check for other violations (profanity, sexual content, links)
    violations.push(...this.detectKeywords(text, normalizedText).filter(v => 
      v.type !== RuleType.SELF_HARM &&
      v.type !== RuleType.THREATS &&
      v.type !== RuleType.HARASSMENT &&
      v.type !== RuleType.HATE_SPEECH &&
      v.type !== RuleType.POLICY_BYPASS
    ));

    // 8. Check for links
    violations.push(...this.detectLinks(text));

    // Remove duplicates (same type and position)
    const uniqueViolations = this.removeDuplicateViolations(violations);

    console.log('📊 Moderation check result:', {
      violations: uniqueViolations.length,
      types: uniqueViolations.map(v => v.type),
    });

    // Determine overall severity and action
    const hasHardViolation = uniqueViolations.some(v => v.severity === Severity.HARD);
    const hasSoftViolation = uniqueViolations.some(v => v.severity === Severity.SOFT);

    let severity: Severity;
    let action: Action;
    let isAllowed: boolean;
    let message: string;
    let canEdit: boolean;

    if (hasHardViolation) {
      severity = Severity.HARD;
      action = Action.BLOCK;
      isAllowed = false;
      canEdit = true; // Allow editing to fix
      message = this.getBlockMessage(uniqueViolations.filter(v => v.severity === Severity.HARD));
    } else if (hasSoftViolation) {
      severity = Severity.SOFT;
      action = Action.WARN;
      isAllowed = true; // Allow but warn
      canEdit = true;
      message = this.getWarningMessage(uniqueViolations.filter(v => v.severity === Severity.SOFT));
    } else {
      severity = Severity.SOFT;
      action = Action.WARN;
      isAllowed = true;
      canEdit = true;
      message = '';
    }

    return {
      isAllowed,
      violations: uniqueViolations,
      severity,
      action,
      message,
      canEdit,
    };
  }

  /**
   * Remove duplicate violations
   */
  private removeDuplicateViolations(violations: ModerationViolation[]): ModerationViolation[] {
    const seen = new Set<string>();
    return violations.filter(v => {
      const key = `${v.type}-${v.position.start}-${v.position.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Get warning message for soft violations
   */
  private getWarningMessage(violations: ModerationViolation[]): string {
    if (violations.length === 0) return '';

    const types = violations.map(v => v.type);
    const uniqueTypes = [...new Set(types)];

    if (uniqueTypes.length === 1) {
      return `⚠️ Your message contains ${this.getRuleTypeLabel(uniqueTypes[0])}. Please review before sending.`;
    }

    return `⚠️ Your message may contain content that violates community guidelines. Please review before sending.`;
  }

  /**
   * Get block message for hard violations
   */
  private getBlockMessage(violations: ModerationViolation[]): string {
    if (violations.length === 0) return '';

    const types = violations.map(v => v.type);
    const uniqueTypes = [...new Set(types)];

    // Prioritize most severe violations
    if (types.includes(RuleType.SELF_HARM)) {
      return '🚨 This message contains self-harm references. If you\'re in crisis, please reach out for help. Your message cannot be sent.';
    }
    if (types.includes(RuleType.THREATS)) {
      return '🚨 This message contains threats of violence and cannot be sent.';
    }
    if (types.includes(RuleType.PERSONAL_INFO)) {
      return '🚨 This message contains personal information and cannot be sent for your safety.';
    }
    if (types.includes(RuleType.HARASSMENT)) {
      return '🚨 This message contains harassment and cannot be sent.';
    }
    if (types.includes(RuleType.HATE_SPEECH)) {
      return '🚨 This message contains hate speech and cannot be sent.';
    }

    return '🚨 This message violates community guidelines and cannot be sent.';
  }

  /**
   * Get human-readable label for rule type
   */
  private getRuleTypeLabel(type: RuleType): string {
    const labels: Record<RuleType, string> = {
      [RuleType.PROFANITY]: 'profanity',
      [RuleType.HATE_SPEECH]: 'hate speech',
      [RuleType.SEXUAL_CONTENT]: 'sexual content',
      [RuleType.HARASSMENT]: 'harassment',
      [RuleType.THREATS]: 'threats',
      [RuleType.SELF_HARM]: 'self-harm references',
      [RuleType.PERSONAL_INFO]: 'personal information',
      [RuleType.SPAM]: 'spam',
      [RuleType.LINKS]: 'links',
      [RuleType.IMPERSONATION]: 'impersonation',
      [RuleType.POLICY_BYPASS]: 'content that may bypass moderation',
    };
    return labels[type] || 'inappropriate content';
  }

  /**
   * Get escalation action for violations
   */
  getEscalationAction(violations: ModerationViolation[]): 'human_review' | 'auto_ban' | 'none' {
    const hardViolations = violations.filter(v => v.severity === Severity.HARD);
    
    if (hardViolations.length === 0) return 'none';

    // Self-harm and threats should be escalated
    if (hardViolations.some(v => v.type === RuleType.SELF_HARM || v.type === RuleType.THREATS)) {
      return 'human_review';
    }

    // Other hard violations
    return 'human_review';
  }
}

// Export singleton instance
export const contentModerationService = new ContentModerationService();
export default contentModerationService;

