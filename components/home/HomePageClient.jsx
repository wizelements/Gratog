'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import QuickAddButton from '@/components/QuickAddButton';
import { ArrowRight, Sparkles, Star, Shield, Heart, Leaf, Award, ChevronDown } from 'lucide-react';
import { ProductImage } from '@/components/OptimizedImage';
import { PRODUCT_IMAGE_FALLBACK_SRC } from '@/lib/storefront-integrity';
import { getCanonicalProductCategoryIcon, getCanonicalProductCategoryLabel } from '@/lib/storefront-query';


import { JsonLd } from '@/components/JsonLd';

export default function HomePageClient({
    initialFeaturedProducts = [],
    initialCatalogCount = null,
    organizationSchema,
    faqSchema,
    isMobile = false
}) {
    const router = useRouter();
    const [featuredProducts, setFeaturedProducts] = useState(initialFeaturedProducts);
    const [catalogProductCount, setCatalogProductCount] = useState(
        typeof initialCatalogCount === 'number' ? initialCatalogCount : null
    );
    const [loading, setLoading] = useState(initialFeaturedProducts.length === 0);
    const [activeAccordion, setActiveAccordion] = useState(null);
    const heroRef = useRef(null);
    const [scrollY, setScrollY] = useState(0);

    const handleViewFeatured = (event) => {
        const featuredSection = document.getElementById('featured');
        if (!featuredSection) {
            return;
        }

        // Keep hash navigation for deep-linking while preserving smooth in-page scroll.
        event.preventDefault();
        if (window.location.hash !== '#featured') {
            window.history.replaceState(null, '', '/#featured');
        }

        try {
            featuredSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
            featuredSection.scrollIntoView();
        }
    };

    useEffect(() => {
        if (initialFeaturedProducts.length > 0) {
            return;
        }

        const fetchProducts = async () => {
            // Set a 10 second timeout to prevent infinite loading
            const timeoutId = setTimeout(() => {
                console.warn('Products API timeout - showing temporary empty state');
                setLoading(false);
                setCatalogProductCount(0);
                setFeaturedProducts([]);
              }, 10000);

            try {
                // Create abort signal with fallback for older browsers
                const fetchOptions = {};
                if (typeof AbortController !== 'undefined') {
                    const controller = new AbortController();
                    fetchOptions.signal = controller.signal;
                    setTimeout(() => controller.abort(), 8000);
                }
                
                const response = await fetch('/api/products', {
                    ...fetchOptions,
                    cache: 'no-store'
                });
                clearTimeout(timeoutId);
                const data = await response.json();

                if (data.success && data.products) {
                    setFeaturedProducts(data.products.slice(0, 6));
                    const hasDemoSource = typeof data.source === 'string' && data.source.includes('demo');
                    if (hasDemoSource) {
                        setCatalogProductCount(null);
                    } else if (typeof data.count === 'number') {
                        setCatalogProductCount(data.count);
                    } else {
                        setCatalogProductCount(data.products.length || null);
                    }
                }
            } catch (error) {
                clearTimeout(timeoutId);
                console.error('Failed to fetch products:', error);
                setCatalogProductCount(0);
                setFeaturedProducts([]);
              } finally {
                setLoading(false);
            }
          };

        fetchProducts();
    }, [initialFeaturedProducts]);

    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        // Guard for older browsers that don't support IntersectionObserver
        if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
            // Fallback: just make elements visible without animation
            document.querySelectorAll('.fade-in-section').forEach(el => {
                el.classList.add('animate-in');
            });
            return;
        }
        
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.fade-in-section').forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [loading]);

    const hasLiveCatalogCount = Number.isFinite(catalogProductCount) && catalogProductCount > 0;
    const heroCatalogBadge = hasLiveCatalogCount
        ? `${catalogProductCount} Items This Week`
        : 'Fresh This Week';
    const viewAllProductsLabel = hasLiveCatalogCount
        ? `Browse All ${catalogProductCount} Items`
        : 'Browse the Full Menu';

    return (
        <div className="flex flex-col min-h-screen">
            
            <JsonLd id="home-organization-schema" data={organizationSchema} />
            <JsonLd id="home-faq-schema" data={faqSchema} />

            <section ref={heroRef} className="relative h-[600px] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/images/gratog-bg.PNG?v=20260309-2"
                        alt="Wildcrafted Sea Moss from Pristine Ocean Waters"
                        fill
                        priority
                        unoptimized
                        quality={85}
                        sizes="100vw"
                        className="object-cover"
                        style={{ transform: `translateY(${scrollY * 0.5}px)` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 via-emerald-800/80 to-teal-900/90" />
                </div>

                <div className="relative z-10 container text-center text-white animate-fade-in text-on-gradient">
                    <Badge className="mb-6 bg-white/20 backdrop-blur-sm text-white border-white/30 px-6 py-2 text-lg">
                        <Leaf className="mr-2 h-5 w-5" />
                        {heroCatalogBadge}
                    </Badge>

                    <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-white">
                        Taste of Gratitude
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">
                            Crafted with care. Shared at the market.
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
                        Wildcrafted sea moss gel & handcrafted boba — made fresh every week for Saturday market pickup.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Button
                            onClick={handleViewFeatured}
                            size="lg"
                            className="h-16 px-10 text-lg bg-white text-emerald-700 hover:bg-emerald-50 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all font-bold"
                        >
                            See This Week&apos;s Menu
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>

                    {/* Trust Signals Bar */}
                    <div className="mt-12 flex flex-wrap justify-center gap-6 md:gap-10 text-sm md:text-base">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                            <Shield className="h-5 w-5 text-emerald-300" />
                            <span className="font-medium">100% Wildcrafted</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                            <Heart className="h-5 w-5 text-emerald-300" />
                            <span className="font-medium">Small Batch</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                            <Sparkles className="h-5 w-5 text-emerald-300" />
                            <span className="font-medium">Made for the Market</span>
                        </div>
                    </div>
                </div>
            </section>

            <section id="featured" className="py-20 bg-gradient-to-b from-white to-emerald-50">
                <div className="container">
                    <div className="text-center mb-12">
                        <Badge className="mb-4 bg-emerald-600 text-white px-4 py-2">
                            <Leaf className="mr-2 h-4 w-4" />
                            Fresh Weekly
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            This Week&apos;s Menu
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Fresh this week — handcrafted in small batches
                        </p>
                    </div>

                    {loading && (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600" />
                        </div>
                    )}

                    {!loading && featuredProducts.length === 0 && (
                        <div className="text-center py-16 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl">
                            <Leaf className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">This week&apos;s menu is coming soon</h3>
                            <p className="text-gray-600 max-w-md mx-auto mb-6">
                                We&apos;re prepping a fresh batch — check back soon or visit us at the market this Saturday.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button
                                    onClick={() => router.push('/catalog')}
                                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                                >
                                    Browse the Full Menu
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {!loading && featuredProducts.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                            {featuredProducts.map((product, index) => {
                                const cardImage = product.displayImage || product.image || PRODUCT_IMAGE_FALLBACK_SRC;
                                const cardImageAlt = product.imageAlt || product.name;
                                const categoryLabel = getCanonicalProductCategoryLabel(product, 'Premium Product');
                                const categoryIcon = getCanonicalProductCategoryIcon(product, '🌿');
                                
                                // 🎯 PRODUCT AVAILABILITY: Check stock and preorder status
                                const stock = product.stock ?? product.currentStock ?? null;
                                const isPreorder = product.isPreorder ?? (stock !== null && stock <= 0);
                                const isLowStock = stock !== null && stock > 0 && stock <= 5;
                                
                                // Determine badge to show
                                let productBadge = null;
                                if (isPreorder) {
                                    productBadge = (
                                        <Badge className="absolute top-4 left-4 bg-amber-500 text-white transform group-hover:scale-110 transition-transform shadow-lg">
                                            📦 Preorder
                                        </Badge>
                                    );
                                } else if (isLowStock) {
                                    productBadge = (
                                        <Badge className="absolute top-4 left-4 bg-orange-500 text-white transform group-hover:scale-110 transition-transform">
                                            ⚡ Only {stock} Left
                                        </Badge>
                                    );
                                }
                                // Note: "Best Seller" badge removed - only show if we have actual sales data

                                return (
                                    <Card
                                        key={product.id}
                                        className="group overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-emerald-300"
                                    >
                                        <CardContent className="p-0">
                                            <Link href={`/product/${product.slug || product.id}`} className="block">
                                                <div className="relative h-64 bg-gradient-to-br from-emerald-100 to-teal-100 overflow-hidden">
                                                    <ProductImage
                                                        src={cardImage}
                                                        alt={cardImageAlt}
                                                        fill
                                                        priority={index < 3}
                                                        className="group-hover:scale-110 group-hover:rotate-2 transition-all duration-500"
                                                        objectFit="cover"
                                                    />

                                                {/* Hover Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <div className="absolute bottom-4 left-4 right-4 text-white">
                                                        <p className="text-sm font-semibold mb-2">Quick View</p>
                                                        <div className="flex gap-2">
                                                            <Badge className="bg-white/20 backdrop-blur-sm border-white/40">View Details</Badge>
                                                            {categoryLabel && (
                                                                <Badge className="bg-white/20 backdrop-blur-sm border-white/40">
                                                                    {categoryIcon} {categoryLabel}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {productBadge}
                                                
                                                {/* Preorder availability note overlay */}
                                                {isPreorder && (
                                                    <div className="absolute bottom-0 left-0 right-0 bg-amber-500/90 text-white text-xs font-medium py-2 px-4 text-center">
                                                        📦 Preorder for Saturday Pickup
                                                    </div>
                                                )}
                                            </div>
                                            </Link>

                                            <div className="p-6">
                                            <p className="text-sm text-emerald-600 font-medium mb-2">
                                                {categoryLabel}
                                                {isPreorder && (
                                                    <span className="ml-2 text-amber-600">• Preorder</span>
                                                )}
                                            </p>

                                            <Link href={`/product/${product.slug || product.id}`}>
                                                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 hover:text-emerald-600 transition-colors cursor-pointer">
                                                    {product.name}
                                                </h3>
                                            </Link>

                                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                                {product.description || 'Product details are being updated.'}
                                            </p>

                                            <div className="flex items-center gap-1 mb-4">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className="h-4 w-4 text-yellow-500 fill-yellow-500"
                                                    />
                                                ))}
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-3xl font-bold text-emerald-600">
                                                        ${typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
                                                    </span>
                                                </div>

                                                <QuickAddButton product={product} />
                                            </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    <div className="text-center">
                        <Button
                            onClick={() => router.push('/catalog')}
                            size="lg"
                            className="h-14 px-8 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                        >
                            {viewAllProductsLabel}
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>

                    {/* Product Bundles Section - Temporarily disabled, will be re-enabled after customization */}
                    {/* Set NEXT_PUBLIC_ENABLE_BUNDLES=true in environment to enable */}
                    {process.env.NEXT_PUBLIC_ENABLE_BUNDLES === 'true' && (
                        <div className="mt-16">
                            {/* ProductBundles component - import when enabling */}
                            {/* <ProductBundles limit={3} /> */}
                            <div className="text-center text-muted-foreground">Product Bundles coming soon</div>
                        </div>
                    )}
                </div>
            </section>

            {/* Our Story */}
            <section className="py-16 bg-gradient-to-br from-emerald-600 to-teal-600 fade-in-section opacity-0 transition-all duration-1000">
                <div className="container max-w-3xl text-center text-on-gradient">
                    <Heart className="h-10 w-10 text-emerald-200 mx-auto mb-4" />
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Our Story</h2>
                    <p className="text-lg text-white/90 leading-relaxed mb-2">
                        Taste of Gratitude started with Jenneisha&apos;s love for natural wellness and a blender in her kitchen.
                        What began as sea moss gel for family became a weekly market tradition — handcrafted boba, infused gels,
                        and real connections with the people who show up every Saturday.
                    </p>
                    <Link href="/about" className="inline-flex items-center mt-6 text-emerald-200 hover:text-white font-semibold transition-colors">
                        Learn Our Story
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </div>
            </section>

            {/* Find Us This Weekend */}
            <section className="py-16 bg-white fade-in-section opacity-0 transition-all duration-1000">
                <div className="container max-w-4xl">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Find Us This Weekend</h2>
                        <p className="text-gray-600">We set up every Saturday — come say hi and grab something fresh.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-r from-purple-50 via-fuchsia-50 to-purple-50 rounded-2xl border border-purple-200 p-8">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-full flex items-center justify-center shadow-lg">
                                    <span className="text-2xl">🧋</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Serenbe Farmers Market</h3>
                                    <p className="text-sm text-purple-700">Saturdays • 9AM–1PM</p>
                                </div>
                            </div>
                            <p className="text-gray-700 text-sm mb-4">
                                Sea moss gel, handcrafted boba (Taro, Strawberry Matcha, Brown Sugar & more), and seasonal specials. Come early for best selection.
                            </p>
                            <Button
                                onClick={() => router.push('/preorder?market=serenbe')}
                                className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all w-full"
                            >
                                Reserve Your Pickup
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-8">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
                                    <span className="text-2xl">🌿</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Dunwoody Farmers Market</h3>
                                    <p className="text-sm text-emerald-700">Saturdays • 8:30AM–12:30PM</p>
                                </div>
                            </div>
                            <p className="text-gray-700 text-sm mb-4">
                                Our full sea moss gel lineup plus market-day specials. Stop by for a taste and chat with Jenneisha.
                            </p>
                            <Button
                                onClick={() => router.push('/markets')}
                                variant="outline"
                                className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 w-full"
                            >
                                See All Markets
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section id="benefits" className="py-20 bg-white fade-in-section opacity-0 transition-all duration-1000">
                <div className="container">
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Shield,
                                title: '100% Wildcrafted',
                                description: 'Sourced from pristine ocean waters — never farmed, never pool-grown'
                            },
                            {
                                icon: Heart,
                                title: 'Small Batch, Big Heart',
                                description: 'Every jar is handcrafted with care by Jenneisha and her team'
                            },
                            {
                                icon: Sparkles,
                                title: 'Made for the Market',
                                description: 'Prepped fresh each week for Saturday pickup at Serenbe & Dunwoody'
                            }
                        ].map((benefit, index) => (
                            <Card key={index} className="text-center p-8 hover:shadow-xl transition-all hover:-translate-y-1 duration-300">
                                <CardContent className="p-0 flex flex-col items-center">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-110 duration-300">
                                        <benefit.icon className="h-8 w-8 text-emerald-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                                        {benefit.title}
                                    </h3>
                                    <p className="text-gray-600">
                                        {benefit.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-20 bg-gradient-to-b from-white to-emerald-50 fade-in-section opacity-0 transition-all duration-1000">
                <div className="container max-w-4xl">
                    <div className="text-center mb-12">
                        <Badge className="mb-4 bg-emerald-600 text-white px-4 py-2">
                            <Award className="mr-2 h-4 w-4" />
                            Frequently Asked Questions
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            Your Questions Answered
                        </h2>
                        <p className="text-xl text-gray-600">
                            Everything you need to know about sea moss
                        </p>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                question: "What is sea moss?",
                                answer: "Sea moss is a type of red algae (also called Irish moss) that grows along rocky coastlines. It's been used in Caribbean and Irish kitchens for generations. We blend it into a smooth gel that you can add to smoothies, teas, or recipes."
                            },
                            {
                                question: "How do I use sea moss gel?",
                                answer: "Add 1-2 tablespoons to your smoothie, tea, coffee, or soup — it blends right in. You can also use it as a face mask. Keep it refrigerated and use within 3-4 weeks of opening."
                            },
                            {
                                question: "What does wildcrafted mean?",
                                answer: "Wildcrafted means our sea moss grows naturally in the ocean, not in a pool or farm. It's hand-harvested from clean waters, which is how it's been done traditionally. We never use pool-grown sea moss."
                            },
                            {
                                question: "What makes Taste of Gratitude different?",
                                answer: "Every jar is handcrafted by Jenneisha in small batches. We use only wildcrafted sea moss and real ingredients for our flavor infusions — elderberry, lemonade, and more. No artificial flavors or preservatives."
                            },
                            {
                                question: "How long does sea moss gel last?",
                                answer: "Refrigerated, it lasts 3-4 weeks in an airtight container. You can also freeze it in ice cube trays for up to 6 months."
                            },
                            {
                                question: "How do I pick up my order?",
                                answer: "We're at Serenbe Farmers Market and Dunwoody Farmers Market every Saturday. Place your order online and pick it up fresh at the market — we'll have it ready for you."
                            }
                        ].map((faq, index) => (
                            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <button
                                    onClick={() => setActiveAccordion(activeAccordion === index ? null : index)}
                                    className="w-full text-left p-6 flex justify-between items-center hover:bg-emerald-50 transition-colors"
                                >
                                    <h3 className="text-lg font-bold text-gray-900 pr-4">{faq.question}</h3>
                                    <ChevronDown className={`h-5 w-5 text-emerald-600 flex-shrink-0 transition-transform duration-300 ${activeAccordion === index ? 'rotate-180' : ''}`} />
                                </button>
                                <div className={`overflow-hidden transition-all duration-300 ${activeAccordion === index ? 'max-h-96' : 'max-h-0'}`}>
                                    <div className="px-6 pb-6 text-gray-700 leading-relaxed">
                                        {faq.answer}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-20 bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
                <div className="container text-center text-on-gradient">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                        See you at the market this Saturday
                    </h2>
                    <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
                        Browse what&apos;s fresh, place a preorder, or just come say hi at Serenbe or Dunwoody.
                    </p>
                    <Button
                        onClick={() => router.push('/catalog')}
                        size="lg"
                        className="h-14 px-8 text-lg bg-white text-emerald-600 hover:bg-emerald-50 shadow-2xl hover:scale-105 transition-all"
                    >
                        Browse This Week&apos;s Menu
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <p className="mt-8 text-emerald-200 text-sm">
                        📬 Get the weekly menu in your inbox — newsletter coming soon
                    </p>
                </div>
            </section>

            {/* 🚀 Mobile Quick Order Button - appears after scrolling past hero */}
            {isMobile && <QuickOrderButton router={router} />}
        </div>
    );
}

/**
 * 🚀 Quick Order Button Component - Sticky bottom button for mobile
 * Allows mobile users to quickly jump to /pay after browsing
 */
function QuickOrderButton({ router }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Show button after scrolling past hero section
        const handleScroll = () => {
            const scrollY = window.scrollY;
            setIsVisible(scrollY > 400);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div 
            className={`fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-2xl transform transition-transform duration-300 ${
                isVisible ? 'translate-y-0' : 'translate-y-full'
            } md:hidden`}
        >
            <Button
                onClick={() => router.push('/pay')}
                className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-lg font-bold shadow-lg"
            >
                🚀 Quick Order
                <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        </div>
    );
}
