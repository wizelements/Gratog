
const DEBUG = process.env.DEBUG === "true";
const debug = (...args) => { if (DEBUG) console.log(...args); };

import { Product, ProductZ } from '@/types/product';
import { upsertProduct } from './database';
import { createHash } from 'crypto';

// Rate limiting and circuit breaker state
interface CrawlState {
  lastRequest: number;
  requestCount: number;
  circuitOpen: boolean;
  failures: number;
}

const crawlState: Map<string, CrawlState> = new Map();

// Configuration
const CRAWL_CONFIG = {
  rps: parseInt(process.env.CRAWL_RPS || '2'),
  burst: parseInt(process.env.CRAWL_BURST || '5'),
  politenessMinMs: parseInt(process.env.POLITENESS_MIN_MS || '500'),
  politenessMaxMs: parseInt(process.env.POLITENESS_MAX_MS || '1500'),
  timeout: 30000,
  maxRetries: 3,
  circuitBreakerThreshold: 5,
  userAgent: 'TasteOfGratitude-Bot/1.0 (+https://tasteofgratitude.com/bot)'
};

// Rate limiter
async function rateLimit(host: string): Promise<void> {
  const state = crawlState.get(host) || {
    lastRequest: 0,
    requestCount: 0,
    circuitOpen: false,
    failures: 0
  };
  
  const now = Date.now();
  const timeSinceLastRequest = now - state.lastRequest;
  
  // Circuit breaker check
  if (state.circuitOpen) {
    if (timeSinceLastRequest > 300000) { // 5 minutes
      state.circuitOpen = false;
      state.failures = 0;
      debug(`Circuit breaker closed for ${host}`);
    } else {
      throw new Error(`Circuit breaker open for ${host}`);
    }
  }
  
  // Rate limiting
  if (timeSinceLastRequest < 60000) { // 1 minute window
    if (state.requestCount >= CRAWL_CONFIG.burst) {
      const waitTime = Math.max(1000 / CRAWL_CONFIG.rps, CRAWL_CONFIG.politenessMinMs);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  } else {
    state.requestCount = 0;
  }
  
  // Politeness delay with jitter
  const jitter = Math.random() * (CRAWL_CONFIG.politenessMaxMs - CRAWL_CONFIG.politenessMinMs) + CRAWL_CONFIG.politenessMinMs;
  if (timeSinceLastRequest < jitter) {
    await new Promise(resolve => setTimeout(resolve, jitter - timeSinceLastRequest));
  }
  
  state.lastRequest = Date.now();
  state.requestCount++;
  crawlState.set(host, state);
}

// Fetch with retries and error handling
async function fetchWithRetries(url: string, options: RequestInit = {}): Promise<Response> {
  const host = new URL(url).hostname;
  
  await rateLimit(host);
  
  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'User-Agent': CRAWL_CONFIG.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      ...options.headers
    },
    signal: AbortSignal.timeout(CRAWL_CONFIG.timeout)
  };
  
  for (let attempt = 1; attempt <= CRAWL_CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      
      if (response.ok) {
        const state = crawlState.get(host);
        if (state) {
          state.failures = 0;
          crawlState.set(host, state);
        }
        return response;
      }
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        debug(`Rate limited on ${url}, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (response.status >= 500 && attempt < CRAWL_CONFIG.maxRetries) {
        const backoffTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        debug(`Server error ${response.status} on ${url}, retrying in ${backoffTime}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        continue;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed for ${url}:`, error);
      
      if (attempt === CRAWL_CONFIG.maxRetries) {
        // Circuit breaker logic
        const state = crawlState.get(host) || { lastRequest: 0, requestCount: 0, circuitOpen: false, failures: 0 };
        state.failures++;
        
        if (state.failures >= CRAWL_CONFIG.circuitBreakerThreshold) {
          state.circuitOpen = true;
          debug(`Circuit breaker opened for ${host} after ${state.failures} failures`);
        }
        
        crawlState.set(host, state);
        throw error;
      }
      
      // Exponential backoff with jitter
      const backoffTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
  
  throw new Error(`Max retries exceeded for ${url}`);
}

// HTML parser for product data
class ProductParser {
  private html: string;
  private url: string;
  
  constructor(html: string, url: string) {
    this.html = html;
    this.url = url;
  }
  
  // Extract JSON-LD structured data
  private extractJsonLD(): any[] {
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const matches = [];
    let match;
    
    while ((match = jsonLdRegex.exec(this.html)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);
        matches.push(jsonData);
      } catch (e) {
        console.warn('Failed to parse JSON-LD:', e);
      }
    }
    
    return matches;
  }
  
  // Extract embedded state/product data
  private extractEmbeddedJSON(): any {
    const patterns = [
      /window\.__STATE__\s*=\s*({[\s\S]*?});/,
      /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/,
      /window\.productData\s*=\s*({[\s\S]*?});/,
      /__NEXT_DATA__\s*=\s*({[\s\S]*?});/
    ];
    
    for (const pattern of patterns) {
      const match = this.html.match(pattern);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch (e) {
          console.warn('Failed to parse embedded JSON:', e);
        }
      }
    }
    
    return null;
  }
  
  // DOM selector fallbacks
  private extractFromDOM(): Partial<Product> {
    // This is a simplified version - in production you'd use a proper HTML parser like jsdom
    const product: Partial<Product> = {};
    
    // Title extraction
    const titleMatch = this.html.match(/<h1[^>]*>([^<]+)<\/h1>/) || 
                      this.html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      product.title = titleMatch[1].trim();
    }
    
    // Price extraction
    const priceMatch = this.html.match(/\$([0-9]+(?:\.[0-9]{2})?)/) ||
                      this.html.match(/price["']?:\s*["']?\$?([0-9]+(?:\.[0-9]{2})?)/i);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1]);
      product.variants = [{
        sku: 'default',
        options: {},
        price_cents: Math.round(price * 100),
        currency: 'USD',
        availability: 'unknown' as const
      }];
    }
    
    // Image extraction
    const imageMatches = this.html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/g);
    if (imageMatches) {
      product.images = imageMatches
        .map((img, index) => {
          const srcMatch = img.match(/src=["']([^"']+)["']/);
          const altMatch = img.match(/alt=["']([^"']*)["']/);
          
          if (srcMatch) {
            let url = srcMatch[1];
            // Convert relative URLs to absolute
            if (url.startsWith('/')) {
              const baseUrl = new URL(this.url);
              url = `${baseUrl.protocol}//${baseUrl.host}${url}`;
            }
            
            return {
              url,
              alt: altMatch?.[1] || '',
              position: index + 1
            };
          }
          return null;
        })
        .filter((img): img is { url: string; alt: string; position: number } => img !== null);
    }
    
    // Description extraction
    const descMatch = this.html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                     this.html.match(/<p[^>]*class=["'][^"']*description[^"']*["'][^>]*>([^<]+)<\/p>/i);
    if (descMatch) {
      product.description = descMatch[1].trim();
    }
    
    return product;
  }
  
  // Main parsing method
  parse(): Product | null {
    try {
      // 1. Try JSON-LD first (most reliable)
      const jsonLdData = this.extractJsonLD();
      for (const data of jsonLdData) {
        if (data['@type'] === 'Product' || (Array.isArray(data) && data.some(item => item['@type'] === 'Product'))) {
          const productData = Array.isArray(data) ? data.find(item => item['@type'] === 'Product') : data;
          
          if (productData) {
            return this.parseJsonLDProduct(productData);
          }
        }
      }
      
      // 2. Try embedded JSON
      const embeddedData = this.extractEmbeddedJSON();
      if (embeddedData) {
        const product = this.parseEmbeddedProduct(embeddedData);
        if (product) return product;
      }
      
      // 3. Fallback to DOM parsing
      const domProduct = this.extractFromDOM();
      if (domProduct.title && domProduct.variants?.length) {
        const slug = this.generateSlug(domProduct.title, this.url);
        
        return {
          slug,
          title: domProduct.title,
          description: domProduct.description || '',
          brand: domProduct.brand,
          category: domProduct.category,
          images: domProduct.images || [],
          variants: domProduct.variants,
          source_url: this.url,
          handle: slug,
          active: true
        };
      }
      
      return null;
      
    } catch (error) {
      console.error(`Parse error for ${this.url}:`, error);
      return null;
    }
  }
  
  private parseJsonLDProduct(data: any): Product | null {
    try {
      const slug = this.generateSlug(data.name, this.url);
      
      // Parse offers/variants
      const variants = [];
      const offers = Array.isArray(data.offers) ? data.offers : [data.offers].filter(Boolean);
      
      for (const offer of offers) {
        if (offer && offer.price) {
          variants.push({
            sku: offer.sku || slug,
            options: {},
            price_cents: Math.round(parseFloat(offer.price) * 100),
            currency: offer.priceCurrency || 'USD',
            availability: this.mapAvailability(offer.availability)
          });
        }
      }
      
      // Parse images
      const images = [];
      const imageData = Array.isArray(data.image) ? data.image : [data.image].filter(Boolean);
      
      for (let i = 0; i < imageData.length; i++) {
        const img = imageData[i];
        const url = typeof img === 'string' ? img : img.url || img.contentUrl;
        
        if (url) {
          images.push({
            url: this.resolveUrl(url),
            alt: data.name || '',
            position: i + 1
          });
        }
      }
      
      if (variants.length === 0) {
        // Create default variant if no offers found
        variants.push({
          sku: slug,
          options: {},
          price_cents: 0,
          currency: 'USD',
          availability: 'unknown' as const
        });
      }
      
      return {
        slug,
        title: data.name,
        description: data.description || '',
        brand: data.brand?.name || data.brand,
        category: data.category,
        images,
        variants,
        source_url: this.url,
        handle: slug,
        active: true
      };
      
    } catch (error) {
      console.error('JSON-LD parse error:', error);
      return null;
    }
  }
  
  private parseEmbeddedProduct(data: any): Product | null {
    // Implementation depends on the specific structure of the embedded data
    // This is a simplified version
    try {
      const product = data.product || data.pageProps?.product || data;
      
      if (product && product.title) {
        const slug = this.generateSlug(product.title, this.url);
        
        return {
          slug,
          title: product.title,
          description: product.description || '',
          brand: product.vendor || product.brand,
          category: product.type || product.category,
          images: (product.images || []).map((img: any, index: number) => ({
            url: this.resolveUrl(img.src || img.url || img),
            alt: img.alt || product.title,
            position: index + 1
          })),
          variants: (product.variants || [product]).map((variant: any) => ({
            sku: variant.sku || slug,
            options: variant.option_values || {},
            price_cents: Math.round((variant.price || product.price || 0) * 100),
            currency: 'USD',
            availability: this.mapAvailability(variant.available || product.available)
          })),
          source_url: this.url,
          handle: product.handle || slug,
          active: true
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('Embedded product parse error:', error);
      return null;
    }
  }
  
  private generateSlug(title: string, url: string): string {
    // Try to extract slug from URL first
    const urlPath = new URL(url).pathname;
    const pathSegments = urlPath.split('/').filter(Boolean);
    
    // Look for product identifier in URL
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (lastSegment && lastSegment !== 'index.html') {
        return lastSegment.replace(/\.[^/.]+$/, ''); // Remove file extension
      }
    }
    
    // Generate from title
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }
  
  private mapAvailability(availability: any): 'in_stock' | 'low' | 'out' | 'unknown' {
    if (!availability) return 'unknown';
    
    const str = availability.toString().toLowerCase();
    
    if (str.includes('instock') || str.includes('in_stock') || str === 'true') {
      return 'in_stock';
    } else if (str.includes('outofstock') || str.includes('out_of_stock') || str === 'false') {
      return 'out';
    } else if (str.includes('low')) {
      return 'low';
    }
    
    return 'unknown';
  }
  
  private resolveUrl(url: string): string {
    if (url.startsWith('http')) {
      return url;
    } else if (url.startsWith('//')) {
      return `https:${url}`;
    } else if (url.startsWith('/')) {
      const baseUrl = new URL(this.url);
      return `${baseUrl.protocol}//${baseUrl.host}${url}`;
    } else {
      const baseUrl = new URL(this.url);
      return `${baseUrl.protocol}//${baseUrl.host}${baseUrl.pathname.replace(/[^/]*$/, '')}${url}`;
    }
  }
}

// URL Discovery
export async function discoverProductUrls(rootDomain: string): Promise<string[]> {
  const urls = new Set<string>();
  const visited = new Set<string>();
  const queue = [rootDomain];
  
  const allowedPaths = (process.env.ALLOWED_PATH_PREFIXES || '/products,/collections').split(',');
  
  while (queue.length > 0 && urls.size < 1000) { // Limit discovery
    const currentUrl = queue.shift()!;
    
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);
    
    try {
      debug(`Discovering URLs from: ${currentUrl}`);
      const response = await fetchWithRetries(currentUrl);
      const html = await response.text();
      
      // Extract links
      const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
      let match;
      
      while ((match = linkRegex.exec(html)) !== null) {
        let href = match[1];
        
        // Resolve relative URLs
        if (href.startsWith('/')) {
          const base = new URL(currentUrl);
          href = `${base.protocol}//${base.host}${href}`;
        } else if (!href.startsWith('http')) {
          continue; // Skip other relative URLs for simplicity
        }
        
        // Check if it's a product URL
        if (isLikelyProductUrl(href, allowedPaths)) {
          urls.add(href);
        } else if (isCollectionUrl(href, allowedPaths) && !visited.has(href)) {
          queue.push(href);
        }
      }
      
    } catch (error) {
      console.error(`Discovery error for ${currentUrl}:`, error);
    }
  }
  
  return Array.from(urls);
}

function isLikelyProductUrl(url: string, allowedPaths: string[]): boolean {
  const path = new URL(url).pathname;
  
  return allowedPaths.some(prefix => path.startsWith(prefix)) &&
         !path.endsWith('/') && // Not a collection page
         !path.includes('?') && // No query parameters
         path.split('/').length > 2; // Has product identifier
}

function isCollectionUrl(url: string, allowedPaths: string[]): boolean {
  const path = new URL(url).pathname;
  
  return allowedPaths.some(prefix => path.startsWith(prefix)) &&
         (path.endsWith('/') || path.split('/').length === 2);
}

// Main crawl and ingest function
export async function crawlAndIngest(options: {
  full?: boolean;
  urls?: string[];
  category?: string;
}): Promise<{ success: number; failed: number; errors: string[] }> {
  debug('Starting crawl and ingest...', options);
  
  const rootDomain = process.env.ROOT_DOMAIN || 'https://tasteofgratitude.shop';
  let urlsToProcess: string[];
  
  if (options.urls) {
    urlsToProcess = options.urls;
  } else if (options.full) {
    // Full discovery
    urlsToProcess = await discoverProductUrls(rootDomain);
    debug(`Discovered ${urlsToProcess.length} product URLs`);
  } else {
    // Get existing URLs from database that need refresh
    const database = await require('./database').getDatabase();
    const staleCutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    
    const staleLinks = await database.collection('links')
      .find({
        $or: [
          { last_crawled_at: { $lt: staleCutoff } },
          { crawl_status: 'failed' }
        ]
      })
      .limit(100)
      .toArray();
    
    urlsToProcess = staleLinks.map((link: any) => link.url);
    debug(`Processing ${urlsToProcess.length} stale URLs`);
  }
  
  const results = { success: 0, failed: 0, errors: [] as string[] };
  
  // Process URLs with concurrency control
  const concurrency = 3;
  const chunks = [];
  
  for (let i = 0; i < urlsToProcess.length; i += concurrency) {
    chunks.push(urlsToProcess.slice(i, i + concurrency));
  }
  
  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (url) => {
        try {
          const product = await crawlUrl(url);
          if (product) {
            await upsertProduct(product);
            results.success++;
            debug(`✅ Ingested: ${product.title} (${url})`);
          } else {
            results.failed++;
            results.errors.push(`Failed to parse product from ${url}`);
          }
        } catch (error) {
          results.failed++;
          const errorMsg = `Error processing ${url}: ${error}`;
          results.errors.push(errorMsg);
          console.error(errorMsg);
        }
      })
    );
  }
  
  debug(`Crawl complete. Success: ${results.success}, Failed: ${results.failed}`);
  return results;
}

// Crawl single URL
export async function crawlUrl(url: string): Promise<Product | null> {
  try {
    debug(`Crawling: ${url}`);
    const response = await fetchWithRetries(url);
    const html = await response.text();
    
    const parser = new ProductParser(html, url);
    const product = parser.parse();
    
    if (product) {
      // Validate with Zod
      const validatedProduct = ProductZ.parse(product);
      return validatedProduct;
    }
    
    return null;
    
  } catch (error) {
    console.error(`Crawl error for ${url}:`, error);
    throw error;
  }
}
