import { MoodType } from '@/types';

// OpenAI API configuration
const OPENAI_API_KEY: string = 'your-api-key-here'; // Replace with your actual API key
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface AIEnhancementOptions {
  mood: MoodType;
  originalText: string;
  enhancementType: 'improve' | 'shorten' | 'expand' | 'make_mysterious';
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
   * Enhance text based on mood and enhancement type
   */
  async enhanceText(options: AIEnhancementOptions): Promise<AIEnhancementResult> {
    try {
      const { mood, originalText, enhancementType } = options;
      
      // Check if API key is configured
      if (!this.isAvailable()) {
        console.log('OpenAI API key not configured, using mock enhancement');
        return this.getMockEnhancement(options);
      }
      
      // Create mood-specific prompts
      const moodPrompts = {
        happy: "Make this message joyful, positive, and uplifting while keeping it anonymous and mysterious.",
        sad: "Make this message empathetic, comforting, and understanding while maintaining anonymity.",
        anxious: "Make this message calming, reassuring, and supportive while maintaining anonymity.",
        angry: "Make this message more constructive, channeling frustration into something meaningful while maintaining anonymity.",
        joyful: "Make this message more joyful, uplifting, and positive while keeping it anonymous and mysterious.",
        reflective: "Make this message more thoughtful, introspective, and contemplative while maintaining anonymity.",
        excited: "Make this message more energetic, enthusiastic, and exciting while keeping it mysterious.",
        calm: "Make this message more peaceful, serene, and calming while maintaining its anonymous nature.",
        curious: "Make this message more intriguing, thought-provoking, and curiosity-inducing while keeping it mysterious.",
        grateful: "Make this message more appreciative, thankful, and warm while maintaining anonymity.",
        hopeful: "Make this message more optimistic, inspiring, and hopeful while keeping it mysterious.",
        playful: "Make this message more fun, lighthearted, and playful while maintaining its anonymous nature.",
        nostalgic: "Make this message more wistful, sentimental, and nostalgic while keeping it mysterious.",
        determined: "Make this message more focused, resolute, and determined while maintaining anonymity.",
        lonely: "Make this message more connecting, understanding, and supportive while maintaining anonymity."
      };

      const enhancementPrompts = {
        improve: "Improve the overall quality, clarity, and impact of this message.",
        shorten: "Make this message more concise and impactful while keeping the core meaning.",
        expand: "Expand this message with more detail and depth while maintaining its essence.",
        make_mysterious: "Make this message more mysterious, intriguing, and enigmatic."
      };

      const moodPrompt = moodPrompts[mood] || moodPrompts.reflective;
      const enhancementPrompt = enhancementPrompts[enhancementType] || enhancementPrompts.improve;

      const systemPrompt = `You are an AI writing assistant for an anonymous messaging app called Whispr. 
Your job is to enhance anonymous messages while maintaining their mysterious and anonymous nature.
Guidelines:
- Keep messages appropriate and respectful
- Maintain anonymity (no personal details)
- Make messages engaging and mysterious
- Preserve the original intent and emotion
- Keep responses concise (under 200 characters)
- Make them feel like genuine anonymous whispers`;

      const userPrompt = `${moodPrompt} ${enhancementPrompt}

Original message: "${originalText}"

Please provide:
1. An enhanced version of the message
2. 2-3 alternative suggestions
3. A confidence score (1-10) for how well the enhancement matches the mood

Format your response as JSON:
{
  "enhanced": "enhanced message here",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "confidence": 8
}`;

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from AI');
      }

      // Parse JSON response
      const parsedResponse = JSON.parse(content);
      
      return {
        enhancedText: parsedResponse.enhanced || originalText,
        suggestions: parsedResponse.suggestions || [],
        confidence: parsedResponse.confidence || 5
      };

    } catch (error) {
      console.error('AI Enhancement Error:', error);
      
      // Fallback to mock enhancement if AI fails
      return this.getMockEnhancement(options);
    }
  }

  /**
   * Generate conversation starters based on mood
   */
  async generateConversationStarters(mood: MoodType): Promise<string[]> {
    try {
      // Check if API key is configured
      if (!this.isAvailable()) {
        console.log('OpenAI API key not configured, using mock conversation starters');
        return this.getMockConversationStarters(mood);
      }

      const moodStarters = {
        happy: "Generate 3 joyful, uplifting conversation starters for anonymous messaging",
        sad: "Generate 3 empathetic, comforting conversation starters for anonymous messaging",
        anxious: "Generate 3 calming, reassuring conversation starters for anonymous messaging",
        angry: "Generate 3 constructive, channeling frustration conversation starters for anonymous messaging",
        joyful: "Generate 3 joyful, uplifting conversation starters for anonymous messaging",
        reflective: "Generate 3 thoughtful, introspective conversation starters for anonymous messaging",
        excited: "Generate 3 energetic, exciting conversation starters for anonymous messaging",
        calm: "Generate 3 peaceful, serene conversation starters for anonymous messaging",
        curious: "Generate 3 intriguing, curiosity-inducing conversation starters for anonymous messaging",
        grateful: "Generate 3 appreciative, thankful conversation starters for anonymous messaging",
        hopeful: "Generate 3 optimistic, inspiring conversation starters for anonymous messaging",
        playful: "Generate 3 fun, lighthearted conversation starters for anonymous messaging",
        nostalgic: "Generate 3 wistful, sentimental conversation starters for anonymous messaging",
        determined: "Generate 3 focused, determined conversation starters for anonymous messaging",
        lonely: "Generate 3 connecting, supportive conversation starters for anonymous messaging"
      };

      const prompt = `${moodStarters[mood] || moodStarters.reflective}. 
Keep them mysterious, anonymous, and engaging. Each should be under 100 characters.
Format as a JSON array: ["starter1", "starter2", "starter3"]`;

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a creative writing assistant for anonymous messaging." },
            { role: "user", content: prompt }
          ],
          max_tokens: 200,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from AI');
      }

      return JSON.parse(content);

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
    
    const mockEnhancements = {
      improve: `✨ ${originalText} ✨`,
      shorten: originalText.length > 50 ? originalText.substring(0, 50) + '...' : originalText,
      expand: `${originalText} What do you think?`,
      make_mysterious: `🤫 ${originalText} 🤫`
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
    return OPENAI_API_KEY !== 'your-api-key-here' && OPENAI_API_KEY.length > 0;
  }
}

export default AIService.getInstance();
