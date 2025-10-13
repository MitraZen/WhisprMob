# AI Service Configuration

## Setup Instructions

To use the AI Writing Assistant feature, you need to set up your OpenAI API key:

### 1. Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key

### 2. Configure API Key

Edit `src/services/aiService.ts` and replace:
```typescript
const OPENAI_API_KEY = 'your-api-key-here'; // Replace with your actual API key
```
with:
```typescript
const OPENAI_API_KEY = 'your-actual-api-key-here';
```

### 3. Free Tier Limits
- OpenAI provides $5 free credit (expires after 3 months)
- Rate limits: 3 requests/minute, 200 requests/day
- After credit expires: Pay-as-you-go pricing

### 4. Fallback Behavior
If no API key is configured or AI service fails, the app will use mock enhancements to ensure the feature still works.

## Features

### AI Enhancement Types
- **Improve**: Enhance overall quality and impact
- **Shorten**: Make message more concise
- **Expand**: Add more detail and depth
- **Make Mysterious**: Add intrigue and mystery

### Mood-Based Enhancement
The AI considers your selected mood to tailor the enhancement:
- Joyful: More uplifting and positive
- Reflective: More thoughtful and introspective
- Excited: More energetic and enthusiastic
- Calm: More peaceful and serene
- Curious: More intriguing and thought-provoking
- And more...

### AI Confidence Score
Each enhancement includes a confidence score (1-10) indicating how well the AI matched your mood and intent.

## Troubleshooting

### Common Issues
1. **"AI Error" message**: Check your API key configuration
2. **Slow responses**: Check your internet connection
3. **Rate limit errors**: Wait a moment and try again

### Mock Mode
If AI is unavailable, the app automatically falls back to mock enhancements to ensure functionality.
