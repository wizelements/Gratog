'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import QuickAddButton from '@/components/QuickAddButton';
import { ArrowRight, Sparkles, Star, Shield, Zap, TrendingUp, Heart, Leaf, Droplets, Award, Users, CheckCircle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { getDemoProducts } from '@/lib/demo-products';
import { ProductImage } from '@/components/OptimizedImage';
import ProductBundles from '@/components/ProductBundles';
import WhyUsComparison from '@/components/WhyUsComparison';
import { JsonLd } from '@/components/JsonLd';

export default function HomePageClient({
    initialFeaturedProducts = [],
    organizationSchema,
    faqSchema,
    socialProof = { customers: 'Growing Daily', reviews: 'Fresh Feedback', averageRating: '4.9 / 5.0' }
}) {
    const router = useRouter();
    const [featuredProducts, setFeaturedProducts] = useState(initialFeaturedProducts);
    const [loading, setLoading] = useState(initialFeaturedProducts.length === 0);
    const [activeAccordion, setActiveAccordion] = useState(null);
    const heroRef = useRef(null);
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        if (initialFeaturedProducts.length > 0) {
            return;
        }

        const fetchProducts = async () => {
            // Set a 10 second timeout to prevent infinite loading
            const timeoutId = setTimeout(() => {
                console.warn('Products API timeout - using fallback');
                setLoading(false);
                const demoProducts = getDemoProducts();
                setFeaturedProducts(demoProducts.slice(0, 6));
            }, 10000);

            try {
                // Create abort signal with fallback for older browsers
                const fetchOptions = {};
                if (typeof AbortController !== 'undefined') {
                    const controller = new AbortController();
                    fetchOptions.signal = controller.signal;
                    setTimeout(() => controller.abort(), 8000);
                }
                
                const response = await fetch('/api/products', fetchOptions);
                clearTimeout(timeoutId);
                const data = await response.json();

                if (data.success && data.products) {
                    setFeaturedProducts(data.products.slice(0, 6));
                }
            } catch (error) {
                clearTimeout(timeoutId);
                console.error('Failed to fetch products:', error);
                // Use demo products as fallback instead of showing error
                const demoProducts = getDemoProducts();
                setFeaturedProducts(demoProducts.slice(0, 6));
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

    return (
        <div className="flex flex-col min-h-screen">
            <JsonLd id="home-organization-schema" data={organizationSchema} />
            <JsonLd id="home-faq-schema" data={faqSchema} />

            <section ref={heroRef} className="relative h-[600px] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?w=1920&h=600&fit=crop"
                        alt="Wildcrafted Sea Moss from Pristine Ocean Waters"
                        fill
                        priority
                        quality={85}
                        sizes="100vw"
                        className="object-cover"
                        style={{ transform: `translateY(${scrollY * 0.5}px)` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 via-emerald-800/80 to-teal-900/90" />
                </div>

                <div className="relative z-10 container text-center text-white animate-fade-in text-on-gradient">
                    <Badge className="mb-6 bg-white/20 backdrop-blur-sm text-white border-white/30 px-6 py-2 text-lg">
                        <Sparkles className="mr-2 h-5 w-5" />
                        29 Premium Products Available
                    </Badge>

                    <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-white">
                        Wildcrafted Sea Moss
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">
                            Wellness Journey
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
                        Hand-crafted, nutrient-rich sea moss products. From our ocean to your table with 92 essential minerals.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Button
                            onClick={() => router.push('/catalog')}
                            size="lg"
                            className="h-14 px-8 text-lg bg-white text-emerald-600 hover:bg-emerald-50 shadow-2xl hover:scale-105 transition-all"
                        >
                            <Sparkles className="mr-2 h-5 w-5" />
                            Shop All Products
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>

                        <Button
                            size="lg"
                            variant="outline"
                            className="h-14 px-8 text-lg border-2 border-white text-white hover:bg-white hover:text-emerald-600 shadow-2xl hover:scale-105 transition-all"
                            onClick={() => {
                                const element = document.getElementById('featured');
                                element?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            View Featured
                        </Button>
                    </div>

                    <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-emerald-300" />
                            <span>100% Natural</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                            <span>Premium Quality</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-emerald-300" />
                            <span>Fast Shipping</span>
                        </div>
                    </div>
                </div>
            </section>

            <section id="featured" className="py-20 bg-gradient-to-b from-white to-emerald-50">
                <div className="container">
                    <div className="text-center mb-12">
                        <Badge className="mb-4 bg-emerald-600 text-white px-4 py-2">
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Most Popular
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            Featured Products
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Discover our customer favorites - hand-selected for maximum wellness benefits
                        </p>
                    </div>

                    {loading && (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600" />
                        </div>
                    )}

                    {!loading && featuredProducts.length === 0 && (
                        <div className="text-center py-16 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl">
                            <Sparkles className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Products Coming Soon</h3>
                            <p className="text-gray-600 max-w-md mx-auto mb-6">
                                Our premium sea moss products are being prepared with love. Check back shortly!
                            </p>
                            <Button
                                onClick={() => window.location.reload()}
                                variant="outline"
                                className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                            >
                                Refresh Page
                            </Button>
                        </div>
                    )}

                    {!loading && featuredProducts.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                            {featuredProducts.map((product) => (
                                <Card
                                    key={product.id}
                                    className="group overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-emerald-300"
                                >
                                    <CardContent className="p-0">
                                        <Link href={`/product/${product.slug || product.id}`} className="block">
                                            <div className="relative h-64 bg-gradient-to-br from-emerald-100 to-teal-100 overflow-hidden">
                                                {product.image || product.images?.[0] ? (
                                                    <ProductImage
                                                        src={product.image || product.images[0]}
                                                        alt={product.name}
                                                        fill
                                                        priority={featuredProducts.indexOf(product) < 3}
                                                        className="group-hover:scale-110 group-hover:rotate-2 transition-all duration-500"
                                                        objectFit="cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Sparkles className="h-16 w-16 text-emerald-600 group-hover:scale-125 transition-transform" />
                                                    </div>
                                                )}

                                                {/* Hover Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <div className="absolute bottom-4 left-4 right-4 text-white">
                                                        <p className="text-sm font-semibold mb-2">Quick View</p>
                                                        <div className="flex gap-2">
                                                            <Badge className="bg-white/20 backdrop-blur-sm border-white/40">View Details</Badge>
                                                            {product.category && (
                                                                <Badge className="bg-white/20 backdrop-blur-sm border-white/40">
                                                                    {product.category === 'gel' ? '🥄 Sea Moss Gel' :
                                                                        product.category === 'lemonade' ? '🍋 Lemonade' :
                                                                            product.category === 'shot' ? '💪 Wellness Shot' :
                                                                                product.category === 'juice' ? '🧃 Juice' : product.category}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <Badge className="absolute top-4 left-4 bg-emerald-600 text-white transform group-hover:scale-110 transition-transform">
                                                    <Star className="h-3 w-3 mr-1 fill-white" />
                                                    Best Seller
                                                </Badge>
                                            </div>
                                        </Link>

                                        <div className="p-6">
                                            <p className="text-sm text-emerald-600 font-medium mb-2">
                                                {product.category === 'gel' ? 'Sea Moss Gel' :
                                                    product.category === 'lemonade' ? 'Lemonade' :
                                                        product.category === 'shot' ? 'Wellness Shot' :
                                                            product.category === 'juice' ? 'Juice' :
                                                                'Premium Product'}
                                            </p>

                                            <Link href={`/product/${product.slug || product.id}`}>
                                                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 hover:text-emerald-600 transition-colors cursor-pointer">
                                                    {product.name}
                                                </h3>
                                            </Link>

                                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                                {product.description || 'Premium wildcrafted sea moss product, rich in essential minerals for optimal wellness.'}
                                            </p>

                                            <div className="flex items-center gap-1 mb-4">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className="h-4 w-4 text-yellow-500 fill-yellow-500"
                                                    />
                                                ))}
                                                <span className="text-sm text-gray-600 ml-1">(124)</span>
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
                            ))}
                        </div>
                    )}

                    <div className="text-center">
                        <Button
                            onClick={() => router.push('/catalog')}
                            size="lg"
                            className="h-14 px-8 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                        >
                            View All {!loading ? '29' : ''} Products
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>

                    {/* Product Bundles Section - Temporarily disabled, will be re-enabled after customization */}
                    {/* Set NEXT_PUBLIC_ENABLE_BUNDLES=true in environment to enable */}
                    {process.env.NEXT_PUBLIC_ENABLE_BUNDLES === 'true' && (
                        <div className="mt-16">
                            <ProductBundles limit={3} />
                        </div>
                    )}
                </div>
            </section>

            <section className="py-20 bg-white fade-in-section opacity-0 transition-all duration-1000">
                <div className="container">
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Shield,
                                title: '100% Natural & Wildcrafted',
                                description: 'Sourced from pristine waters, our sea moss is never farmed or pool-grown'
                            },
                            {
                                icon: Zap,
                                title: '92 Essential Minerals',
                                description: 'Natures multivitamin packed with everything your body needs to thrive'
                            },
                            {
                                icon: Star,
                                title: 'Premium Quality Guaranteed',
                                description: 'Every jar is hand-crafted with care and tested for purity and potency'
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

            <section className="py-20 bg-gradient-to-b from-emerald-50 to-white fade-in-section opacity-0 transition-all duration-1000">
                <div className="container max-w-5xl">
                    <div className="text-center mb-16">
                        <Badge className="mb-4 bg-emerald-600 text-white px-4 py-2">
                            <Leaf className="mr-2 h-4 w-4" />
                            Scientific Research
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                            What is Sea Moss?
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            A complete guide to nature's most powerful superfood
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-12">
                        <div className="prose prose-lg max-w-none content-readable mx-auto">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                                <Droplets className="mr-3 h-6 w-6 text-emerald-600" />
                                Overview & Scientific Classification
                            </h3>
                            <p className="text-gray-700 leading-relaxed mb-6">
                                <strong>Sea moss</strong> (<em>Chondrus crispus</em>), also known as <strong>Irish moss</strong>, is a species of red algae that grows abundantly along the rocky Atlantic coastlines of North America, Europe, and the Caribbean. This marine superfood has been harvested for centuries, dating back to the Irish Potato Famine of the 1840s when it became a vital nutrition source.
                            </p>

                            <div className="grid md:grid-cols-2 gap-6 my-8">
                                <div className="bg-emerald-50 p-6 rounded-xl">
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                                        <CheckCircle className="mr-2 h-5 w-5 text-emerald-600" />
                                        Mineral Composition
                                    </h4>
                                    <p className="text-gray-700 text-sm">
                                        Contains <strong>92 of the 102 minerals</strong> the human body needs, including iodine, calcium, potassium, sulfur, magnesium, iron, zinc, selenium, and vitamins A, E, K, and B-complex.
                                    </p>
                                </div>

                                <div className="bg-teal-50 p-6 rounded-xl">
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                                        <CheckCircle className="mr-2 h-5 w-5 text-teal-600" />
                                        Bioactive Compounds
                                    </h4>
                                    <p className="text-gray-700 text-sm">
                                        Rich in <strong>carrageenan</strong> (a natural thickening agent), omega-3 fatty acids, essential amino acids, and powerful antioxidants that support cellular health.
                                    </p>
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-8 flex items-center">
                                <Heart className="mr-3 h-6 w-6 text-emerald-600" />
                                Health Benefits & Applications
                            </h3>
                            <ul className="space-y-3 text-gray-700">
                                <li className="flex items-start">
                                    <CheckCircle className="mr-3 h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <span><strong>Immune System Support:</strong> High vitamin and mineral content strengthens immune response and natural defenses</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="mr-3 h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <span><strong>Thyroid Health:</strong> Natural iodine content supports healthy thyroid function and metabolism</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="mr-3 h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <span><strong>Digestive Wellness:</strong> Prebiotic properties promote gut health and beneficial bacteria growth</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="mr-3 h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <span><strong>Skin & Joint Health:</strong> Collagen-supporting minerals improve skin elasticity and joint mobility</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="mr-3 h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <span><strong>Energy & Recovery:</strong> Rich mineral profile supports natural energy production and post-exercise recovery</span>
                                </li>
                            </ul>

                            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-xl my-8">
                                <h4 className="font-bold text-lg mb-2">📚 Historical Use</h4>
                                <p className="text-emerald-50 text-sm">
                                    Sea moss has been used in traditional medicine for over 14,000 years. Ancient Egyptians used it for skincare, while Caribbean cultures incorporated it into daily nutrition. Modern research continues to validate its traditional uses.
                                </p>
                            </div>

                            <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-8">
                                Wildcrafted vs. Pool-Grown
                            </h3>
                            <p className="text-gray-700 leading-relaxed">
                                <strong>Wildcrafted sea moss</strong> grows naturally in the ocean, absorbing minerals from seawater and maintaining authentic nutritional density. In contrast, pool-grown sea moss lacks the mineral-rich environment and often contains only 5-10% of the nutrients found in wildcrafted varieties. All Taste of Gratitude products use exclusively <strong>100% wildcrafted sea moss</strong> for maximum potency and authenticity.
                            </p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 text-center">
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <div className="text-4xl font-bold text-emerald-600 mb-2">92</div>
                            <div className="text-gray-600">Essential Minerals</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <div className="text-4xl font-bold text-emerald-600 mb-2">14,000+</div>
                            <div className="text-gray-600">Years of Use</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <div className="text-4xl font-bold text-emerald-600 mb-2">100%</div>
                            <div className="text-gray-600">Wildcrafted</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-20 bg-white fade-in-section opacity-0 transition-all duration-1000">
                <div className="container max-w-4xl">
                    <div className="text-center mb-12">
                        <Badge className="mb-4 bg-emerald-600 text-white px-4 py-2">
                            <Users className="mr-2 h-4 w-4" />
                            Customer Reviews
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            Loved by Thousands
                        </h2>
                        <div className="flex items-center justify-center gap-2 mb-4">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                            ))}
                            <span className="text-xl font-bold text-gray-900 ml-2">4.9</span>
                            <span className="text-gray-600">/ 5.0 (verified customer reviews)</span>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mb-12">
                        {[
                            {
                                name: "Sarah M.",
                                text: "This sea moss gel has transformed my energy levels! I add it to my morning smoothie and feel amazing all day.",
                                location: "Atlanta, GA"
                            },
                            {
                                name: "James T.",
                                text: "Best quality sea moss I've found. You can taste the difference - truly wildcrafted and fresh.",
                                location: "Miami, FL"
                            },
                            {
                                name: "Michelle R.",
                                text: "The elderberry blend is my go-to for immune support. My whole family loves it!",
                                location: "Houston, TX"
                            }
                        ].map((review, index) => (
                            <Card key={index} className="hover:shadow-xl transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex gap-1 mb-3">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                        ))}
                                    </div>
                                    <p className="text-gray-700 mb-4 italic">"{review.text}"</p>
                                    <div className="border-t pt-4">
                                        <p className="font-bold text-gray-900">{review.name}</p>
                                        <p className="text-sm text-gray-600">{review.location}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-8 rounded-2xl">
                        <div className="grid md:grid-cols-4 gap-6 text-center">
                            <div>
                                <div className="text-3xl font-bold text-emerald-600 mb-1">{socialProof.customers}</div>
                                <div className="text-gray-600 text-sm">Active Community Members</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-emerald-600 mb-1">{socialProof.reviews}</div>
                                <div className="text-gray-600 text-sm">Verified Reviews</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-emerald-600 mb-1">{socialProof.averageRating}</div>
                                <div className="text-gray-600 text-sm">Average Star Rating</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-emerald-600 mb-1">100%</div>
                                <div className="text-gray-600 text-sm">Natural & Pure</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Us Comparison Section */}
            <WhyUsComparison />

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
                                question: "What is sea moss and what are its benefits?",
                                answer: "Sea moss (Chondrus crispus), also known as Irish moss, is a species of red algae that contains 92 of the 102 essential minerals our bodies need. It supports immune function, thyroid health, digestive wellness, provides natural energy, and promotes healthy skin. Rich in iodine, potassium, calcium, and vitamins, it's considered nature's multivitamin."
                            },
                            {
                                question: "How do I use sea moss gel?",
                                answer: "Take 1-2 tablespoons daily for optimal benefits. You can add it to smoothies, teas, coffee, soups, sauces, or consume it directly. It's tasteless and blends seamlessly into any recipe. For skincare, apply directly to face as a hydrating mask. Store refrigerated and use within 3-4 weeks of opening."
                            },
                            {
                                question: "Is your sea moss wildcrafted or pool-grown?",
                                answer: "All our sea moss is 100% wildcrafted from pristine ocean waters. We NEVER use pool-grown or farmed sea moss. Wildcrafted sea moss absorbs minerals directly from the ocean, ensuring authentic nutritional density and maximum potency. Pool-grown varieties contain only a fraction of the nutrients."
                            },
                            {
                                question: "What makes Taste of Gratitude sea moss different?",
                                answer: "We hand-craft every jar with love using only wildcrafted sea moss. Each batch is tested for purity and quality. We offer unique flavor infusions like elderberry and lemonade made with real ingredients - no artificial flavors or preservatives. Our products are 100% natural, vegan, non-GMO, and gluten-free."
                            },
                            {
                                question: "Are there any side effects or precautions?",
                                answer: "Sea moss is generally safe for most people. However, due to its high iodine content, those with thyroid conditions should consult a healthcare provider before use. Start with smaller amounts (1 tablespoon) to assess tolerance. Pregnant or nursing women should consult their doctor."
                            },
                            {
                                question: "How long does sea moss gel last?",
                                answer: "Refrigerated sea moss gel lasts 3-4 weeks when properly stored in an airtight container. You can also freeze it in ice cube trays for up to 6 months. Look for freshness indicators like ocean-like smell and gel consistency."
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
                        Ready to Start Your Wellness Journey?
                    </h2>
                    <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
                        Join our growing wellness community and experience the power of wildcrafted sea moss.
                    </p>
                    <Button
                        onClick={() => router.push('/catalog')}
                        size="lg"
                        className="h-14 px-8 text-lg bg-white text-emerald-600 hover:bg-emerald-50 shadow-2xl hover:scale-105 transition-all"
                    >
                        <Sparkles className="mr-2 h-5 w-5" />
                        Shop Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </section>
        </div>
    );
}
