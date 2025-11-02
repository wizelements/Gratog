'use client';

import { motion } from 'framer-motion';
import { IngredientCard } from './IngredientCard';
import { FootnotesList } from './FootnotesList';
import type { Ingredient } from '@/data/ingredients/shared-ingredients';
import { Sparkles, Heart } from 'lucide-react';

interface IngredientsShowcaseProps {
  ingredients: Ingredient[];
  productName: string;
  accentColor?: string;
}

export function IngredientsShowcase({ 
  ingredients, 
  productName,
  accentColor = 'from-blue-600 to-cyan-600'
}: IngredientsShowcaseProps) {
  const activeIngredients = ingredients.filter(i => i.category === 'active');
  const supportingIngredients = ingredients.filter(i => i.category === 'supporting');
  const enhancers = ingredients.filter(i => i.category === 'enhancer');

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  };

  let globalCitationIndex = 0;

  return (
    <section className="py-16 px-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(59,130,246,0.08)_0%,_transparent_50%)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_rgba(16,185,129,0.08)_0%,_transparent_50%)] -z-10" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          variants={headerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-blue-200 shadow-sm">
            <Sparkles className="text-blue-600" size={18} />
            <span className="text-sm font-semibold text-blue-900">INGREDIENTS DEEP DIVE</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent">
            What's Inside {productName}
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Every ingredient is thoughtfully sourced and backed by scientific research. 
            Discover the wellness wisdom in each sip.
          </p>
        </motion.div>

        {/* Active Ingredients */}
        {activeIngredients.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className={`h-1 w-12 rounded-full bg-gradient-to-r ${accentColor}`} />
              <h3 className="text-2xl font-bold text-foreground">Key Active Ingredients</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-8">
              These powerhouse ingredients drive the primary health benefits of this blend.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeIngredients.map((ingredient, index) => {
                const cardCitationStart = globalCitationIndex;
                globalCitationIndex += ingredient.benefits.length;
                return (
                  <IngredientCard
                    key={ingredient.name}
                    ingredient={ingredient}
                    index={index}
                    globalCitationIndex={cardCitationStart}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Supporting Ingredients */}
        {supportingIngredients.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 w-12 rounded-full bg-gradient-to-r from-green-600 to-emerald-600" />
              <h3 className="text-2xl font-bold text-foreground">Supporting Ingredients</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-8">
              These ingredients enhance and complement the active compounds.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {supportingIngredients.map((ingredient, index) => {
                const cardCitationStart = globalCitationIndex;
                globalCitationIndex += ingredient.benefits.length;
                return (
                  <IngredientCard
                    key={ingredient.name}
                    ingredient={ingredient}
                    index={index + activeIngredients.length}
                    globalCitationIndex={cardCitationStart}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Enhancers */}
        {enhancers.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 w-12 rounded-full bg-gradient-to-r from-amber-600 to-orange-600" />
              <h3 className="text-2xl font-bold text-foreground">Natural Enhancers</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-8">
              Pure, natural ingredients that bring everything together.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {enhancers.map((ingredient, index) => {
                const cardCitationStart = globalCitationIndex;
                globalCitationIndex += ingredient.benefits.length;
                return (
                  <IngredientCard
                    key={ingredient.name}
                    ingredient={ingredient}
                    index={index + activeIngredients.length + supportingIngredients.length}
                    globalCitationIndex={cardCitationStart}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Footnotes */}
        <FootnotesList ingredients={ingredients} />

        {/* Gratitude closing */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 text-rose-600 mb-3">
            <Heart size={24} fill="currentColor" />
          </div>
          <p className="text-lg font-medium text-foreground mb-2">
            Crafted with gratitude. Backed by science.
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Every sip honors your body and the earth it grows from.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
