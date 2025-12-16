/**
 * SEO Analysis API
 * Provides real-time SEO scoring and recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeSEOContent, calculateReadability, extractKeywords, generateMetaDescription } from '@/lib/seo/content-optimizer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, content, targetKeyword, url } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Analyze SEO
    const seoAnalysis = analyzeSEOContent({
      title,
      description,
      body: content,
      targetKeyword,
      url,
    });

    // Calculate readability
    const readability = calculateReadability(content);

    // Extract keywords
    const keywords = extractKeywords(content, 15);

    // Generate optimized description if not provided
    const optimizedDescription = description || generateMetaDescription(content, targetKeyword);

    // Calculate content stats
    const wordCount = content.split(/\s+/).length;
    const charCount = content.length;
    const sentenceCount = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0).length;
    const paragraphCount = content.split(/\n\n+/).filter((p: string) => p.trim().length > 0).length;

    return NextResponse.json({
      success: true,
      analysis: {
        seo: seoAnalysis,
        readability,
        keywords,
        optimizedDescription,
        stats: {
          wordCount,
          charCount,
          sentenceCount,
          paragraphCount,
          avgWordsPerSentence: Math.round(wordCount / sentenceCount),
          avgWordsPerParagraph: Math.round(wordCount / paragraphCount),
        },
        recommendations: {
          titleSuggestion: seoAnalysis.score < 80 && title.length < 50 
            ? `Consider expanding title to include more keywords. Current: ${title.length} chars, ideal: 50-60 chars.`
            : null,
          descriptionSuggestion: description && description.length < 140
            ? `Expand description to utilize full 160 character limit. Current: ${description.length} chars.`
            : null,
          contentSuggestion: wordCount < 500
            ? `Add more content. Current: ${wordCount} words, recommended: 500+ for better ranking.`
            : null,
          keywordSuggestion: targetKeyword && seoAnalysis.score < 70
            ? `Use target keyword "${targetKeyword}" more naturally throughout content.`
            : null,
        },
      },
    });
  } catch (error: any) {
    console.error('SEO analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze content', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Return SEO best practices guide
  return NextResponse.json({
    success: true,
    guide: {
      title: {
        minLength: 30,
        maxLength: 60,
        tips: [
          'Include target keyword near the beginning',
          'Make it compelling to increase CTR',
          'Use numbers or power words when relevant',
          'Match search intent',
        ],
      },
      description: {
        minLength: 120,
        maxLength: 160,
        tips: [
          'Include target keyword naturally',
          'Write a compelling call-to-action',
          'Provide unique value proposition',
          'Use active voice',
        ],
      },
      content: {
        minWords: 300,
        recommendedWords: 1000,
        tips: [
          'Use heading hierarchy (H1, H2, H3)',
          'Include target keyword 2-3% of content',
          'Add internal links to related pages',
          'Include images with alt text',
          'Use bullet points for readability',
          'Answer user questions directly',
        ],
      },
      keywords: {
        primaryKeyword: 'Use 1-2 times in title, description, H1',
        secondaryKeywords: 'Use naturally throughout content',
        lsiKeywords: 'Include related terms and synonyms',
        tips: [
          'Focus on search intent',
          'Use long-tail keywords',
          'Avoid keyword stuffing',
          'Use keywords in image alt text',
        ],
      },
      technical: {
        url: 'Keep URLs short, descriptive, with hyphens',
        imageAlt: 'Describe images with keywords',
        internalLinks: '2-5 relevant internal links per page',
        externalLinks: 'Link to authoritative sources',
        mobileOptimized: 'Ensure responsive design',
        pageSpeed: 'Target <3 second load time',
      },
    },
  });
}
