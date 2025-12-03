'use client';

import { useState, useMemo } from 'react';
import { Search, Grid3x3, List, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import IngredientCard from './IngredientCard';
import IngredientDetailModal from './IngredientDetailModal';

export default function IngredientExplorer({ ingredients = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedIngredient, setSelectedIngredient] = useState(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(['all']);
    ingredients.forEach(ing => {
      if (ing.category) cats.add(ing.category);
    });
    return Array.from(cats);
  }, [ingredients]);

  // Filter ingredients
  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ingredient => {
      if (!ingredient || !ingredient.name) return false;
      const matchesSearch = ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           ingredient.benefits?.some(b => b?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || ingredient.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [ingredients, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search ingredients or benefits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>

          {/* View Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? '' : 'border-white/20 text-white hover:bg-white/10'}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? '' : 'border-white/20 text-white hover:bg-white/10'}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Filter className="h-4 w-4 text-white/60 mt-2" />
          {categories.map(category => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className={
                `cursor-pointer transition-colors capitalize ${
                  selectedCategory === category 
                    ? 'bg-emerald-500 text-white' 
                    : 'border-white/20 text-white/60 hover:bg-white/10'
                }`
              }
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-white/60">
          Showing {filteredIngredients.length} of {ingredients.length} ingredients
        </div>
      </div>

      {/* Ingredients Grid/List */}
      <div className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
      }>
        {filteredIngredients.map((ingredient, index) => (
          <div
            key={ingredient.name}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <IngredientCard
              ingredient={ingredient}
              onClick={() => setSelectedIngredient(ingredient)}
            />
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredIngredients.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-2xl font-bold text-white mb-2">No ingredients found</h3>
          <p className="text-white/60">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Detail Modal */}
      <IngredientDetailModal
        ingredient={selectedIngredient}
        isOpen={!!selectedIngredient}
        onClose={() => setSelectedIngredient(null)}
      />
    </div>
  );
}
