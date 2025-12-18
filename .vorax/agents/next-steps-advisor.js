#!/usr/bin/env node
/**
 * VORAX NextSteps Advisor
 * 
 * Intelligent recommendation engine that analyzes the full site
 * and provides prioritized enhancement steps based on:
 * - Current issues from scan results
 * - Business impact potential
 * - Implementation effort
 * - Dependencies between fixes
 */

const fs = require('fs');
const path = require('path');

class NextStepsAdvisor {
  constructor() {
    this.categories = {
      REVENUE: { icon: '💰', priority: 1, label: 'Revenue Impact' },
      SECURITY: { icon: '🔒', priority: 2, label: 'Security' },
      CONVERSION: { icon: '📈', priority: 3, label: 'Conversion' },
      ACCESSIBILITY: { icon: '♿', priority: 4, label: 'Accessibility' },
      PERFORMANCE: { icon: '⚡', priority: 5, label: 'Performance' },
      UX: { icon: '🎨', priority: 6, label: 'User Experience' },
      SEO: { icon: '🔍', priority: 7, label: 'SEO' },
      CODE_QUALITY: { icon: '🧹', priority: 8, label: 'Code Quality' },
      CONTENT: { icon: '📝', priority: 9, label: 'Content' },
      TECH_DEBT: { icon: '🔧', priority: 10, label: 'Technical Debt' }
    };
    
    this.enhancementRules = this.buildEnhancementRules();
  }

  /**
   * Build comprehensive enhancement rules
   */
  buildEnhancementRules() {
    return [
      // Revenue & Conversion Critical
      {
        id: 'checkout-flow',
        category: 'REVENUE',
        title: 'Checkout Flow Optimization',
        description: 'Streamline checkout to reduce cart abandonment',
        effort: 'medium',
        impact: 'high',
        detectFn: (ctx) => this.checkCheckoutIssues(ctx),
        steps: [
          'Audit checkout funnel for drop-off points',
          'Add progress indicators to checkout',
          'Implement guest checkout option',
          'Add trust badges near payment',
          'Optimize mobile checkout UX'
        ]
      },
      {
        id: 'payment-trust',
        category: 'REVENUE',
        title: 'Payment Trust Signals',
        description: 'Add security badges and trust indicators',
        effort: 'low',
        impact: 'high',
        detectFn: (ctx) => !ctx.hasTrustBadges,
        steps: [
          'Add SSL/secure payment badges',
          'Display accepted payment methods',
          'Add money-back guarantee badge',
          'Show customer testimonials near checkout'
        ]
      },
      {
        id: 'cart-abandonment',
        category: 'CONVERSION',
        title: 'Cart Abandonment Recovery',
        description: 'Implement cart recovery strategies',
        effort: 'medium',
        impact: 'high',
        detectFn: (ctx) => !ctx.hasCartRecovery,
        steps: [
          'Add exit-intent popup with discount',
          'Implement email cart reminders',
          'Add "save for later" functionality',
          'Show recently viewed items'
        ]
      },

      // Security
      {
        id: 'security-headers',
        category: 'SECURITY',
        title: 'Security Headers',
        description: 'Implement proper security headers',
        effort: 'low',
        impact: 'high',
        detectFn: (ctx) => ctx.missingSecurityHeaders,
        steps: [
          'Add Content-Security-Policy header',
          'Enable Strict-Transport-Security',
          'Add X-Frame-Options header',
          'Configure X-Content-Type-Options'
        ]
      },
      {
        id: 'input-validation',
        category: 'SECURITY',
        title: 'Input Validation',
        description: 'Strengthen form input validation',
        effort: 'medium',
        impact: 'high',
        detectFn: (ctx) => ctx.issues?.some(i => i.type?.includes('validation')),
        steps: [
          'Add server-side validation for all forms',
          'Implement CSRF protection',
          'Sanitize all user inputs',
          'Add rate limiting to forms'
        ]
      },

      // Accessibility
      {
        id: 'button-accessibility',
        category: 'ACCESSIBILITY',
        title: 'Button Accessibility',
        description: 'Fix button type attributes and tap targets',
        effort: 'low',
        impact: 'medium',
        detectFn: (ctx) => ctx.issues?.some(i => i.type === 'missing-button-type'),
        steps: [
          'Add type="button" to all non-submit buttons',
          'Ensure 44x44px minimum tap targets',
          'Add focus indicators',
          'Test keyboard navigation'
        ]
      },
      {
        id: 'text-readability',
        category: 'ACCESSIBILITY',
        title: 'Text Readability',
        description: 'Improve text size and contrast',
        effort: 'low',
        impact: 'medium',
        detectFn: (ctx) => ctx.issues?.some(i => i.type === 'small-text'),
        steps: [
          'Replace text-xs with text-sm minimum',
          'Check color contrast ratios (4.5:1)',
          'Ensure proper line height',
          'Add dark mode support'
        ]
      },
      {
        id: 'form-labels',
        category: 'ACCESSIBILITY',
        title: 'Form Labels & ARIA',
        description: 'Add proper labels to all form inputs',
        effort: 'low',
        impact: 'medium',
        detectFn: (ctx) => ctx.issues?.some(i => i.type === 'missing-label'),
        steps: [
          'Add visible labels or aria-label to inputs',
          'Add error descriptions with aria-describedby',
          'Ensure form error messages are announced',
          'Add required field indicators'
        ]
      },

      // Performance
      {
        id: 'image-optimization',
        category: 'PERFORMANCE',
        title: 'Image Optimization',
        description: 'Optimize images for faster loading',
        effort: 'medium',
        impact: 'high',
        detectFn: (ctx) => this.checkImageOptimization(ctx),
        steps: [
          'Convert images to WebP/AVIF formats',
          'Implement responsive images with srcset',
          'Add lazy loading to below-fold images',
          'Optimize hero images for LCP'
        ]
      },
      {
        id: 'bundle-optimization',
        category: 'PERFORMANCE',
        title: 'Bundle Size Optimization',
        description: 'Reduce JavaScript bundle size',
        effort: 'medium',
        impact: 'medium',
        detectFn: (ctx) => this.checkBundleSize(ctx),
        steps: [
          'Analyze bundle with @next/bundle-analyzer',
          'Code-split heavy components',
          'Remove unused dependencies',
          'Implement dynamic imports'
        ]
      },
      {
        id: 'core-web-vitals',
        category: 'PERFORMANCE',
        title: 'Core Web Vitals',
        description: 'Improve LCP, FID, and CLS scores',
        effort: 'medium',
        impact: 'high',
        detectFn: (ctx) => true, // Always relevant
        steps: [
          'Optimize Largest Contentful Paint (LCP < 2.5s)',
          'Reduce First Input Delay (FID < 100ms)',
          'Minimize Cumulative Layout Shift (CLS < 0.1)',
          'Add size attributes to images/iframes',
          'Preload critical fonts'
        ]
      },

      // UX Improvements
      {
        id: 'mobile-ux',
        category: 'UX',
        title: 'Mobile Experience',
        description: 'Enhance mobile shopping experience',
        effort: 'medium',
        impact: 'high',
        detectFn: (ctx) => this.checkMobileUX(ctx),
        steps: [
          'Implement sticky add-to-cart on mobile',
          'Improve mobile navigation (hamburger menu)',
          'Add swipe gestures for product images',
          'Optimize form inputs for mobile keyboards'
        ]
      },
      {
        id: 'search-experience',
        category: 'UX',
        title: 'Search & Filter',
        description: 'Improve product discovery',
        effort: 'medium',
        impact: 'high',
        detectFn: (ctx) => this.checkSearchExperience(ctx),
        steps: [
          'Add autocomplete to search',
          'Implement search suggestions',
          'Add filtering by price/category',
          'Show "no results" helpful suggestions'
        ]
      },
      {
        id: 'loading-states',
        category: 'UX',
        title: 'Loading States',
        description: 'Add skeleton loaders and transitions',
        effort: 'low',
        impact: 'medium',
        detectFn: (ctx) => !ctx.hasSkeletonLoaders,
        steps: [
          'Add skeleton loaders for product grids',
          'Implement smooth page transitions',
          'Add loading spinners for actions',
          'Show optimistic UI updates'
        ]
      },

      // SEO
      {
        id: 'structured-data',
        category: 'SEO',
        title: 'Structured Data Enhancement',
        description: 'Add rich snippets for better search visibility',
        effort: 'low',
        impact: 'medium',
        detectFn: (ctx) => this.checkStructuredData(ctx),
        steps: [
          'Add Product schema to all products',
          'Implement BreadcrumbList schema',
          'Add Review/Rating schema',
          'Add FAQ schema to relevant pages'
        ]
      },
      {
        id: 'meta-optimization',
        category: 'SEO',
        title: 'Meta Tag Optimization',
        description: 'Optimize meta titles and descriptions',
        effort: 'low',
        impact: 'medium',
        detectFn: (ctx) => true,
        steps: [
          'Add unique meta titles (50-60 chars)',
          'Write compelling meta descriptions (150-160 chars)',
          'Add Open Graph tags for social sharing',
          'Implement canonical URLs'
        ]
      },

      // Code Quality
      {
        id: 'logging-cleanup',
        category: 'CODE_QUALITY',
        title: 'Production Logging',
        description: 'Clean up console logs for production',
        effort: 'low',
        impact: 'low',
        detectFn: (ctx) => ctx.issues?.some(i => i.type === 'unguarded-console-log'),
        steps: [
          'Wrap console.log with NODE_ENV check',
          'Add stack traces to error logs',
          'Implement structured logging',
          'Run: node scripts/fix-vorax-console-logs.js'
        ]
      },
      {
        id: 'typescript-strict',
        category: 'CODE_QUALITY',
        title: 'TypeScript Strictness',
        description: 'Fix TypeScript errors and improve typing',
        effort: 'medium',
        impact: 'medium',
        detectFn: (ctx) => ctx.issues?.some(i => i.type?.includes('typescript') || i.type?.includes('type-')),
        steps: [
          'Fix component prop type mismatches',
          'Replace any assertions with proper types',
          'Enable stricter tsconfig options',
          'Add missing type definitions'
        ]
      },

      // Content
      {
        id: 'content-trust',
        category: 'CONTENT',
        title: 'Trust-Building Content',
        description: 'Add content that builds customer trust',
        effort: 'medium',
        impact: 'high',
        detectFn: (ctx) => this.checkTrustContent(ctx),
        steps: [
          'Add customer reviews/testimonials',
          'Create About Us story page',
          'Add shipping/returns policy page',
          'Display contact information prominently'
        ]
      },
      {
        id: 'urgency-balance',
        category: 'CONTENT',
        title: 'Marketing Message Balance',
        description: 'Reduce urgency/scarcity overload',
        effort: 'low',
        impact: 'medium',
        detectFn: (ctx) => ctx.issues?.some(i => i.type === 'urgency-overload' || i.type === 'false-scarcity'),
        steps: [
          'Audit urgency claims for authenticity',
          'Remove false scarcity indicators',
          'Use social proof instead of pressure',
          'A/B test messaging approaches'
        ]
      },

      // Phase 2: Advanced Enhancements
      {
        id: 'email-marketing',
        category: 'CONVERSION',
        title: 'Email Marketing Integration',
        description: 'Build email list and automated sequences',
        effort: 'medium',
        impact: 'high',
        detectFn: (ctx) => !ctx.hasEmailCapture,
        steps: [
          'Add newsletter signup popup/form',
          'Create welcome email sequence',
          'Set up abandoned cart email reminder',
          'Implement post-purchase follow-up emails'
        ]
      },
      {
        id: 'product-reviews',
        category: 'CONVERSION',
        title: 'Customer Reviews System',
        description: 'Collect and display product reviews',
        effort: 'medium',
        impact: 'high',
        detectFn: (ctx) => !ctx.hasReviewSystem,
        steps: [
          'Add review submission form to product pages',
          'Display star ratings and reviews',
          'Send review request emails after purchase',
          'Add review moderation dashboard'
        ]
      },
      {
        id: 'wishlist',
        category: 'UX',
        title: 'Wishlist/Favorites Feature',
        description: 'Allow customers to save products for later',
        effort: 'medium',
        impact: 'medium',
        detectFn: (ctx) => !ctx.hasWishlist,
        steps: [
          'Add heart/save button to product cards',
          'Create wishlist page for logged-in users',
          'Sync wishlist across devices',
          'Send wishlist reminder emails'
        ]
      },
      {
        id: 'product-bundles',
        category: 'REVENUE',
        title: 'Product Bundles & Upsells',
        description: 'Increase average order value with bundles',
        effort: 'medium',
        impact: 'high',
        detectFn: (ctx) => !ctx.hasProductBundles,
        steps: [
          'Create popular product bundles',
          'Add "Frequently bought together" section',
          'Implement upsell/cross-sell recommendations',
          'Offer bundle discounts'
        ]
      },
      {
        id: 'loyalty-program',
        category: 'REVENUE',
        title: 'Loyalty/Rewards Program',
        description: 'Encourage repeat purchases with rewards',
        effort: 'high',
        impact: 'high',
        detectFn: (ctx) => !ctx.hasLoyaltyProgram,
        steps: [
          'Design points-based reward system',
          'Create rewards dashboard for customers',
          'Implement referral bonuses',
          'Add VIP tiers with exclusive benefits'
        ]
      },
      {
        id: 'live-chat',
        category: 'UX',
        title: 'Live Chat Support',
        description: 'Provide real-time customer assistance',
        effort: 'low',
        impact: 'medium',
        detectFn: (ctx) => !ctx.hasLiveChat,
        steps: [
          'Integrate chat widget (Crisp, Intercom, etc.)',
          'Set up chatbot for common questions',
          'Define chat business hours',
          'Train support team on product knowledge'
        ]
      },
      {
        id: 'analytics-enhanced',
        category: 'TECH_DEBT',
        title: 'Enhanced Analytics',
        description: 'Track user behavior and conversion funnels',
        effort: 'medium',
        impact: 'medium',
        detectFn: (ctx) => !ctx.hasEnhancedAnalytics,
        steps: [
          'Set up GA4 e-commerce tracking',
          'Implement conversion funnel analysis',
          'Add heatmap tracking (Hotjar/FullStory)',
          'Create custom dashboards for KPIs'
        ]
      },
      {
        id: 'a11y-audit',
        category: 'ACCESSIBILITY',
        title: 'Accessibility Audit',
        description: 'Ensure WCAG 2.1 AA compliance',
        effort: 'medium',
        impact: 'medium',
        detectFn: (ctx) => !ctx.hasA11yEnhancements,
        steps: [
          'Run automated accessibility tests',
          'Test with screen readers (NVDA, VoiceOver)',
          'Ensure keyboard navigation works',
          'Add skip links and ARIA landmarks'
        ]
      },
      {
        id: 'internationalization',
        category: 'TECH_DEBT',
        title: 'Internationalization (i18n)',
        description: 'Prepare for multi-language support',
        effort: 'high',
        impact: 'medium',
        detectFn: (ctx) => !ctx.hasI18n,
        steps: [
          'Extract hardcoded strings to translation files',
          'Set up next-intl or similar i18n library',
          'Add language switcher',
          'Consider currency localization'
        ]
      },
      {
        id: 'pwa-features',
        category: 'PERFORMANCE',
        title: 'Progressive Web App Features',
        description: 'Improve mobile experience with PWA',
        effort: 'medium',
        impact: 'medium',
        detectFn: (ctx) => !ctx.hasPWA,
        steps: [
          'Add app manifest for home screen install',
          'Implement offline support with service worker',
          'Add push notifications for orders',
          'Optimize for mobile-first experience'
        ]
      }
    ];
  }

  /**
   * Analyze site and get prioritized recommendations
   */
  async analyze() {
    console.log('\n🧠 VORAX NextSteps Advisor analyzing...\n');
    
    const context = await this.gatherContext();
    const recommendations = [];
    const implemented = [];

    for (const rule of this.enhancementRules) {
      try {
        // Check if already implemented
        if (context.implementedRecommendations.includes(rule.id)) {
          implemented.push({
            ...rule,
            categoryInfo: this.categories[rule.category],
            status: 'implemented'
          });
          continue;
        }

        const isRelevant = typeof rule.detectFn === 'function' 
          ? rule.detectFn(context) 
          : true;
        
        if (isRelevant) {
          recommendations.push({
            ...rule,
            categoryInfo: this.categories[rule.category],
            score: this.calculateScore(rule, context)
          });
        }
      } catch (err) {
        // Silently skip rules that error
      }
    }

    // Sort by score (higher = more important)
    recommendations.sort((a, b) => b.score - a.score);

    // Show progress on implemented recommendations
    if (implemented.length > 0) {
      console.log(`✅ ${implemented.length} recommendation(s) already implemented:`);
      for (const impl of implemented) {
        console.log(`   • ${impl.categoryInfo.icon} ${impl.title}`);
      }
      console.log('');
    }

    return {
      context,
      recommendations,
      implemented,
      summary: this.generateSummary(recommendations),
      topPicks: recommendations.slice(0, 5),
      progress: {
        implemented: implemented.length,
        remaining: recommendations.length,
        total: implemented.length + recommendations.length,
        percentComplete: Math.round((implemented.length / (implemented.length + recommendations.length)) * 100)
      }
    };
  }

  /**
   * Gather context about the site
   */
  async gatherContext() {
    const context = {
      issues: [],
      hasCheckout: false,
      hasTrustBadges: false,
      hasCartRecovery: false,
      hasSkeletonLoaders: false,
      hasExitIntent: false,
      hasSearchAutocomplete: false,
      hasOptimizedImages: false,
      hasStructuredData: false,
      hasMetaTags: false,
      hasTestimonials: false,
      hasAboutPage: false,
      hasPoliciesPage: false,
      hasEmailCapture: false,
      hasReviewSystem: false,
      hasWishlist: false,
      hasProductBundles: false,
      hasLoyaltyProgram: false,
      hasLiveChat: false,
      hasEnhancedAnalytics: false,
      hasI18n: false,
      hasPWA: false,
      hasA11yEnhancements: false,
      missingSecurityHeaders: false,
      implementedRecommendations: []
    };

    // Load latest VORAX report
    const reportPath = path.join(process.cwd(), '.vorax/reports/latest.json');
    if (fs.existsSync(reportPath)) {
      try {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        context.issues = report.issues || [];
        context.summary = report.summary;
      } catch (err) {
        // Continue without report
      }
    }

    // Check for key files/features - expanded detection
    const checks = [
      { file: 'app/checkout', key: 'hasCheckout' },
      { file: 'components/ui/skeleton', key: 'hasSkeletonLoaders' },
      { file: 'components/TrustBadge', key: 'hasTrustBadges' },
      { file: 'components/trust', key: 'hasTrustBadges' },
      { file: 'components/PaymentTrustBadges', key: 'hasTrustBadges' },
      { file: 'components/ExitIntentPopup', key: 'hasExitIntent' },
      { file: 'components/cart/ExitIntentPopup', key: 'hasExitIntent' },
      { file: 'components/SearchAutocomplete', key: 'hasSearchAutocomplete' },
      { file: 'components/search/SearchAutocomplete', key: 'hasSearchAutocomplete' },
      { file: 'components/OptimizedImage', key: 'hasOptimizedImages' },
      { file: 'components/ui/OptimizedImage', key: 'hasOptimizedImages' },
      { file: 'lib/seo/structured-data', key: 'hasStructuredData' },
      { file: 'lib/seo/metadata', key: 'hasMetaTags' },
      { file: 'lib/seo/meta-tags', key: 'hasMetaTags' },
      { file: 'components/Testimonials', key: 'hasTestimonials' },
      { file: 'components/trust/Testimonials', key: 'hasTestimonials' },
      { file: 'components/TestimonialCarousel', key: 'hasTestimonials' },
      { file: 'app/about/page', key: 'hasAboutPage' },
      { file: 'app/(site)/about/page', key: 'hasAboutPage' },
      { file: 'app/(site)/policies', key: 'hasPoliciesPage' },
      { file: 'app/policies', key: 'hasPoliciesPage' },
      // Phase 2 feature detection
      { file: 'components/NewsletterSignup', key: 'hasEmailCapture' },
      { file: 'components/EmailCapture', key: 'hasEmailCapture' },
      { file: 'components/ReviewForm', key: 'hasReviewSystem' },
      { file: 'components/ProductReviews', key: 'hasReviewSystem' },
      { file: 'app/api/reviews', key: 'hasReviewSystem' },
      // Wishlist detection
      { file: 'components/Wishlist', key: 'hasWishlist' },
      { file: 'components/WishlistButton', key: 'hasWishlist' },
      { file: 'stores/wishlist', key: 'hasWishlist' },
      { file: 'app/wishlist', key: 'hasWishlist' },
      { file: 'app/(site)/wishlist', key: 'hasWishlist' },
      // Product bundles detection
      { file: 'components/ProductBundle', key: 'hasProductBundles' },
      { file: 'components/ProductBundles', key: 'hasProductBundles' },
      { file: 'components/FrequentlyBoughtTogether', key: 'hasProductBundles' },
      { file: 'lib/bundles', key: 'hasProductBundles' },
      // Loyalty/Rewards detection
      { file: 'app/(site)/rewards', key: 'hasLoyaltyProgram' },
      { file: 'app/rewards', key: 'hasLoyaltyProgram' },
      { file: 'stores/rewards', key: 'hasLoyaltyProgram' },
      { file: 'components/LoyaltyPoints', key: 'hasLoyaltyProgram' },
      { file: 'components/RewardsBadge', key: 'hasLoyaltyProgram' },
      { file: 'components/ReferralWidget', key: 'hasLoyaltyProgram' },
      // Live chat detection
      { file: 'components/ChatWidget', key: 'hasLiveChat' },
      { file: 'components/LiveChatWidget', key: 'hasLiveChat' },
      // Analytics detection
      { file: 'lib/analytics/enhanced', key: 'hasEnhancedAnalytics' },
      { file: 'lib/ga4-analytics', key: 'hasEnhancedAnalytics' },
      { file: 'hooks/useAnalytics', key: 'hasEnhancedAnalytics' },
      { file: 'components/analytics/GoogleAnalytics', key: 'hasEnhancedAnalytics' },
      // i18n detection
      { file: 'lib/i18n', key: 'hasI18n' },
      { file: 'lib/i18n/index', key: 'hasI18n' },
      { file: 'contexts/LocaleContext', key: 'hasI18n' },
      { file: 'components/LanguageSwitcher', key: 'hasI18n' },
      { file: 'messages', key: 'hasI18n' },
      // Accessibility detection
      { file: 'components/SkipLinks', key: 'hasA11yEnhancements' },
      { file: 'components/ui/a11y-announcer', key: 'hasA11yEnhancements' },
      // PWA detection
      { file: 'public/manifest.json', key: 'hasPWA' },
      { file: 'public/sw.js', key: 'hasPWA' }
    ];

    for (const check of checks) {
      const fullPath = path.join(process.cwd(), check.file);
      const extensions = ['', '.js', '.jsx', '.ts', '.tsx'];
      for (const ext of extensions) {
        if (fs.existsSync(fullPath + ext)) {
          context[check.key] = true;
          break;
        }
      }
    }

    // Check middleware for security headers
    const middlewarePath = path.join(process.cwd(), 'middleware.ts');
    if (fs.existsSync(middlewarePath)) {
      const content = fs.readFileSync(middlewarePath, 'utf-8');
      context.missingSecurityHeaders = !content.includes('Content-Security-Policy');
    }

    // Track which recommendations have been implemented
    if (context.hasTrustBadges) context.implementedRecommendations.push('payment-trust');
    if (context.hasExitIntent) context.implementedRecommendations.push('cart-abandonment');
    if (context.hasSearchAutocomplete) context.implementedRecommendations.push('search-experience');
    if (context.hasSkeletonLoaders) context.implementedRecommendations.push('loading-states');
    if (!context.missingSecurityHeaders) context.implementedRecommendations.push('security-headers');
    if (context.hasStructuredData) context.implementedRecommendations.push('structured-data');
    if (context.hasMetaTags) context.implementedRecommendations.push('meta-optimization');
    if (context.hasTestimonials && context.hasAboutPage) context.implementedRecommendations.push('content-trust');
    if (context.hasOptimizedImages) context.implementedRecommendations.push('core-web-vitals');
    // Phase 2 implementations
    if (context.hasReviewSystem) context.implementedRecommendations.push('product-reviews');
    if (context.hasWishlist) context.implementedRecommendations.push('wishlist');
    if (context.hasProductBundles) context.implementedRecommendations.push('product-bundles');
    if (context.hasLoyaltyProgram) context.implementedRecommendations.push('loyalty-program');
    if (context.hasEmailCapture) context.implementedRecommendations.push('email-marketing');
    if (context.hasLiveChat) context.implementedRecommendations.push('live-chat');
    if (context.hasEnhancedAnalytics) context.implementedRecommendations.push('analytics-enhanced');
    if (context.hasI18n) context.implementedRecommendations.push('internationalization');
    if (context.hasPWA) context.implementedRecommendations.push('pwa-features');
    if (context.hasA11yEnhancements) context.implementedRecommendations.push('a11y-audit');

    return context;
  }

  /**
   * Calculate priority score for a recommendation
   */
  calculateScore(rule, context) {
    let score = 0;
    
    // Category priority (lower = higher priority)
    const categoryPriority = this.categories[rule.category].priority;
    score += (11 - categoryPriority) * 10;
    
    // Impact multiplier
    const impactScores = { high: 30, medium: 20, low: 10 };
    score += impactScores[rule.impact] || 10;
    
    // Effort inverse (lower effort = higher score)
    const effortScores = { low: 20, medium: 10, high: 5 };
    score += effortScores[rule.effort] || 10;
    
    // Boost if there are related issues in the scan
    const relatedIssues = context.issues?.filter(i => 
      i.type?.toLowerCase().includes(rule.id.split('-')[0]) ||
      rule.id.includes(i.type?.split('-')[0] || '')
    ).length || 0;
    score += relatedIssues * 5;

    return score;
  }

  /**
   * Generate summary of recommendations
   */
  generateSummary(recommendations) {
    const byCategory = {};
    for (const rec of recommendations) {
      if (!byCategory[rec.category]) {
        byCategory[rec.category] = [];
      }
      byCategory[rec.category].push(rec);
    }

    return {
      total: recommendations.length,
      byCategory,
      highImpact: recommendations.filter(r => r.impact === 'high').length,
      quickWins: recommendations.filter(r => r.effort === 'low' && r.impact === 'high').length
    };
  }

  /**
   * Format recommendations for CLI output
   */
  formatForCLI(analysis) {
    const { recommendations, summary, topPicks, context, implemented, progress } = analysis;
    
    let output = '\n' + '═'.repeat(60) + '\n';
    output += '🎯 VORAX NextSteps - Best Enhancement Recommendations\n';
    output += '═'.repeat(60) + '\n\n';

    // Progress bar
    if (progress && progress.total > 0) {
      const barLength = 30;
      const filledLength = Math.round(barLength * progress.percentComplete / 100);
      const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
      output += `📈 PROGRESS: [${bar}] ${progress.percentComplete}%\n`;
      output += `   ✅ Implemented: ${progress.implemented} | 📋 Remaining: ${progress.remaining}\n\n`;
    }

    // Summary stats
    output += `📊 Analysis Summary:\n`;
    output += `   Total recommendations: ${summary.total}\n`;
    output += `   High impact items: ${summary.highImpact}\n`;
    output += `   Quick wins: ${summary.quickWins}\n`;
    if (context.summary) {
      output += `   Open issues: ${context.issues.length} (${context.summary.high || 0} high priority)\n`;
    }
    output += '\n';

    // Show implemented items
    if (implemented && implemented.length > 0) {
      output += '✅ ALREADY IMPLEMENTED:\n';
      output += '─'.repeat(60) + '\n';
      for (const impl of implemented) {
        output += `   ${impl.categoryInfo.icon} ${impl.title}\n`;
      }
      output += '\n';
    }

    // Top 5 Picks
    output += '🏆 TOP 5 NEXT STEPS:\n';
    output += '─'.repeat(60) + '\n\n';

    for (let i = 0; i < topPicks.length; i++) {
      const rec = topPicks[i];
      const cat = this.categories[rec.category];
      
      output += `${i + 1}. ${cat.icon} ${rec.title}\n`;
      output += `   Category: ${cat.label} | Impact: ${rec.impact.toUpperCase()} | Effort: ${rec.effort}\n`;
      output += `   ${rec.description}\n`;
      output += `   Steps:\n`;
      for (const step of rec.steps.slice(0, 3)) {
        output += `     • ${step}\n`;
      }
      if (rec.steps.length > 3) {
        output += `     ... and ${rec.steps.length - 3} more\n`;
      }
      output += '\n';
    }

    // Quick Wins Section
    const quickWins = recommendations.filter(r => r.effort === 'low' && r.impact === 'high');
    if (quickWins.length > 0) {
      output += '⚡ QUICK WINS (High Impact, Low Effort):\n';
      output += '─'.repeat(60) + '\n';
      for (const win of quickWins.slice(0, 3)) {
        const cat = this.categories[win.category];
        output += `   ${cat.icon} ${win.title}\n`;
      }
      output += '\n';
    }

    // By Category Summary
    output += '📂 BY CATEGORY:\n';
    output += '─'.repeat(60) + '\n';
    for (const [categoryKey, items] of Object.entries(summary.byCategory)) {
      const cat = this.categories[categoryKey];
      output += `   ${cat.icon} ${cat.label}: ${items.length} recommendations\n`;
    }
    output += '\n';

    // Commands to run
    output += '💻 COMMANDS TO GET STARTED:\n';
    output += '─'.repeat(60) + '\n';
    output += '   npm run vorax next detail         # Show full details\n';
    output += '   npm run vorax next category SEO   # Filter by category\n';
    output += '   npm run vorax hunt                # Run full scan first\n';
    output += '\n';

    return output;
  }

  /**
   * Format detailed recommendation
   */
  formatDetailedRecommendation(rec) {
    const cat = this.categories[rec.category];
    let output = '\n' + '─'.repeat(50) + '\n';
    output += `${cat.icon} ${rec.title}\n`;
    output += '─'.repeat(50) + '\n';
    output += `ID: ${rec.id}\n`;
    output += `Category: ${cat.label}\n`;
    output += `Impact: ${rec.impact.toUpperCase()}\n`;
    output += `Effort: ${rec.effort}\n`;
    output += `Score: ${rec.score}\n\n`;
    output += `Description:\n  ${rec.description}\n\n`;
    output += `Implementation Steps:\n`;
    for (let i = 0; i < rec.steps.length; i++) {
      output += `  ${i + 1}. ${rec.steps[i]}\n`;
    }
    return output;
  }

  // Detection helper methods
  checkCheckoutIssues(ctx) {
    return ctx.hasCheckout && (
      ctx.issues?.some(i => i.file?.includes('checkout')) ||
      ctx.issues?.some(i => i.type?.includes('form'))
    );
  }

  checkImageOptimization(ctx) {
    return ctx.issues?.some(i => 
      i.type?.includes('image') || 
      i.description?.includes('image')
    );
  }

  checkBundleSize(ctx) {
    // Check if there are performance issues
    return ctx.issues?.some(i => 
      i.agent === 'opti-beast' || 
      i.type?.includes('bundle')
    );
  }

  checkMobileUX(ctx) {
    return ctx.issues?.some(i => 
      i.type === 'small-tap-target' || 
      i.description?.toLowerCase().includes('mobile')
    );
  }

  checkSearchExperience(ctx) {
    const searchPath = path.join(process.cwd(), 'app/search');
    return !fs.existsSync(searchPath);
  }

  checkStructuredData(ctx) {
    // Could be enhanced with actual structured data detection
    return true;
  }

  checkTrustContent(ctx) {
    const aboutPath = path.join(process.cwd(), 'app/about');
    const policyPath = path.join(process.cwd(), 'app/policies');
    return !fs.existsSync(aboutPath) || !fs.existsSync(policyPath);
  }
}

module.exports = NextStepsAdvisor;
