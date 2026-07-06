declare module '@/components/RetentionForm' {
  import * as React from 'react';

  export interface RetentionFormProps {
    intent?: string;
    source?: string;
    metadata?: Record<string, unknown>;
    title?: string;
    description?: string;
    cta?: string;
    collectEmail?: boolean;
    collectPhone?: boolean;
    requireEmail?: boolean;
    collectMessage?: boolean;
    collectMarket?: boolean;
    marketOptions?: Array<{ id: string; name: string }>;
    defaultMarket?: string;
    messagePlaceholder?: string;
    compact?: boolean;
    onSuccess?: (data: { success: boolean; persisted?: boolean; id?: string; message?: string }) => void;
  }

  const RetentionForm: React.FC<RetentionFormProps>;
  export default RetentionForm;
}
