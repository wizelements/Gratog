/**
 * AI Newsletter Generator using OpenAI API
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

if (!OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not configured - AI newsletter generation disabled');
}

/**
 * Generate newsletter content using AI
 */
export async function generateNewsletterContent({
  type = 'promotional', // promotional, educational, announcement, seasonal
  products = [],
  customPrompt = '',
  tone = 'warm', // warm, professional, playful, inspirational
  length = 'medium' // short, medium, long
}) {
  if (!OPENAI_API_KEY) {
    return {
      success: false,
      error: 'AI generation not configured. Set OPENAI_API_KEY environment variable.'
    };
  }

  try {
    // Build context from products
    const productsContext = products.length > 0
      ? `Featured Products:\n${products.map(p => `- ${p.name}: ${p.description || p.shortDescription || 'Wellness product'} ($${p.price})`).join('\n')}`
      : '';

    // Build system prompt
    const systemPrompt = `You are a wellness content writer for Taste of Gratitude, a Sea Moss wellness brand that focuses on gratitude, health, and natural nutrition. Your writing style should be ${tone}, engaging, and wellness-centered. Brand colors are emerald green and honey gold. Brand values: gratitude, wellness, natural healing, community.`;

    // Build user prompt based on type
    let userPrompt = '';
    
    if (type === 'promotional') {
      userPrompt = `Create a ${length} promotional email newsletter that highlights our wellness products and encourages customers to shop. ${productsContext}\n\nInclude: engaging subject line, warm opening, product highlights with benefits, call-to-action, gratitude-focused closing.`;
    } else if (type === 'educational') {
      userPrompt = `Create a ${length} educational newsletter about sea moss benefits, wellness tips, or nutrition advice related to our products. ${productsContext}\n\nInclude: engaging subject line, educational content, wellness tips, product connections, call-to-action.`;
    } else if (type === 'announcement') {
      userPrompt = `Create a ${length} announcement newsletter. ${customPrompt}\n\n${productsContext}\n\nInclude: clear subject line, announcement details, what it means for customers, call-to-action.`;
    } else if (type === 'seasonal') {
      userPrompt = `Create a ${length} seasonal newsletter celebrating the current season and how our products support wellness during this time. ${productsContext}\n\nInclude: seasonal subject line, season-appropriate wellness message, product recommendations, call-to-action.`;
    } else {
      userPrompt = customPrompt + '\n\n' + productsContext;
    }

    if (customPrompt && type !== 'announcement') {
      userPrompt += `\n\nAdditional Context: ${customPrompt}`;
    }

    userPrompt += `\n\nFormat the output as JSON with these fields: { "subject": "email subject line", "preheader": "preheader text", "heading": "main heading", "body": "email body in HTML format with <p>, <h2>, <ul>, etc.", "cta": "call to action text" }`;

    // Call OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);

    return {
      success: true,
      content: {
        subject: content.subject || 'Your Wellness Update from Taste of Gratitude',
        preheader: content.preheader || 'Discover wellness, naturally.',
        heading: content.heading || 'Welcome to Wellness',
        body: content.body || '<p>Your wellness journey continues...</p>',
        cta: content.cta || 'Shop Now'
      }
    };
  } catch (error) {
    console.error('AI newsletter generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate wellness tips using AI
 */
export async function generateWellnessTips(topic = 'general wellness') {
  if (!OPENAI_API_KEY) {
    return [];
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a wellness expert for Taste of Gratitude. Provide practical, evidence-based wellness tips.'
          },
          {
            role: 'user',
            content: `Generate 5 short wellness tips about ${topic}. Format as JSON object: { "tips": ["tip1", "tip2", ...] }`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return result.tips || [];
  } catch (error) {
    console.error('Wellness tips generation error:', error);
    return [];
  }
}
