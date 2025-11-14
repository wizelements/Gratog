// @ts-nocheck
'use client';

import { ExternalLink, BookOpen } from 'lucide-react';
import type { Ingredient } from '@/data/ingredients/shared-ingredients';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FootnotesListProps {
  ingredients: Ingredient[];
}

export function FootnotesList({ ingredients }: FootnotesListProps) {
  // Collect all unique citations
  let citationNumber = 0;
  const citations: Array<{
    number: number;
    title: string;
    journal?: string;
    year?: string;
    url: string;
    ingredient: string;
    benefit: string;
  }> = [];

  ingredients.forEach((ingredient) => {
    ingredient.benefits.forEach((benefit) => {
      citationNumber++;
      citations.push({
        number: citationNumber,
        title: benefit.citation.title,
        journal: benefit.citation.journal,
        year: benefit.citation.year,
        url: benefit.citation.pubmedUrl,
        ingredient: ingredient.name,
        benefit: benefit.title
      });
    });
  });

  return (
    <div className="mt-12 border-t-2 border-dashed border-muted pt-8">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="text-blue-600" size={24} />
        <h3 className="text-2xl font-bold text-foreground">Scientific References</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-6">
        All health claims are supported by peer-reviewed research published in scientific journals and indexed in PubMed/NIH databases.
      </p>

      <Accordion type="single" collapsible className="w-full space-y-2">
        {citations.map((citation) => (
          <AccordionItem
            key={citation.number}
            value={`citation-${citation.number}`}
            className="border rounded-lg px-4 bg-white/50 hover:bg-white/80 transition-colors"
          >
            <AccordionTrigger className="text-left hover:no-underline">
              <div className="flex items-start gap-3 text-sm">
                <span className="font-bold text-blue-600 flex-shrink-0">[{citation.number}]</span>
                <div>
                  <p className="font-semibold text-foreground">{citation.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {citation.ingredient} → {citation.benefit}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-8 space-y-2 text-sm">
                {citation.journal && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Journal:</span> {citation.journal}
                    {citation.year && ` (${citation.year})`}
                  </p>
                )}
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  <ExternalLink size={14} />
                  View Full Study on PubMed
                </a>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-8 p-4 bg-amber-50/50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-900 leading-relaxed">
          <strong>Disclaimer:</strong> These statements have not been evaluated by the Food and Drug Administration. 
          This product is not intended to diagnose, treat, cure, or prevent any disease. 
          Information provided is for educational purposes only and should not be considered medical advice. 
          Consult your healthcare provider before use, especially if pregnant, nursing, or taking medications.
        </p>
      </div>
    </div>
  );
}
