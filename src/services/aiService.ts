import { MoodType } from '@/types';
import { supabase } from '@/config/supabase';

// Configuration: Use Edge Function (server-side, more secure)
const USE_EDGE_FUNCTION = true;

export interface AIEnhancementOptions {
  mood: MoodType;
  originalText: string;
  enhancementType: 'improve' | 'shorten' | 'expand' | 'make_mysterious' | 'generate_from_prompt';
}

export interface AIEnhancementResult {
  enhancedText: string;
  suggestions: string[];
  confidence: number;
}

class AIService {
  private static instance: AIService;
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Enhance text via Supabase Edge Function (server-side, more secure)
   */
  private async enhanceTextViaEdgeFunction(options: AIEnhancementOptions): Promise<AIEnhancementResult> {
    try {
      const { mood, originalText, enhancementType } = options;

      console.log('🤖 Calling AI Edge Function...');

      const { data, error } = await supabase.functions.invoke('ai-enhance', {
        body: {
          mood,
          originalText,
          enhancementType,
        },
      });

      if (error) {
        console.error('❌ Edge Function Error:', error);
        throw new Error(error.message || 'Edge Function error');
      }

      if (!data || !data.enhancedText) {
        throw new Error('Invalid response from Edge Function');
      }

      return {
        enhancedText: data.enhancedText,
        suggestions: data.suggestions || [],
        confidence: data.confidence || 5,
      };
    } catch (error) {
      console.error('AI Enhancement Error (Edge Function):', error);
      // Fallback to mock enhancement if Edge Function fails
      return this.getMockEnhancement(options);
    }
  }

  /**
   * Enhance text based on mood and enhancement type
   */
  async enhanceText(options: AIEnhancementOptions): Promise<AIEnhancementResult> {
    try {
      // Use Edge Function if configured
      if (USE_EDGE_FUNCTION) {
        return this.enhanceTextViaEdgeFunction(options);
      }
      
      // Fallback to mock if Edge Function is not available
      console.log('Edge Function not configured, using mock enhancement');
      return this.getMockEnhancement(options);
    } catch (error) {
      console.error('AI Enhancement Error:', error);
      return this.getMockEnhancement(options);
    }
  }

  /**
   * Generate creative text from prompts like "write a motivational quote" or "I am happy, enhance that"
   */
  async generateFromPrompt(prompt: string, mood: MoodType): Promise<AIEnhancementResult> {
    try {
      // Use Edge Function if configured
      if (USE_EDGE_FUNCTION) {
        return this.enhanceTextViaEdgeFunction({
          mood,
          originalText: prompt,
          enhancementType: 'generate_from_prompt',
        });
      }
      
      // Fallback to mock if Edge Function is not available
      console.log('Edge Function not configured, using mock generation');
      return this.getMockPromptGeneration(prompt, mood);
    } catch (error) {
      console.error('AI Prompt Generation Error:', error);
      return this.getMockPromptGeneration(prompt, mood);
    }
  }

  /**
   * Generate conversation starters based on mood
   */
  async generateConversationStarters(mood: MoodType): Promise<string[]> {
    try {
      // Use Edge Function if configured (conversation starters can use the same Edge Function)
      if (USE_EDGE_FUNCTION) {
        // For now, use mock since conversation starters aren't implemented in Edge Function
        // This can be extended later if needed
        console.log('Using mock conversation starters');
        return this.getMockConversationStarters(mood);
      }
      
      return this.getMockConversationStarters(mood);
    } catch (error) {
      console.error('AI Conversation Starters Error:', error);
      return this.getMockConversationStarters(mood);
    }
  }

  /**
   * Mock enhancement for when AI is unavailable
   */
  private getMockEnhancement(options: AIEnhancementOptions): AIEnhancementResult {
    const { originalText, mood, enhancementType } = options;
    
    const mockEnhancements: Record<AIEnhancementOptions['enhancementType'], string> = {
      improve: `✨ ${originalText} ✨`,
      shorten: originalText.length > 50 ? originalText.substring(0, 50) + '...' : originalText,
      expand: `${originalText} What do you think?`,
      make_mysterious: `🤫 ${originalText} 🤫`,
      generate_from_prompt: `🌟 ${originalText} 🌟`
    };

    const mockSuggestions = [
      `💭 ${originalText}`,
      `🌟 ${originalText}`,
      `✨ ${originalText} ✨`
    ];

    return {
      enhancedText: mockEnhancements[enhancementType] || originalText,
      suggestions: mockSuggestions,
      confidence: 6
    };
  }

  /**
   * Mock prompt generation for when AI is unavailable
   */
  private getMockPromptGeneration(prompt: string, mood: MoodType): AIEnhancementResult {
    const promptLower = prompt.toLowerCase();
    
    // Creative responses based on common prompts
    let enhancedText = prompt;
    let suggestions: string[] = [];
    
    if (promptLower.includes('motivational') || promptLower.includes('quote')) {
      const motivationalQuotes = [
        "🌟 Every whisper carries the power to inspire someone's day",
        "💫 In the silence between words, magic happens",
        "✨ Your thoughts have wings - let them fly",
        "🌅 Tomorrow's possibilities are born from today's whispers",
        "🎯 Dreams whispered become reality spoken"
      ];
      enhancedText = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
      suggestions = motivationalQuotes.filter(q => q !== enhancedText).slice(0, 3);
    } else if (promptLower.includes('happy') || promptLower.includes('joy')) {
      const happyResponses = [
        "😊 Happiness is a whisper that echoes through hearts",
        "🌈 Joy shared anonymously multiplies infinitely",
        "✨ Your happiness is contagious - spread it quietly",
        "🎉 Celebrate the small moments that make life magical",
        "🌻 Like sunshine, happiness reaches everyone it touches"
      ];
      enhancedText = happyResponses[Math.floor(Math.random() * happyResponses.length)];
      suggestions = happyResponses.filter(r => r !== enhancedText).slice(0, 3);
    } else if (promptLower.includes('sad') || promptLower.includes('down')) {
      const comfortingResponses = [
        "💙 Even in darkness, whispers of hope find their way",
        "🌧️ Rain washes away sadness, leaving room for growth",
        "🤗 You're not alone in feeling this way",
        "🌙 Night always gives way to dawn",
        "💝 Sometimes the kindest whispers come from understanding hearts"
      ];
      enhancedText = comfortingResponses[Math.floor(Math.random() * comfortingResponses.length)];
      suggestions = comfortingResponses.filter(r => r !== enhancedText).slice(0, 3);
    } else if (promptLower.includes('love') || promptLower.includes('heart')) {
      const loveResponses = [
        "❤️ Love whispered anonymously touches souls deeply",
        "💕 Hearts connect through invisible threads of understanding",
        "🌹 Love grows in the spaces between words",
        "💖 The most powerful love stories are written in whispers",
        "🕊️ Love is the language that needs no translation"
      ];
      enhancedText = loveResponses[Math.floor(Math.random() * loveResponses.length)];
      suggestions = loveResponses.filter(r => r !== enhancedText).slice(0, 3);
    } else {
      // Generic creative enhancement
      const creativeEnhancements = [
        `✨ ${prompt} ✨`,
        `🌟 ${prompt} 🌟`,
        `💭 ${prompt} 💭`,
        `🎭 ${prompt} 🎭`,
        `🔮 ${prompt} 🔮`
      ];
      enhancedText = creativeEnhancements[Math.floor(Math.random() * creativeEnhancements.length)];
      suggestions = creativeEnhancements.filter(e => e !== enhancedText).slice(0, 3);
    }

    return {
      enhancedText,
      suggestions,
      confidence: 7
    };
  }

  /**
   * Mock conversation starters for when AI is unavailable
   */
  private getMockConversationStarters(mood: MoodType): string[] {
    const mockStarters = {
      happy: ["What made you smile today? 😊", "Share a happy moment! 🌟", "What brings you joy? ✨"],
      sad: ["What's weighing on your heart? 💙", "Share what's troubling you 🌧️", "What comfort do you need? 🤗"],
      anxious: ["What's on your mind? 🤔", "Share what's worrying you 🌊", "What brings you peace? 🕊️"],
      angry: ["What's frustrating you? 😤", "Share what's bothering you 🔥", "What needs to change? 💪"],
      joyful: ["What made you smile today? 😊", "Share a happy moment! 🌟", "What brings you joy? ✨"],
      reflective: ["What's on your mind tonight? 🤔", "Tell me your thoughts 💭", "What are you pondering? 🌙"],
      excited: ["What's got you excited? 🚀", "Share your enthusiasm! ⚡", "What's buzzing? 🐝"],
      calm: ["What brings you peace? 🕊️", "Share your calm moment 🌸", "What soothes your soul? 🌿"],
      curious: ["What mysteries intrigue you? 🔍", "What are you curious about? 🤔", "What puzzles you? 🧩"],
      grateful: ["What are you grateful for? 🙏", "Share your appreciation 💝", "What warms your heart? ❤️"],
      hopeful: ["What are you hoping for? 🌅", "Share your dreams 🌟", "What gives you hope? 🌈"],
      playful: ["Let's play a word game! 🎮", "Share something fun! 🎪", "What's your playful side? 🎭"],
      nostalgic: ["What memories do you cherish? 📸", "Share a fond memory 💭", "What takes you back? 🕰️"],
      determined: ["What are you working towards? 🎯", "Share your goals! 🏆", "What drives you? 💪"],
      lonely: ["What connection do you seek? 🤝", "Share what's on your heart 💙", "What companionship do you need? 🌙"]
    };

    return mockStarters[mood] || mockStarters.reflective;
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    // Always return true since we're using Edge Function (server-side)
    return USE_EDGE_FUNCTION;
  }
}

export default AIService.getInstance();
