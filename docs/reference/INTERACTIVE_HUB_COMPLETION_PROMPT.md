# 🚀 INTERACTIVE HUB - COMPLETION IMPLEMENTATION PROMPT

**Project:** Taste of Gratitude - Interactive Info Hub  
**Phase:** 2.0 - Complete Remaining Features  
**Status:** Core Complete ✅, Advanced Features Pending  
**Date:** November 26, 2025

---

## 📋 EXECUTIVE SUMMARY

The Interactive Hub foundation is complete with working navigation, particle effects, ingredient explorer displaying 23 ingredients with search/filter capabilities. This prompt outlines the systematic completion of:

1. **Individual Ingredient Pages** with deep-dive content
2. **Wellness Games** (BlendMaker, MemoryMatch, IngredientQuiz)
3. **3D Product Showcase** with Three.js integration
4. **Audio System** with interaction sounds
5. **Mobile Responsiveness** optimization
6. **Learning Center** content pages

---

## 🎯 PHASE 2 IMPLEMENTATION ROADMAP

### **TASK 1: Individual Ingredient Pages** 
**Priority:** HIGH | **Complexity:** MEDIUM | **Time:** 2-3 hours

#### Objective
Create dynamic ingredient detail pages at `/explore/ingredients/[slug]` that showcase each ingredient's story, benefits, science, and related products.

#### Current State
- ✅ Route structure exists: `/app/explore/ingredients/[slug]/page.js`
- ✅ Data model ready in `/lib/ingredient-data-extended.js`
- ✅ `getIngredientBySlug()` function available
- ✅ Modal component (`IngredientDetailModal.jsx`) can be adapted
- ⏸️ Page implementation needed

#### Implementation Steps

**Step 1.1: Create Dynamic Ingredient Page**
```javascript
// /app/explore/ingredients/[slug]/page.js
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getIngredientBySlug } from '@/lib/ingredient-data-extended';
import { ArrowLeft, Sparkles, ShoppingCart, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default function IngredientDetailPage() {
  const params = useParams();
  const [ingredient, setIngredient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ing = getIngredientBySlug(params.slug);
    setIngredient(ing);
    setLoading(false);
  }, [params.slug]);

  if (loading) {
    return <LoadingState />;
  }

  if (!ingredient) {
    return <NotFoundState slug={params.slug} />;
  }

  return (
    <div className="min-h-screen py-12 px-4">
      {/* Hero Section */}
      <HeroSection ingredient={ingredient} />
      
      {/* Content Tabs */}
      <ContentTabs ingredient={ingredient} />
      
      {/* Related Products */}
      <RelatedProducts ingredient={ingredient} />
      
      {/* Related Ingredients */}
      <RelatedIngredients ingredient={ingredient} />
      
      {/* CTA Section */}
      <CTASection ingredient={ingredient} />
    </div>
  );
}
```

**Step 1.2: Hero Section Component**
```javascript
function HeroSection({ ingredient }) {
  const rarityColors = {
    common: 'bg-gray-500',
    rare: 'bg-blue-500',
    legendary: 'bg-amber-500'
  };

  return (
    <div className="container mx-auto mb-12">
      {/* Back Button */}
      <Link href="/explore/ingredients">
        <Button variant="ghost" className="text-white hover:bg-white/10 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Explorer
        </Button>
      </Link>

      {/* Hero Card */}
      <Card className="bg-gradient-to-br from-emerald-900/50 to-slate-900/50 border-emerald-500/30">
        <CardContent className="p-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Icon */}
            <div className="text-9xl animate-bounce-gentle">
              {ingredient.icon}
            </div>
            
            {/* Content */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
                <h1 className="text-5xl font-bold text-white">
                  {ingredient.name}
                </h1>
                {ingredient.rarity && (
                  <Badge className={`${rarityColors[ingredient.rarity]} text-white`}>
                    {ingredient.rarity === 'legendary' && <Sparkles className="h-3 w-3 mr-1" />}
                    {ingredient.rarity.toUpperCase()}
                  </Badge>
                )}
              </div>
              
              {ingredient.scientificName && (
                <p className="text-emerald-300 italic mb-4 text-lg">
                  {ingredient.scientificName}
                </p>
              )}
              
              <p className="text-white/80 text-xl mb-6">
                {ingredient.longDescription}
              </p>
              
              {ingredient.origin && (
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-300">
                  Origin: {ingredient.origin}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 1.3: Content Tabs**
```javascript
function ContentTabs({ ingredient }) {
  return (
    <div className="container mx-auto mb-12">
      <Tabs defaultValue="benefits" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-black/40">
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="story">Story</TabsTrigger>
          <TabsTrigger value="science">Science</TabsTrigger>
          <TabsTrigger value="uses">How to Use</TabsTrigger>
        </TabsList>

        <TabsContent value="benefits">
          <BenefitsTab ingredient={ingredient} />
        </TabsContent>

        <TabsContent value="story">
          <StoryTab ingredient={ingredient} />
        </TabsContent>

        <TabsContent value="science">
          <ScienceTab ingredient={ingredient} />
        </TabsContent>

        <TabsContent value="uses">
          <UsesTab ingredient={ingredient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BenefitsTab({ ingredient }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      {ingredient.benefits?.map((benefit, index) => (
        <Card key={index} className="bg-black/40 border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-emerald-400 mt-1" />
              <p className="text-white capitalize">{benefit}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StoryTab({ ingredient }) {
  return (
    <div className="space-y-6 mt-6">
      {ingredient.story?.map((chapter, index) => (
        <Card key={index} className="bg-black/40 border-emerald-500/30">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold text-emerald-400 mb-4">
              {chapter.title}
            </h3>
            <p className="text-white/80 text-lg leading-relaxed">
              {chapter.content}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ScienceTab({ ingredient }) {
  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-2xl font-bold text-white mb-4">Did You Know?</h3>
      {ingredient.facts?.map((fact, index) => (
        <Card key={index} className="bg-black/40 border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">{index === 0 ? '🔬' : index === 1 ? '⚗️' : index === 2 ? '🧬' : '✨'}</div>
              <p className="text-white/80">{fact}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UsesTab({ ingredient }) {
  return (
    <Card className="bg-black/40 border-emerald-500/30 mt-6">
      <CardContent className="p-8">
        <h3 className="text-2xl font-bold text-white mb-4">How to Enjoy</h3>
        <ul className="space-y-3 text-white/80">
          <li className="flex items-start gap-3">
            <span className="text-emerald-400">•</span>
            <span>Add to smoothies and blended drinks</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-400">•</span>
            <span>Mix into wellness shots for concentrated benefits</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-400">•</span>
            <span>Incorporate into daily routines for consistent wellness</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
```

**Step 1.4: Related Products Section**
```javascript
function RelatedProducts({ ingredient }) {
  // This would fetch products containing this ingredient
  // For now, show placeholder
  return (
    <div className="container mx-auto mb-12">
      <h2 className="text-3xl font-bold text-white mb-6">
        Find {ingredient.name} In These Products
      </h2>
      <div className="bg-black/40 border border-emerald-500/30 rounded-lg p-8 text-center">
        <ShoppingCart className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
        <p className="text-white/60 mb-4">
          Discover our products featuring {ingredient.name}
        </p>
        <Link href="/catalog">
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            Browse Products
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

**Step 1.5: SEO & Metadata**
```javascript
// Add generateMetadata for SEO
export async function generateMetadata({ params }) {
  const ingredient = getIngredientBySlug(params.slug);
  
  if (!ingredient) {
    return {
      title: 'Ingredient Not Found'
    };
  }

  return {
    title: `${ingredient.name} - Ingredient Explorer | Taste of Gratitude`,
    description: ingredient.description,
    openGraph: {
      title: `Discover ${ingredient.name}`,
      description: ingredient.description,
      type: 'article',
    },
  };
}

// Generate static paths for all ingredients
export async function generateStaticParams() {
  const { getAllIngredientSlugs } = await import('@/lib/ingredient-data-extended');
  const slugs = getAllIngredientSlugs();
  
  return slugs.map((slug) => ({
    slug: slug,
  }));
}
```

#### Testing Checklist
- [ ] Page loads for each ingredient slug
- [ ] Hero section displays correctly with icon and badges
- [ ] All tabs load and display content
- [ ] Back button returns to ingredient explorer
- [ ] Responsive design on mobile
- [ ] Loading and error states work
- [ ] SEO metadata generated correctly

---

### **TASK 2: Wellness Games Implementation**
**Priority:** HIGH | **Complexity:** HIGH | **Time:** 4-6 hours

#### 2.1: BlendMaker Game

**Objective:** Interactive drag-and-drop blend creation game where users combine ingredients to create custom wellness blends.

**File:** `/components/explore/games/BlendMaker.jsx`

```javascript
'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Sparkles, RotateCcw, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAllExtendedIngredients } from '@/lib/ingredient-data-extended';
import audioManager from '@/lib/explore/audio-manager';

export default function BlendMaker() {
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [blending, setBlending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // Load 12 random ingredients
    const all = Object.values(getAllExtendedIngredients());
    const shuffled = all.sort(() => 0.5 - Math.random());
    setAvailableIngredients(shuffled.slice(0, 12));
  }, []);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;

    if (sourceId === 'available' && destId === 'blender') {
      // Move to blender
      const ingredient = availableIngredients[result.source.index];
      if (selectedIngredients.length < 5) {
        audioManager.play('drop');
        setSelectedIngredients([...selectedIngredients, ingredient]);
        setAvailableIngredients(availableIngredients.filter((_, i) => i !== result.source.index));
      }
    } else if (sourceId === 'blender' && destId === 'available') {
      // Remove from blender
      const ingredient = selectedIngredients[result.source.index];
      setAvailableIngredients([...availableIngredients, ingredient]);
      setSelectedIngredients(selectedIngredients.filter((_, i) => i !== result.source.index));
    }
  };

  const handleBlend = async () => {
    if (selectedIngredients.length < 2) return;

    setBlending(true);
    audioManager.play('blend');

    // Simulate blending animation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Calculate blend results
    const synergy = calculateSynergy(selectedIngredients);
    const benefits = extractUniqueBenefits(selectedIngredients);
    const name = generateBlendName(selectedIngredients);

    setResult({ synergy, benefits, name });
    setBlending(false);
    audioManager.play('success');
  };

  const calculateSynergy = (ingredients) => {
    // Simple synergy calculation based on complementary benefits
    let score = 50;
    const allBenefits = ingredients.flatMap(i => i.benefits || []);
    const uniqueBenefits = [...new Set(allBenefits)];
    
    // Bonus for diversity
    score += uniqueBenefits.length * 5;
    
    // Bonus for legendary ingredients
    const legendaryCount = ingredients.filter(i => i.rarity === 'legendary').length;
    score += legendaryCount * 15;
    
    return Math.min(100, score);
  };

  const extractUniqueBenefits = (ingredients) => {
    const allBenefits = ingredients.flatMap(i => i.benefits || []);
    return [...new Set(allBenefits)].slice(0, 6);
  };

  const generateBlendName = (ingredients) => {
    const names = ['Power', 'Vitality', 'Wellness', 'Energy', 'Balance', 'Harmony'];
    const suffixes = ['Elixir', 'Blend', 'Fusion', 'Mix', 'Tonic'];
    return `${names[Math.floor(Math.random() * names.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  };

  return (
    <div className="space-y-8">
      {/* Instructions */}
      <Card className="bg-black/40 border-emerald-500/30">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-white mb-2">How to Play</h3>
          <p className="text-white/60">
            Drag ingredients into the blender (2-5 ingredients). Create unique wellness blends and discover synergies!
          </p>
        </CardContent>
      </Card>

      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Available Ingredients */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Available Ingredients</h3>
          <Droppable droppableId="available" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
              >
                {availableIngredients.map((ingredient, index) => (
                  <Draggable key={ingredient.slug} draggableId={ingredient.slug} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <IngredientToken ingredient={ingredient} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Blender */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Your Blend</h3>
          <Droppable droppableId="blender">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="min-h-[200px] bg-black/60 border-2 border-dashed border-emerald-500/50 rounded-lg p-6"
              >
                {selectedIngredients.length === 0 ? (
                  <div className="text-center text-white/40 py-12">
                    <p>Drag ingredients here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                    {selectedIngredients.map((ingredient, index) => (
                      <Draggable key={ingredient.slug} draggableId={ingredient.slug} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <IngredientToken ingredient={ingredient} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>

      {/* Blend Button */}
      <div className="flex justify-center gap-4">
        <Button
          size="lg"
          onClick={handleBlend}
          disabled={selectedIngredients.length < 2 || blending}
          className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
        >
          {blending ? (
            <>
              <RotateCcw className="mr-2 h-5 w-5 animate-spin" />
              Blending...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Blend It!
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {result && (
        <BlendResult result={result} ingredients={selectedIngredients} />
      )}
    </div>
  );
}

function IngredientToken({ ingredient }) {
  return (
    <Card className="bg-white border-2 border-gray-200 hover:border-emerald-500 cursor-move transition-all hover:scale-105">
      <CardContent className="p-4 text-center">
        <div className="text-4xl mb-2">{ingredient.icon}</div>
        <p className="text-xs font-semibold text-gray-800">{ingredient.name}</p>
      </CardContent>
    </Card>
  );
}

function BlendResult({ result, ingredients }) {
  return (
    <Card className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 border-emerald-500/50">
      <CardContent className="p-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🧪</div>
          <h2 className="text-3xl font-bold text-white mb-2">{result.name}</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="text-white/60">Synergy Score:</span>
            <Badge className="bg-emerald-500 text-white text-lg px-4 py-1">
              {result.synergy}/100
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Ingredients</h4>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2 text-white/80">
                  <span>{ing.icon}</span>
                  <span>{ing.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Combined Benefits</h4>
            <div className="flex flex-wrap gap-2">
              {result.benefits.map((benefit, i) => (
                <Badge key={i} variant="outline" className="border-emerald-500/50 text-emerald-300">
                  {benefit}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Share2 className="mr-2 h-4 w-4" />
            Share Blend
          </Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            Find Similar Products
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Dependencies to Install:**
```bash
yarn add @hello-pangea/dnd
```

#### 2.2: MemoryMatch Game

**File:** `/components/explore/games/MemoryMatch.jsx`

```javascript
'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAllExtendedIngredients } from '@/lib/ingredient-data-extended';
import audioManager from '@/lib/explore/audio-manager';

export default function MemoryMatch() {
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [difficulty, setDifficulty] = useState('easy');

  const difficulties = {
    easy: { pairs: 4, name: 'Easy' },
    medium: { pairs: 8, name: 'Medium' },
    hard: { pairs: 12, name: 'Hard' }
  };

  useEffect(() => {
    initializeGame();
  }, [difficulty]);

  const initializeGame = () => {
    const allIngredients = Object.values(getAllExtendedIngredients());
    const pairs = difficulties[difficulty].pairs;
    const selected = allIngredients.slice(0, pairs);
    
    // Create pairs
    const gameCards = [];
    selected.forEach((ingredient, index) => {
      gameCards.push({ id: `${index}-a`, ingredient, matched: false });
      gameCards.push({ id: `${index}-b`, ingredient, matched: false });
    });
    
    // Shuffle
    const shuffled = gameCards.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedCards([]);
    setMatchedCards([]);
    setMoves(0);
    setGameComplete(false);
  };

  const handleCardClick = (cardId) => {
    if (flippedCards.includes(cardId) || matchedCards.includes(cardId) || flippedCards.length === 2) {
      return;
    }

    audioManager.play('flip');
    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(moves + 1);
      checkMatch(newFlipped);
    }
  };

  const checkMatch = (flipped) => {
    const [first, second] = flipped;
    const card1 = cards.find(c => c.id === first);
    const card2 = cards.find(c => c.id === second);

    if (card1.ingredient.slug === card2.ingredient.slug) {
      // Match!
      audioManager.play('match');
      const newMatched = [...matchedCards, first, second];
      setMatchedCards(newMatched);
      setFlippedCards([]);

      // Check if game complete
      if (newMatched.length === cards.length) {
        setTimeout(() => {
          setGameComplete(true);
          audioManager.play('win');
        }, 500);
      }
    } else {
      // No match
      audioManager.play('no-match');
      setTimeout(() => {
        setFlippedCards([]);
      }, 1000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Memory Match</h2>
          <p className="text-white/60">Match the ingredient pairs!</p>
        </div>

        <div className="flex gap-2">
          {Object.keys(difficulties).map((key) => (
            <Button
              key={key}
              variant={difficulty === key ? 'default' : 'outline'}
              onClick={() => setDifficulty(key)}
              className={difficulty === key ? 'bg-emerald-500' : 'border-white/20 text-white'}
            >
              {difficulties[key].name}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-emerald-400">{moves}</div>
          <div className="text-white/60 text-sm">Moves</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-emerald-400">{matchedCards.length / 2}</div>
          <div className="text-white/60 text-sm">Matches</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-emerald-400">{cards.length / 2}</div>
          <div className="text-white/60 text-sm">Pairs</div>
        </div>
      </div>

      {/* Game Grid */}
      <div className={`grid gap-4 ${
        difficulty === 'easy' ? 'grid-cols-4' :
        difficulty === 'medium' ? 'grid-cols-4 md:grid-cols-4' :
        'grid-cols-4 md:grid-cols-6'
      }`}>
        {cards.map((card) => (
          <MemoryCard
            key={card.id}
            card={card}
            isFlipped={flippedCards.includes(card.id) || matchedCards.includes(card.id)}
            isMatched={matchedCards.includes(card.id)}
            onClick={() => handleCardClick(card.id)}
          />
        ))}
      </div>

      {/* Reset Button */}
      <div className="flex justify-center">
        <Button
          onClick={initializeGame}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          New Game
        </Button>
      </div>

      {/* Win Modal */}
      {gameComplete && (
        <WinModal moves={moves} pairs={cards.length / 2} onPlayAgain={initializeGame} />
      )}
    </div>
  );
}

function MemoryCard({ card, isFlipped, isMatched, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
        aspect-square cursor-pointer transition-all duration-300 transform
        ${isFlipped ? 'scale-105' : 'scale-100 hover:scale-105'}
      `}
    >
      <Card className={`
        h-full border-2 transition-all
        ${isMatched ? 'border-emerald-500 bg-emerald-500/20' : 
          isFlipped ? 'border-emerald-400 bg-white' : 
          'border-white/20 bg-black/40 hover:border-white/40'}
      `}>
        <CardContent className="h-full flex items-center justify-center p-2">
          {isFlipped ? (
            <div className="text-center">
              <div className="text-4xl md:text-5xl mb-1">{card.ingredient.icon}</div>
              <div className="text-xs font-semibold text-gray-800">{card.ingredient.name}</div>
            </div>
          ) : (
            <div className="text-4xl md:text-5xl">🌿</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WinModal({ moves, pairs, onPlayAgain }) {
  const rating = moves <= pairs * 1.5 ? 3 : moves <= pairs * 2 ? 2 : 1;
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 border-emerald-500/50 max-w-md w-full">
        <CardContent className="p-8 text-center">
          <Trophy className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-4">Congratulations!</h2>
          <p className="text-white/80 mb-6">
            You matched all {pairs} pairs in {moves} moves!
          </p>
          
          <div className="flex justify-center gap-1 mb-6">
            {[1, 2, 3].map((star) => (
              <span key={star} className={`text-4xl ${star <= rating ? 'text-amber-400' : 'text-gray-600'}`}>
                ★
              </span>
            ))}
          </div>

          <Button
            onClick={onPlayAgain}
            className="bg-emerald-500 hover:bg-emerald-600 w-full"
          >
            Play Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### **TASK 3: Audio System**
**Priority:** MEDIUM | **Complexity:** LOW | **Time:** 1 hour

#### Implementation

**Step 3.1: Add Audio Files**
Place these files in `/public/audio/`:
- `ui-tap.mp3` - Button clicks
- `ui-success.mp3` - Success actions
- `flip.mp3` - Card flip sound
- `match.mp3` - Successful match
- `no-match.mp3` - Failed match
- `blend.mp3` - Blending sound
- `drop.mp3` - Drag and drop
- `win.mp3` - Game win
- `ambient-background.mp3` - Background music

**Step 3.2: Update Audio Manager**
```javascript
// /lib/explore/audio-manager.js
class AudioManager {
  constructor() {
    this.sounds = {};
    this.muted = true;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    const soundFiles = {
      'ui-tap': '/audio/ui-tap.mp3',
      'ui-success': '/audio/ui-success.mp3',
      'flip': '/audio/flip.mp3',
      'match': '/audio/match.mp3',
      'no-match': '/audio/no-match.mp3',
      'blend': '/audio/blend.mp3',
      'drop': '/audio/drop.mp3',
      'win': '/audio/win.mp3',
      'ambient': '/audio/ambient-background.mp3',
    };

    for (const [key, url] of Object.entries(soundFiles)) {
      try {
        const audio = new Audio(url);
        audio.preload = 'auto';
        this.sounds[key] = audio;
      } catch (error) {
        console.warn(`Failed to load sound: ${key}`, error);
      }
    }

    this.initialized = true;
  }

  play(soundId, options = {}) {
    if (this.muted) return;
    
    const sound = this.sounds[soundId];
    if (!sound) {
      console.warn(`Sound not found: ${soundId}`);
      return;
    }

    sound.volume = options.volume || 0.5;
    sound.currentTime = 0;
    sound.play().catch(error => {
      console.warn(`Failed to play sound: ${soundId}`, error);
    });
  }

  setMute(muted) {
    this.muted = muted;
    localStorage.setItem('audioMuted', muted);
  }

  isMuted() {
    const stored = localStorage.getItem('audioMuted');
    return stored === 'true';
  }
}

const audioManager = new AudioManager();
export default audioManager;
```

---

### **TASK 4: Mobile Responsiveness**
**Priority:** HIGH | **Complexity:** MEDIUM | **Time:** 2-3 hours

#### Testing Checklist
- [ ] Test on iPhone SE (375px)
- [ ] Test on iPhone 12 Pro (390px)
- [ ] Test on iPad (768px)
- [ ] Test on iPad Pro (1024px)
- [ ] Touch targets minimum 44x44px
- [ ] Text readable without zoom
- [ ] Navigation accessible
- [ ] Particles perform well
- [ ] Games playable on touch
- [ ] Cards stack properly

#### Key Fixes Needed
```css
/* Add to globals.css */
@media (max-width: 640px) {
  /* Smaller particles on mobile */
  .particle-system {
    --particle-count: 15; /* Reduce from 30 */
  }
  
  /* Larger touch targets */
  .ingredient-card {
    min-height: 120px;
  }
  
  /* Responsive grid */
  .ingredient-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
```

---

### **TASK 5: 3D Product Showcase**
**Priority:** MEDIUM | **Complexity:** VERY HIGH | **Time:** 6-8 hours

#### Overview
This is the most complex feature requiring Three.js integration, 3D model loading, and potentially AR capabilities.

#### Simplified MVP Approach

**Step 5.1: Install Dependencies**
```bash
yarn add three @react-three/fiber @react-three/drei
```

**Step 5.2: Create Basic 3D Viewer**
```javascript
// /components/explore/3d/Simple3DViewer.jsx
'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera } from '@react-three/drei';

export default function Simple3DViewer({ productName }) {
  return (
    <div className="w-full h-[600px] bg-black/40 rounded-lg overflow-hidden">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <Suspense fallback={<LoadingBox />}>
          <Stage environment="city" intensity={0.6}>
            <ProductMesh />
          </Stage>
        </Suspense>
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
}

function ProductMesh() {
  // Placeholder mesh - replace with actual 3D model
  return (
    <mesh>
      <cylinderGeometry args={[1, 1, 2, 32]} />
      <meshStandardMaterial color="#10b981" metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

function LoadingBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#059669" wireframe />
    </mesh>
  );
}
```

**Recommendation:** Start with simple geometric shapes (cylinders for bottles, boxes for containers) before attempting to load actual 3D models. Full 3D model integration requires:
- Professional 3D models (GLTF/GLB format)
- Model optimization (< 2MB each)
- Texture baking
- AR Quick Look files (USDZ for iOS)

---

## 📊 IMPLEMENTATION PRIORITY MATRIX

| Task | Priority | Complexity | Impact | Order |
|------|----------|------------|--------|-------|
| Fix Ingredient Cards | ✅ DONE | Low | High | 1 |
| Individual Ingredient Pages | HIGH | Medium | High | 2 |
| Memory Match Game | HIGH | Medium | Medium | 3 |
| Blend Maker Game | HIGH | High | High | 4 |
| Audio System | MEDIUM | Low | Medium | 5 |
| Mobile Responsiveness | HIGH | Medium | High | 6 |
| Ingredient Quiz | MEDIUM | Medium | Medium | 7 |
| 3D Showcase | MEDIUM | Very High | Medium | 8 |

---

## 🎯 SUCCESS CRITERIA

### Phase 2 Complete When:
- ✅ Individual ingredient pages load and display all content
- ✅ BlendMaker game is fully playable with drag-and-drop
- ✅ MemoryMatch game works with all three difficulty levels
- ✅ Audio plays on interactions (with mute option working)
- ✅ All pages responsive on mobile (375px+)
- ✅ Games playable on touch devices
- ✅ Loading states and error handling throughout
- ✅ Documentation updated with new features

---

## 📝 DEVELOPMENT NOTES

### Best Practices
1. **Test each feature independently** before integration
2. **Use React.Suspense** for lazy loading heavy components
3. **Implement error boundaries** for graceful failures
4. **Add loading skeletons** for better UX
5. **Optimize images** and assets (WebP, lazy load)
6. **Use CSS transforms** for animations (better performance)
7. **Throttle particle updates** on slower devices
8. **Test on real devices**, not just browser emulation

### Common Pitfalls
- Don't load 3D libraries on initial page load (code split)
- Don't animate too many particles on mobile
- Don't forget to cleanup event listeners
- Don't skip error handling in async functions
- Don't hardcode URLs (use environment variables)

---

## 🚀 NEXT AGENT INSTRUCTIONS

When implementing these features:

1. **Read this document thoroughly** before starting
2. **Follow the code examples** - they include best practices
3. **Test each component** individually before integrating
4. **Take screenshots** at key milestones to show progress
5. **Update IMPLEMENTATION_COMPLETE.md** when done
6. **Call testing agent** for comprehensive testing before finishing
7. **Ask user for feedback** after completing each major task

---

**This prompt provides a complete roadmap for finishing the Interactive Hub. Each task includes detailed implementation steps, code examples, and testing criteria. Good luck! 🎉**
