// @ts-nocheck
'use client';

import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ExternalLink } from 'lucide-react';
import type { IngredientCitation } from '@/data/ingredients/shared-ingredients';

interface CitationTooltipProps {
  citation: IngredientCitation;
  citationNumber: number;
}

export function CitationTooltip({ citation, citationNumber }: CitationTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={citation.pubmedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center ml-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            [{citationNumber}]
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm p-4">
          <div className="space-y-2">
            <p className="font-semibold text-sm">{citation.title}</p>
            {citation.journal && (
              <p className="text-xs text-muted-foreground">
                {citation.journal}
                {citation.year && ` (${citation.year})`}
              </p>
            )}
            <div className="flex items-center gap-1 text-xs text-blue-600 pt-2">
              <ExternalLink size={12} />
              <span>View on PubMed</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
