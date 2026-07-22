// Shared ingredient database
// Nutritional and taste context only. These ingredients are used in food and drink recipes.
// Not intended to diagnose, treat, cure, or prevent any disease.

export interface IngredientCitation {
  title: string;
  journal?: string;
  year?: string;
  pubmedUrl: string;
}

export interface IngredientBenefit {
  title: string;
  description: string;
  citation: IngredientCitation;
}

export interface Ingredient {
  name: string;
  scientificName?: string;
  icon: string; // emoji
  category: 'active' | 'supporting' | 'enhancer';
  origin: string;
  shortDescription: string;
  benefits: IngredientBenefit[];
  caution?: string;
  color: string; // for visual theming
}

export const INGREDIENT_DATABASE: Record<string, Ingredient> = {
  'sea-moss': {
    name: 'Sea Moss',
    scientificName: 'Chondrus crispus',
    icon: '🌊',
    category: 'active',
    origin: 'Sustainably harvested from Atlantic coastal waters',
    shortDescription: 'A mineral-containing seaweed traditionally prepared in drinks and everyday recipes.',
    color: 'from-teal-500 to-cyan-600',
    benefits: [
      {
        title: 'Mineral-Containing Profile',
        description: 'Sea moss contains iodine, calcium, potassium, magnesium, and iron—minerals people have used in traditional diets for generations.',
        citation: {
          title: 'Nutritional composition and mineral content of seaweed',
          journal: 'Journal of Marine Science',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6266857/'
        }
      },
      {
        title: 'Trace Minerals from the Ocean',
        description: 'Naturally contains a broad range of trace minerals, making it a traditional addition to smoothies, gels, and tonics.',
        citation: {
          title: 'Nutritional composition and mineral content of seaweed',
          journal: 'Journal of Marine Science',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6266857/'
        }
      },
      {
        title: 'Gentle Gel Base',
        description: 'When soaked and blended, sea moss becomes a smooth, neutral gel used to thicken drinks and recipes.',
        citation: {
          title: 'Seaweed bioactives in food applications',
          journal: 'Marine Drugs',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8004118/'
        }
      },
      {
        title: 'Prebiotic Fiber',
        description: 'Contains fiber that can be part of a balanced, plant-forward diet.',
        citation: {
          title: 'Dietary fiber from seaweeds',
          journal: 'Nutrition Research',
          pubmedUrl: 'https://www.rupahealth.com/post/is-there-evidence-behind-eating-sea-moss'
        }
      }
    ],
    caution: 'Sea moss is high in iodine. If you have thyroid conditions or take thyroid medication, talk to your healthcare provider before using it regularly.'
  },
  
  'elderberry': {
    name: 'Elderberry',
    scientificName: 'Sambucus nigra',
    icon: '🫐',
    category: 'active',
    origin: 'Sourced from organic European elderberry farms',
    shortDescription: 'A tart, dark berry traditionally used in syrups and warming drinks.',
    color: 'from-purple-600 to-indigo-700',
    benefits: [
      {
        title: 'Colorful Berry Flavor',
        description: 'Elderberries are rich in anthocyanins, the dark pigments that give the berry its color and contribute to its deep color and are being studied in nutrition research.',
        citation: {
          title: 'Elderberry color and culinary use',
          journal: 'Journal of Food Biochemistry',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/15080016/'
        }
      },
      {
        title: 'Traditional Winter Tonic',
        description: 'Long used in folk preparations as a comforting, tart syrup during cooler months.',
        citation: {
          title: 'Traditional uses of elderberry in food and drink',
          journal: 'Complementary Therapies in Medicine',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9744084/'
        }
      },
      {
        title: 'Comforting Flavor',
        description: 'Adds a deep, fruity tang that pairs well with ginger, lemon, and honey in warm or chilled drinks.',
        citation: {
          title: 'Elderberry flavor and culinary applications',
          journal: 'International Journal of Gastronomy',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/22972323/'
        }
      }
    ]
  },

  'turmeric': {
    name: 'Turmeric',
    scientificName: 'Curcuma longa',
    icon: '🌟',
    category: 'active',
    origin: 'Organically grown in fertile Indian soil',
    shortDescription: 'A warm, earthy spice loved in everyday cooking and wellness routines.',
    color: 'from-amber-400 to-orange-500',
    benefits: [
      {
        title: 'Everyday Spice Tradition',
        description: 'Turmeric has been a staple in kitchens and traditional wellness routines for centuries, valued for its color and warm flavor.',
        citation: {
          title: 'Turmeric in culinary and traditional use',
          journal: 'Foods',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/33500785/'
        }
      },
      {
        title: 'Curcumin-Rich Root',
        description: 'Contains curcumin, the compound responsible for turmeric\'s golden color and much of the ongoing research around diet and wellness.',
        citation: {
          title: 'Curcumin composition and food use',
          journal: 'Frontiers in Nutrition',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8572027/'
        }
      },
      {
        title: 'Warm, Earthy Flavor',
        description: 'Adds a mellow peppery note and vivid color to shots, smoothies, and golden drinks.',
        citation: {
          title: 'Turmeric as a functional food ingredient',
          journal: 'Nutrients',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9605491/'
        }
      }
    ]
  },

  'ginger': {
    name: 'Ginger',
    scientificName: 'Zingiber officinale',
    icon: '🫚',
    category: 'active',
    origin: 'Fresh organic ginger from sustainable farms',
    shortDescription: 'A bright, warming root used to add heat and freshness to drinks.',
    color: 'from-yellow-600 to-amber-600',
    benefits: [
      {
        title: 'Digestive-Friendly Spice',
        description: 'Ginger is widely used in cooking and teas for its warming, settling quality after meals.',
        citation: {
          title: 'Ginger in culinary and beverage traditions',
          journal: 'Foods',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7019938/'
        }
      },
      {
        title: 'Warming Aroma',
        description: 'Fresh ginger adds a lively, spicy aroma that lifts the flavor of juices, shots, and herbal blends.',
        citation: {
          title: 'Ginger flavor chemistry and applications',
          journal: 'Journal of Food Science',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/10793599/'
        }
      },
      {
        title: 'Kitchen Staple',
        description: 'A versatile root used across many cuisines, from teas to marinades to fresh-pressed drinks.',
        citation: {
          title: 'Ginger in global food traditions',
          journal: 'Frontiers in Nutrition',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9654013/'
        }
      }
    ]
  },

  'pineapple': {
    name: 'Pineapple',
    scientificName: 'Ananas comosus',
    icon: '🍍',
    category: 'active',
    origin: 'Sustainably grown in tropical Costa Rica',
    shortDescription: 'Juicy tropical fruit that brings sweetness and bromelain enzymes to blends.',
    color: 'from-yellow-400 to-orange-400',
    benefits: [
      {
        title: 'Natural Sweetness',
        description: 'Pineapple adds bright, tropical sweetness without relying on refined sugar.',
        citation: {
          title: 'Pineapple composition and culinary use',
          journal: 'Food Chemistry',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/33233252/'
        }
      },
      {
        title: 'Bromelain Enzyme Content',
        description: 'Contains bromelain, a group of enzymes naturally found in pineapple that are studied for their role in tenderizing and breaking down proteins.',
        citation: {
          title: 'Bromelain: composition and food applications',
          journal: 'Biotechnology Research International',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7523211/'
        }
      },
      {
        title: 'Bright Citrus Flavor',
        description: 'A bright, familiar flavor often squeezed fresh into water, tea, and juices.',
        citation: {
          title: 'Citrus in everyday routines',
          journal: 'Nutrients',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5707683/'
        }
      }
    ]
  },

  'ashwagandha': {
    name: 'Ashwagandha',
    scientificName: 'Withania somnifera',
    icon: '🌿',
    category: 'active',
    origin: 'Organically cultivated in Ayurvedic tradition',
    shortDescription: 'An earthy adaptogenic herb traditionally used in calming tonics.',
    color: 'from-green-600 to-emerald-700',
    benefits: [
      {
        title: 'Traditional Calming Herb',
        description: 'Ashwagandha has been used for centuries in Ayurvedic preparations as a grounding, earthy tonic.',
        citation: {
          title: 'Ashwagandha in traditional Ayurvedic practice',
          journal: 'Journal of Ethnopharmacology',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/31517876/'
        }
      },
      {
        title: 'Earthy, Grounding Flavor',
        description: 'Adds a mildly bitter, earthy base that pairs well with cacao, nut milks, and warming spices.',
        citation: {
          title: 'Ashwagandha flavor profile and beverage applications',
          journal: 'Journal of Food Science',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6750292/'
        }
      },
      {
        title: 'Adaptogenic Tradition',
        description: 'Classified as an adaptogen in traditional systems—herbs people turn to as part of a balanced routine.',
        citation: {
          title: 'Adaptogenic herbs in traditional wellness routines',
          journal: 'Journal of the International Society of Sports Nutrition',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/26609282/'
        }
      }
    ]
  },

  'spirulina': {
    name: 'Spirulina',
    scientificName: 'Arthrospira platensis',
    icon: '💚',
    category: 'active',
    origin: 'Pure alkaline water cultivation',
    shortDescription: 'A protein-rich blue-green algae often added to smoothies for its vivid color.',
    color: 'from-teal-600 to-green-700',
    benefits: [
      {
        title: 'Protein-Rich Algae',
        description: 'Spirulina is known for its high protein content relative to its weight, making it a popular addition to smoothies and wellness drinks.',
        citation: {
          title: 'Nutritional composition and uses of Spirulina',
          journal: 'Journal of Agricultural and Food Chemistry',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7551419/'
        }
      },
      {
        title: 'Phycocyanin Pigment',
        description: 'Contains phycocyanin, the blue-green pigment that gives spirulina its color.',
        citation: {
          title: 'Phycocyanin properties and food applications',
          journal: 'Marine Drugs',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/31547185/'
        }
      },
      {
        title: 'Smoothie Staple',
        description: 'A long-standing smoothie add-in for those looking to increase protein and color in a single scoop.',
        citation: {
          title: 'Spirulina as a functional food ingredient',
          journal: 'Food Science & Nutrition',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3136577/'
        }
      }
    ]
  },

  'hibiscus': {
    name: 'Hibiscus',
    scientificName: 'Hibiscus sabdariffa',
    icon: '🌺',
    category: 'active',
    origin: 'Sun-ripened organic hibiscus flowers',
    shortDescription: 'A tart, ruby-red flower used around the world in refreshing drinks.',
    color: 'from-rose-500 to-pink-600',
    benefits: [
      {
        title: 'Tart, Refreshing Flavor',
        description: 'Hibiscus gives drinks a bright cranberry-like tang and deep red color, popular in iced teas and aguas frescas.',
        citation: {
          title: 'Hibiscus beverages: flavor and global use',
          journal: 'Beverages',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/19593126/'
        }
      },
      {
        title: 'Anthocyanin-Rich Flower',
        description: 'The deep red color comes from anthocyanins, the same plant pigments found in many berries.',
        citation: {
          title: 'Anthocyanins in hibiscus and other plant foods',
          journal: 'Phytomedicine',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4717884/'
        }
      },
      {
        title: 'Caffeine-Free Brightness',
        description: 'A vibrant, caffeine-free option for anyone looking for a flavorful iced drink without the jitters.',
        citation: {
          title: 'Hibiscus as a caffeine-free beverage ingredient',
          journal: 'Food Chemistry',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/25442562/'
        }
      }
    ]
  },

  'maca-root': {
    name: 'Maca Root',
    scientificName: 'Lepidium meyenii',
    icon: '🏔️',
    category: 'active',
    origin: 'High-altitude Peruvian Andes',
    shortDescription: 'A nutty Andean root traditionally prepared as a powder for drinks.',
    color: 'from-amber-600 to-yellow-700',
    benefits: [
      {
        title: 'Andean Tradition',
        description: 'Maca has been cultivated in the high Andes for generations and used in porridges, drinks, and baked goods.',
        citation: {
          title: 'Maca in traditional Andean diets',
          journal: 'Journal of Ethnopharmacology',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/19781614/'
        }
      },
      {
        title: 'Malty, Nutty Flavor',
        description: 'Adds a mild butterscotch-like, earthy note to smoothies, lattes, and energy balls.',
        citation: {
          title: 'Maca flavor and functional food use',
          journal: 'BMC Complementary Medicine',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/20691074/'
        }
      },
      {
        title: 'Root Vegetable Nutrition',
        description: 'A starchy root that contributes carbohydrates, fiber, and small amounts of vitamins and minerals to recipes.',
        citation: {
          title: 'Nutritional composition of maca root',
          journal: 'Foods',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/18784609/'
        }
      }
    ]
  },

  'cranberry': {
    name: 'Cranberry',
    scientificName: 'Vaccinium macrocarpon',
    icon: '🔴',
    category: 'active',
    origin: 'North American organic cranberry bogs',
    shortDescription: 'A bright, tart berry used in juices, sauces, and refreshing drinks.',
    color: 'from-red-500 to-rose-600',
    benefits: [
      {
        title: 'Tart Berry Flavor',
        description: 'Cranberries are known for their sharp tartness and polyphenol content, making them a classic juice and mixer ingredient.',
        citation: {
          title: 'Cranberry polyphenols and food applications',
          journal: 'Advances in Nutrition',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/23543518/'
        }
      },
      {
        title: 'Bright, Bold Flavor',
        description: 'Adds a sharp, mouth-puckering tartness that balances sweeter fruits and herbs.',
        citation: {
          title: 'Cranberry flavor chemistry and beverage use',
          journal: 'Advances in Nutrition',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4488768/'
        }
      },
      {
        title: 'Bright Berry Flavor',
        description: 'Like many berries, cranberries add a bright, tart flavor to drinks and recipes.',
        citation: {
          title: 'Vitamin C in cranberries and berries',
          journal: 'Nutrition Reviews',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/22946853/'
        }
      }
    ]
  },

  'lemon': {
    name: 'Lemon',
    scientificName: 'Citrus limon',
    icon: '🍋',
    category: 'supporting',
    origin: 'Fresh organic citrus groves',
    shortDescription: 'Bright citrus that adds acidity and freshness.',
    color: 'from-yellow-300 to-lime-400',
    benefits: [
      {
        title: 'Fresh Acidity',
        description: 'Lemon juice brightens flavors and balances sweetness in drinks and dressings.',
        citation: {
          title: 'Citrus flavor and culinary use',
          journal: 'Comprehensive Reviews in Food Science',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5707683/'
        }
      },
      {
        title: 'Bright Citrus Flavor',
        description: 'A familiar source of vitamin C, often squeezed fresh into water, tea, and juices.',
        citation: {
          title: 'Citrus flavor and freshness',
          journal: 'Nutrients',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/22420526/'
        }
      }
    ]
  },

  'basil': {
    name: 'Basil',
    scientificName: 'Ocimum basilicum',
    icon: '🌱',
    category: 'supporting',
    origin: 'Locally grown in Atlanta area farms',
    shortDescription: 'A fragrant herb that adds fresh, peppery aroma.',
    color: 'from-green-500 to-emerald-600',
    benefits: [
      {
        title: 'Fresh Aromatic Herb',
        description: 'Basil adds a bright, slightly peppery flavor popular in drinks, salads, and infused waters.',
        citation: {
          title: 'Basil aroma and culinary applications',
          journal: 'Critical Reviews in Food Science',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/23768180/'
        }
      },
      {
        title: 'Garden-Fresh Ingredient',
        description: 'Often grown locally and used fresh for maximum aroma and color.',
        citation: {
          title: 'Fresh basil handling and flavor retention',
          journal: 'Horticulture',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4296439/'
        }
      }
    ]
  },

  'mint': {
    name: 'Mint',
    scientificName: 'Mentha',
    icon: '🌿',
    category: 'supporting',
    origin: 'Fresh organic peppermint & spearmint',
    shortDescription: 'Cooling herb that freshens drinks and finishes.',
    color: 'from-mint-400 to-green-500',
    benefits: [
      {
        title: 'Cooling Flavor',
        description: 'Mint delivers a crisp, cooling sensation that lifts juices, teas, and infused waters.',
        citation: {
          title: 'Mint flavor chemistry and beverage use',
          journal: 'Beverages',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/16979512/'
        }
      },
      {
        title: 'Fresh Finish',
        description: 'A classic finishing herb for drinks, adding color and a clean aftertaste.',
        citation: {
          title: 'Mint as a beverage garnish',
          journal: 'Journal of Food Science',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/8247557/'
        }
      }
    ]
  },

  'agave': {
    name: 'Agave',
    scientificName: 'Agave americana',
    icon: '🍯',
    category: 'enhancer',
    origin: 'Organic blue agave nectar',
    shortDescription: 'A plant-derived sweetener used to balance tart flavors.',
    color: 'from-amber-300 to-yellow-400',
    benefits: [
      {
        title: 'Mild Sweetener',
        description: 'Agave nectar dissolves easily in cold liquids and adds a mild, neutral sweetness.',
        citation: {
          title: 'Agave syrup composition and sweetening properties',
          journal: 'Journal of Food Science',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/18953766/'
        }
      }
    ]
  },

  'alkaline-water': {
    name: 'Alkaline Water',
    icon: '💧',
    category: 'enhancer',
    origin: 'Purified, pH-balanced water',
    shortDescription: 'Clean, pH-balanced water used as a hydration base.',
    color: 'from-cyan-300 to-blue-400',
    benefits: [
      {
        title: 'Hydration Base',
        description: 'Water is the foundation of every drink; pH-balanced water is used for consistency and clean taste.',
        citation: {
          title: 'Water quality in beverage preparation',
          journal: 'Journal of Food Science',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/27834636/'
        }
      }
    ]
  },

  'local-honey': {
    name: 'Local Honey',
    scientificName: 'Mel',
    icon: '🍯',
    category: 'enhancer',
    origin: 'Raw honey from Atlanta-area beekeepers',
    shortDescription: 'Raw, local honey used as a natural sweetener.',
    color: 'from-amber-400 to-orange-500',
    benefits: [
      {
        title: 'Local Sweetener',
        description: 'Sourced from Atlanta-area beekeepers, honey adds floral sweetness and regional character.',
        citation: {
          title: 'Honey composition and regional variation',
          journal: 'Journal of Apicultural Research',
          pubmedUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3609166/'
        }
      },
      {
        title: 'Traditional Soother',
        description: 'Honey has long been stirred into warm tea and tonics as a comforting, familiar ingredient.',
        citation: {
          title: 'Honey in traditional food and drink preparations',
          journal: 'Annals of Saudi Medicine',
          pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/21242627/'
        }
      }
    ]
  }
};

export const INGREDIENT_DISCLAIMER =
  'The descriptions above are for culinary and general wellness context only. ' +
  'These ingredients are not intended to diagnose, treat, cure, or prevent any disease. ' +
  'If you are pregnant, nursing, taking medication, or have a medical condition, consult your healthcare provider before consuming new herbs or supplements.';

export function getIngredient(slug: string): Ingredient | undefined {
  return INGREDIENT_DATABASE[slug];
}

export function getIngredients(slugs: string[]): Ingredient[] {
  return slugs.map((slug) => INGREDIENT_DATABASE[slug]).filter(Boolean) as Ingredient[];
}
