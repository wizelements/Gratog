<<<<<<< HEAD
=======
// @ts-nocheck
>>>>>>> upstream/main
'use client';

/**
 * ContactForm - Collects customer contact information
 */

import { motion } from 'framer-motion';
import { User, Mail, Phone, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ContactInfo } from '@/stores/checkout';

interface ContactFormProps {
  contact: ContactInfo;
  onChange: (contact: Partial<ContactInfo>) => void;
  errors?: Record<string, string>;
}

export default function ContactForm({ contact, onChange, errors = {} }: ContactFormProps) {
  const [completedFields, setCompletedFields] = useState<Set<string>>(new Set());
  
  const handleFieldComplete = (fieldName: string, value: string) => {
    if (value.trim().length > 0 && !completedFields.has(fieldName)) {
      setCompletedFields(new Set([...completedFields, fieldName]));
    }
  };
  
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        <p className="text-sm text-gray-600 mb-6">
          We'll use this to send order updates and delivery notifications
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First Name */}
        <div className="relative">
          <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
            First Name *
          </Label>
          <div className="relative mt-1">
            <Input
              id="firstName"
              type="text"
              value={contact.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              onBlur={(e) => handleFieldComplete('firstName', e.target.value)}
              placeholder="John"
              className={`pr-10 ${errors.firstName ? 'border-red-500' : ''}`}
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            />
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            {completedFields.has('firstName') && !errors.firstName && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <Check className="w-4 h-4 text-emerald-500" />
              </motion.div>
            )}
          </div>
          {errors.firstName && (
            <p id="firstName-error" className="mt-1 text-xs text-red-500">
              {errors.firstName}
            </p>
          )}
        </div>
        
        {/* Last Name */}
        <div className="relative">
          <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
            Last Name *
          </Label>
          <div className="relative mt-1">
            <Input
              id="lastName"
              type="text"
              value={contact.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              onBlur={(e) => handleFieldComplete('lastName', e.target.value)}
              placeholder="Doe"
              className={`pr-10 ${errors.lastName ? 'border-red-500' : ''}`}
              aria-invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            />
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            {completedFields.has('lastName') && !errors.lastName && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <Check className="w-4 h-4 text-emerald-500" />
              </motion.div>
            )}
          </div>
          {errors.lastName && (
            <p id="lastName-error" className="mt-1 text-xs text-red-500">
              {errors.lastName}
            </p>
          )}
        </div>
      </div>
      
      {/* Email */}
      <div className="relative">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email Address *
        </Label>
        <div className="relative mt-1">
          <Input
            id="email"
            type="email"
            value={contact.email}
            onChange={(e) => onChange({ email: e.target.value })}
            onBlur={(e) => handleFieldComplete('email', e.target.value)}
            placeholder="john.doe@example.com"
            className={`pr-10 ${errors.email ? 'border-red-500' : ''}`}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            autoComplete="email"
          />
          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          {completedFields.has('email') && !errors.email && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Check className="w-4 h-4 text-emerald-500" />
            </motion.div>
          )}
        </div>
        {errors.email && (
          <p id="email-error" className="mt-1 text-xs text-red-500">
            {errors.email}
          </p>
        )}
      </div>
      
      {/* Phone */}
      <div className="relative">
        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
          Phone Number *
        </Label>
        <div className="relative mt-1">
          <Input
            id="phone"
            type="tel"
            value={contact.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            onBlur={(e) => handleFieldComplete('phone', e.target.value)}
            placeholder="(555) 123-4567"
            className={`pr-10 ${errors.phone ? 'border-red-500' : ''}`}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            autoComplete="tel"
          />
          <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          {completedFields.has('phone') && !errors.phone && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Check className="w-4 h-4 text-emerald-500" />
            </motion.div>
          )}
        </div>
        {errors.phone && (
          <p id="phone-error" className="mt-1 text-xs text-red-500">
            {errors.phone}
          </p>
        )}
      </div>
      
      {/* Save Info Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="saveInfo"
          checked={contact.saveInfo}
          onCheckedChange={(checked) => onChange({ saveInfo: !!checked })}
        />
        <label
          htmlFor="saveInfo"
          className="text-sm text-gray-700 cursor-pointer"
        >
          Save my information for faster checkout next time
        </label>
      </div>
    </motion.div>
  );
}
