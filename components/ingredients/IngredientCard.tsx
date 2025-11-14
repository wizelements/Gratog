// @ts-nocheck
'use client';

import { motion } from 'framer-motion';
import type { Ingredient } from '@/data/ingredients/shared-ingredients';
import { CitationTooltip } from './CitationTooltip';
import { Leaf, Info } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface IngredientCardProps {
  ingredient: Ingredient;
  index: number;
  globalCitationIndex: number;
}

export function IngredientCard({ ingredient, index, globalCitationIndex }: IngredientCardProps) {
  const isActive = ingredient.category === 'active';
  const isSupporting = ingredient.category === 'supporting';
  
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: index * 0.1,
        ease: 'easeOut'
      }
    }
  };

  const iconVariants = {
    hover: {
      scale: 1.2,
      rotate: 5,
      transition: { duration: 0.3 }
    }
  };

  let citationCounter = globalCitationIndex;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`group relative rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 ${
        isActive
          ? 'bg-gradient-to-br from-white/95 to-blue-50/80 border-2 border-blue-200/50 shadow-lg hover:shadow-xl'
          : isSupporting
          ? 'bg-gradient-to-br from-white/90 to-green-50/60 border border-green-100 shadow-md hover:shadow-lg'
          : 'bg-gradient-to-br from-white/85 to-amber-50/50 border border-amber-100 shadow hover:shadow-md'
      }`}
    >
      {/* Active ingredient badge */}
      {isActive && (
        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          KEY INGREDIENT
        </div>
      )}

      {/* Icon */}
      <motion.div
        variants={iconVariants}
        whileHover="hover"
        className="text-6xl mb-4"
      >
        {ingredient.icon}
      </motion.div>

      {/* Name and scientific name */}
      <div className="mb-3">
        <h3 className={`text-xl font-bold mb-1 ${
          isActive ? 'text-blue-900' : isSupporting ? 'text-green-900' : 'text-amber-900'
        }`}>
          {ingredient.name}
        </h3>
        {ingredient.scientificName && (
          <p className="text-xs italic text-muted-foreground">
            {ingredient.scientificName}
          </p>
        )}
      </div>

      {/* Origin */}
      <div className="flex items-start gap-2 mb-4 text-sm text-muted-foreground">
        <Leaf size={16} className="mt-0.5 flex-shrink-0" />
        <p className="leading-snug">{ingredient.origin}</p>
      </div>

      {/* Short description */}
      <p className="text-sm leading-relaxed mb-4 text-foreground/80">
        {ingredient.shortDescription}
      </p>

      {/* Benefits */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20" />
          <span>Evidence-Based Benefits</span>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20" />
        </h4>
        <ul className="space-y-2">
          {ingredient.benefits.map((benefit, idx) => {
            citationCounter++;
            return (
              <li key={idx} className="text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 mt-1 flex-shrink-0">✓</span>
                  <div>
                    <span className="font-semibold text-foreground">{benefit.title}</span>
                    <CitationTooltip citation={benefit.citation} citationNumber={citationCounter} />
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Caution notice */}
      {ingredient.caution && (
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100/80 transition-colors">
              <div className="flex items-start gap-2 text-amber-800">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p className="text-xs font-medium">Important Notice</p>
              </div>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <p className="text-sm text-foreground">{ingredient.caution}</p>
          </HoverCardContent>
        </HoverCard>
      )}
    </motion.div>
  );
}
