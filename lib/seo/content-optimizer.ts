/**
 * 🚀 AI-Powered Content Optimization
 * SEO best practices for maximum ranking
 */

export interface SEOScore {
  score: number;
  issues: string[];
  recommendations: string[];
  passedChecks: string[];
}

/**
 * Analyze content for SEO optimization
 */
export function analyzeSEOContent(content: {
  title: string;
  description: string;
  body: string;
  targetKeyword?: string;
  url?: string;
}): SEOScore {
  const issues: string[] = [];
  const recommendations: string[] = [];
  const passedChecks: string[] = [];
  let score = 100;

  // Title checks
  if (!content.title) {
    issues.push('Missing title tag');
    score -= 20;
  } else {
    if (content.title.length < 30) {
      issues.push(`Title too short (${content.title.length} chars). Aim for 50-60.`);
      score -= 5;
    } else if (content.title.length > 60) {
      issues.push(`Title too long (${content.title.length} chars). Will be truncated in search results.`);
      score -= 5;
    } else {
      passedChecks.push('Title length optimal (30-60 chars)');
    }

    if (content.targetKeyword && !content.title.toLowerCase().includes(content.targetKeyword.toLowerCase())) {
      issues.push('Target keyword not in title');
      score -= 10;
    } else if (content.targetKeyword) {
      passedChecks.push('Target keyword in title');
    }
  }

  // Description checks
  if (!content.description) {
    issues.push('Missing meta description');
    score -= 15;
  } else {
    if (content.description.length < 120) {
      issues.push(`Description too short (${content.description.length} chars). Aim for 150-160.`);
      score -= 5;
    } else if (content.description.length > 160) {
      issues.push(`Description too long (${content.description.length} chars). Will be truncated.`);
      score -= 3;
    } else {
      passedChecks.push('Description length optimal (120-160 chars)');
    }

    if (content.targetKeyword && !content.description.toLowerCase().includes(content.targetKeyword.toLowerCase())) {
      recommendations.push('Consider adding target keyword to description');
      score -= 5;
    } else if (content.targetKeyword) {
      passedChecks.push('Target keyword in description');
    }
  }

  // Body content checks
  if (!content.body || content.body.length < 300) {
    issues.push('Content too thin. Aim for at least 300 words (1500+ chars)');
    score -= 15;
  } else {
    passedChecks.push('Content length sufficient');
  }

  // Keyword density check
  if (content.targetKeyword && content.body) {
    const keywordCount = (content.body.toLowerCase().match(new RegExp(content.targetKeyword.toLowerCase(), 'g')) || []).length;
    const wordCount = content.body.split(/\s+/).length;
    const density = (keywordCount / wordCount) * 100;

    if (density < 0.5) {
      recommendations.push(`Keyword density low (${density.toFixed(2)}%). Consider using keyword more naturally.`);
    } else if (density > 3) {
      issues.push(`Keyword stuffing detected (${density.toFixed(2)}%). Reduce keyword usage.`);
      score -= 10;
    } else {
      passedChecks.push(`Keyword density optimal (${density.toFixed(2)}%)`);
    }
  }

  // URL checks
  if (content.url) {
    if (content.url.length > 100) {
      recommendations.push('URL quite long. Shorter URLs tend to rank better.');
    }
    
    if (!/^[a-z0-9-/]+$/.test(content.url.replace(/^https?:\/\/[^/]+/, ''))) {
      recommendations.push('URL contains special characters. Use hyphens for word separation.');
    }

    if (content.targetKeyword && !content.url.toLowerCase().includes(content.targetKeyword.toLowerCase().replace(/\s+/g, '-'))) {
      recommendations.push('Target keyword not in URL slug');
    }
  }

  // Readability checks
  const sentences = content.body.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = content.body.split(/\s+/).length / sentences.length;
  
  if (avgSentenceLength > 25) {
    recommendations.push('Average sentence length high. Consider shorter sentences for readability.');
  } else {
    passedChecks.push('Sentence length good for readability');
  }

  // Heading checks (basic)
  if (content.body.includes('<h1>')) {
    passedChecks.push('H1 heading found');
  } else {
    recommendations.push('Add H1 heading for better structure');
  }

  // Add positive recommendations
  if (score >= 90) {
    recommendations.push('Excellent SEO optimization! Consider adding internal links and rich media.');
  } else if (score >= 70) {
    recommendations.push('Good SEO foundation. Address minor issues for better rankings.');
  } else if (score >= 50) {
    recommendations.push('Moderate SEO. Focus on title, description, and content length.');
  } else {
    recommendations.push('Significant SEO improvements needed. Start with title, description, and keyword optimization.');
  }

  return {
    score: Math.max(0, score),
    issues,
    recommendations,
    passedChecks,
  };
}

/**
 * Generate SEO-friendly slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

/**
 * Extract keywords from content using TF-IDF approach (simplified)
 */
export function extractKeywords(content: string, limit: number = 10): string[] {
  // Remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have',
    'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    'might', 'can', 'this', 'that', 'these', 'those', 'it', 'its',
  ]);

  // Extract words
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count frequency
  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Sort by frequency
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Generate optimized meta description from content
 */
export function generateMetaDescription(content: string, targetKeyword?: string): string {
  // Get first 2-3 sentences
  const sentences = content
    .replace(/<[^>]+>/g, '') // Remove HTML
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 0)
    .slice(0, 3);

  let description = sentences.join('. ').trim();

  // Ensure keyword is included
  if (targetKeyword && !description.toLowerCase().includes(targetKeyword.toLowerCase())) {
    description = `${targetKeyword}: ${description}`;
  }

  // Truncate to ideal length
  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }

  return description;
}

/**
 * Calculate readability score (Flesch Reading Ease)
 */
export function calculateReadability(content: string): {
  score: number;
  level: string;
  recommendation: string;
} {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = content.split(/\s+/);
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  // Flesch Reading Ease formula
  const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

  let level: string;
  let recommendation: string;

  if (score >= 90) {
    level = 'Very Easy';
    recommendation = 'Perfect for broad audience';
  } else if (score >= 80) {
    level = 'Easy';
    recommendation = 'Great readability';
  } else if (score >= 70) {
    level = 'Fairly Easy';
    recommendation = 'Good for most readers';
  } else if (score >= 60) {
    level = 'Standard';
    recommendation = 'Average difficulty';
  } else if (score >= 50) {
    level = 'Fairly Difficult';
    recommendation = 'Consider simplifying language';
  } else {
    level = 'Difficult';
    recommendation = 'Too complex - simplify sentences';
  }

  return { score: Math.max(0, Math.min(100, score)), level, recommendation };
}

/**
 * Count syllables in a word (simplified)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  const vowels = word.match(/[aeiouy]+/g);
  let count = vowels ? vowels.length : 0;
  
  // Adjust for silent e
  if (word.endsWith('e')) count--;
  
  return Math.max(1, count);
}

/**
 * Generate internal linking suggestions
 */
export function suggestInternalLinks(currentUrl: string, content: string, sitePages: { url: string; title: string; keywords: string[] }[]): {
  url: string;
  title: string;
  relevance: number;
  anchorText: string;
}[] {
  const contentWords = extractKeywords(content, 20);
  
  return sitePages
    .filter(page => page.url !== currentUrl)
    .map(page => {
      // Calculate relevance based on keyword overlap
      const overlap = page.keywords.filter(k => contentWords.includes(k)).length;
      const relevance = (overlap / page.keywords.length) * 100;
      
      return {
        url: page.url,
        title: page.title,
        relevance,
        anchorText: page.keywords[0] || page.title,
      };
    })
    .filter(link => link.relevance > 20)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5);
}

/**
 * Generate FAQ schema from content
 */
export function extractFAQFromContent(content: string): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];
  
  // Look for question patterns
  const questionPattern = /(?:^|\n)(?:Q:|Question:|##\s*)?([^?\n]+\?)\s*(?:A:|Answer:)?\s*([^\n]+(?:\n[^\n]+)*)/gi;
  
  let match;
  while ((match = questionPattern.exec(content)) !== null) {
    faqs.push({
      question: match[1].trim(),
      answer: match[2].trim(),
    });
  }
  
  return faqs;
}
