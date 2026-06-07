/**
 * Menu Types
 * Shared types for admin and public menu data
 */

export interface MenuDocument {
  _id: import('mongodb').ObjectId;
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  canvaUrl?: string;
  printUrl?: string;
  marketId?: string;
  weekStart: Date;
  weekEnd: Date;
  isActive: boolean;
  isArchived?: boolean;
  linkedProducts?: string[];
  seasonalTags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminMenu {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  canvaUrl?: string;
  printUrl?: string;
  marketId?: string;
  weekStart: string;
  weekEnd: string;
  isActive: boolean;
  isArchived?: boolean;
  linkedProducts?: string[];
  seasonalTags?: string[];
  createdAt: string;
  updatedAt: string;
}
