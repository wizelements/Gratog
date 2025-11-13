/**
 * Type declarations for shadcn UI components
 * These components are JavaScript files without TypeScript definitions
 */

import { ReactNode, HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

declare module '@/components/ui/button' {
  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    asChild?: boolean;
    children?: ReactNode;
  }
  export const Button: React.FC<ButtonProps>;
}

declare module '@/components/ui/card' {
  export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode;
  }
  export const Card: React.FC<CardProps>;
  export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>>;
  export const CardTitle: React.FC<HTMLAttributes<HTMLHeadingElement>>;
  export const CardDescription: React.FC<HTMLAttributes<HTMLParagraphElement>>;
  export const CardContent: React.FC<HTMLAttributes<HTMLDivElement>>;
  export const CardFooter: React.FC<HTMLAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/label' {
  export interface LabelProps extends HTMLAttributes<HTMLLabelElement> {
    htmlFor?: string;
    children?: ReactNode;
  }
  export const Label: React.FC<LabelProps>;
}

declare module '@/components/ui/input' {
  export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}
  export const Input: React.FC<InputProps>;
}

declare module '@/components/ui/textarea' {
  export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}
  export const Textarea: React.FC<TextareaProps>;
}

declare module '@/components/ui/select' {
  export interface SelectProps {
    children?: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
    defaultValue?: string;
  }
  export const Select: React.FC<SelectProps>;
  export const SelectTrigger: React.FC<HTMLAttributes<HTMLButtonElement>>;
  export const SelectValue: React.FC<{ placeholder?: string }>;
  export const SelectContent: React.FC<HTMLAttributes<HTMLDivElement>>;
  export const SelectItem: React.FC<{ value: string; children?: ReactNode }>;
  export const SelectGroup: React.FC<HTMLAttributes<HTMLDivElement>>;
  export const SelectLabel: React.FC<HTMLAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/checkbox' {
  export interface CheckboxProps {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
  }
  export const Checkbox: React.FC<CheckboxProps>;
}

declare module '@/components/ui/radio-group' {
  export interface RadioGroupProps {
    value?: string;
    onValueChange?: (value: string) => void;
    children?: ReactNode;
    className?: string;
  }
  export const RadioGroup: React.FC<RadioGroupProps>;
  export const RadioGroupItem: React.FC<{ value: string; id: string; className?: string }>;
}

declare module '@/components/ui/badge' {
  export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    children?: ReactNode;
  }
  export const Badge: React.FC<BadgeProps>;
}

declare module '@/components/ui/tabs' {
  export interface TabsProps {
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
    children?: ReactNode;
    className?: string;
  }
  export const Tabs: React.FC<TabsProps>;
  export const TabsList: React.FC<HTMLAttributes<HTMLDivElement>>;
  export const TabsTrigger: React.FC<{ value: string; children?: ReactNode; className?: string }>;
  export const TabsContent: React.FC<{ value: string; children?: ReactNode; className?: string }>;
}

declare module '@/components/ui/accordion' {
  export interface AccordionProps {
    type?: 'single' | 'multiple';
    collapsible?: boolean;
    children?: ReactNode;
    className?: string;
  }
  export const Accordion: React.FC<AccordionProps>;
  export const AccordionItem: React.FC<{ value: string; children?: ReactNode; className?: string }>;
  export const AccordionTrigger: React.FC<HTMLAttributes<HTMLButtonElement>>;
  export const AccordionContent: React.FC<HTMLAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/tooltip' {
  export interface TooltipProps {
    children?: ReactNode;
  }
  export const Tooltip: React.FC<TooltipProps>;
  export const TooltipTrigger: React.FC<HTMLAttributes<HTMLButtonElement>>;
  export const TooltipContent: React.FC<{ side?: string; className?: string; children?: ReactNode }>;
  export const TooltipProvider: React.FC<{ children?: ReactNode }>;
}
