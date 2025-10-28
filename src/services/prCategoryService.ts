/**
 * PR Category Service
 *
 * Manages both standard and custom PR categories, providing
 * lookup, validation, and matching functionality.
 */

import {
  PRCategory,
  SportType,
  CustomPRCategoryInput,
  PRCategoryType
} from '../types/personalRecords.js';
import {
  ALL_STANDARD_CATEGORIES,
  CATEGORY_BY_ID,
  getCategoriesBySport,
  calculateDistanceTolerance,
  calculateDurationTolerance
} from '../constants/prCategories.js';

export class PRCategoryService {
  private customCategories: Map<string, PRCategory> = new Map();

  /**
   * Get all categories (standard + custom)
   */
  getAllCategories(): PRCategory[] {
    return [
      ...ALL_STANDARD_CATEGORIES,
      ...Array.from(this.customCategories.values())
    ];
  }

  /**
   * Get categories filtered by sport
   */
  getCategoriesBySport(sport: SportType): PRCategory[] {
    const standardCategories = getCategoriesBySport(sport);
    const customForSport = Array.from(this.customCategories.values())
      .filter(cat => !cat.sport || cat.sport === sport);

    return [...standardCategories, ...customForSport];
  }

  /**
   * Get categories filtered by type
   */
  getCategoriesByType(type: PRCategoryType): PRCategory[] {
    return this.getAllCategories().filter(cat => cat.type === type);
  }

  /**
   * Get category by ID
   */
  getCategoryById(id: string): PRCategory | undefined {
    return CATEGORY_BY_ID.get(id) || this.customCategories.get(id);
  }

  /**
   * Find matching categories for an activity
   */
  findMatchingCategories(
    distance: number,
    duration: number,
    sport: SportType
  ): PRCategory[] {
    const categories = this.getCategoriesBySport(sport);
    const matches: PRCategory[] = [];

    for (const category of categories) {
      if (this.matchesCategory(distance, duration, category)) {
        matches.push(category);
      }
    }

    return matches;
  }

  /**
   * Check if activity matches a category
   */
  matchesCategory(
    distance: number,
    duration: number,
    category: PRCategory
  ): boolean {
    if (category.type === 'distance') {
      // Match by distance
      const diff = Math.abs(distance - category.value);
      return diff <= category.tolerance;
    } else if (category.type === 'duration') {
      // Match by duration
      const diff = Math.abs(duration - category.value);
      return diff <= category.tolerance;
    }

    return false;
  }

  /**
   * Add custom category
   */
  addCustomCategory(input: CustomPRCategoryInput): PRCategory {
    // Validate input
    this.validateCustomCategory(input);

    // Calculate tolerance if not provided
    const tolerance = input.tolerance ?? (
      input.type === 'distance'
        ? calculateDistanceTolerance(input.value)
        : calculateDurationTolerance(input.value)
    );

    const category: PRCategory = {
      type: input.type,
      id: input.id,
      name: input.name,
      value: input.value,
      tolerance,
      unit: input.type === 'distance' ? 'meters' : 'seconds',
      isCustom: true,
      sport: input.sport,
      createdAt: new Date().toISOString()
    };

    this.customCategories.set(category.id, category);
    return category;
  }

  /**
   * Update custom category
   */
  updateCustomCategory(id: string, updates: Partial<CustomPRCategoryInput>): PRCategory {
    const existing = this.customCategories.get(id);
    if (!existing) {
      throw new Error(`Custom category not found: ${id}`);
    }

    if (!existing.isCustom) {
      throw new Error(`Cannot update standard category: ${id}`);
    }

    const updated: PRCategory = {
      ...existing,
      ...(updates.name && { name: updates.name }),
      ...(updates.value !== undefined && { value: updates.value }),
      ...(updates.tolerance !== undefined && { tolerance: updates.tolerance }),
      ...(updates.sport !== undefined && { sport: updates.sport })
    };

    // Recalculate tolerance if value changed but tolerance not provided
    if (updates.value !== undefined && updates.tolerance === undefined) {
      updated.tolerance = existing.type === 'distance'
        ? calculateDistanceTolerance(updates.value)
        : calculateDurationTolerance(updates.value);
    }

    this.customCategories.set(id, updated);
    return updated;
  }

  /**
   * Delete custom category
   */
  deleteCustomCategory(id: string): boolean {
    const category = this.customCategories.get(id);
    if (!category) {
      throw new Error(`Custom category not found: ${id}`);
    }

    if (!category.isCustom) {
      throw new Error(`Cannot delete standard category: ${id}`);
    }

    return this.customCategories.delete(id);
  }

  /**
   * Load custom categories from storage
   */
  loadCustomCategories(categories: Record<string, PRCategory>): void {
    this.customCategories.clear();
    for (const [id, category] of Object.entries(categories)) {
      if (category.isCustom) {
        this.customCategories.set(id, category);
      }
    }
  }

  /**
   * Export custom categories
   */
  exportCustomCategories(): Record<string, PRCategory> {
    const result: Record<string, PRCategory> = {};
    for (const [id, category] of this.customCategories.entries()) {
      result[id] = category;
    }
    return result;
  }

  /**
   * Validate custom category input
   */
  private validateCustomCategory(input: CustomPRCategoryInput): void {
    // Validate ID format
    if (!/^[a-z0-9_]+$/i.test(input.id)) {
      throw new Error('Category ID must contain only letters, numbers, and underscores');
    }

    // Check for ID conflicts
    if (CATEGORY_BY_ID.has(input.id) || this.customCategories.has(input.id)) {
      throw new Error(`Category ID already exists: ${input.id}`);
    }

    // Validate name
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Category name is required');
    }

    // Validate value
    if (input.value <= 0) {
      throw new Error('Category value must be positive');
    }

    // Validate type-specific constraints
    if (input.type === 'distance') {
      if (input.value < 50 || input.value > 1000000) {
        throw new Error('Distance must be between 50m and 1000km');
      }
    } else if (input.type === 'duration') {
      if (input.value < 60 || input.value > 86400) {
        throw new Error('Duration must be between 1 minute and 24 hours');
      }
    }

    // Validate tolerance if provided
    if (input.tolerance !== undefined) {
      if (input.tolerance <= 0) {
        throw new Error('Tolerance must be positive');
      }
      if (input.tolerance > input.value * 0.1) {
        throw new Error('Tolerance cannot exceed 10% of category value');
      }
    }
  }

  /**
   * Get category display string
   */
  getCategoryDisplayString(category: PRCategory): string {
    if (category.type === 'distance') {
      const km = category.value / 1000;
      if (km >= 1) {
        return `${km.toFixed(km % 1 === 0 ? 0 : 1)}km`;
      }
      return `${category.value}m`;
    } else {
      const hours = Math.floor(category.value / 3600);
      const minutes = Math.floor((category.value % 3600) / 60);
      const seconds = category.value % 60;

      if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      }
      if (minutes > 0) {
        return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
      }
      return `${seconds}s`;
    }
  }

  /**
   * Get statistics for all categories
   */
  getCategoryStats(): {
    total: number;
    standard: number;
    custom: number;
    byType: Record<PRCategoryType, number>;
    bySport: Record<string, number>;
  } {
    const all = this.getAllCategories();
    const byType: Record<PRCategoryType, number> = {
      distance: 0,
      duration: 0,
      custom: 0
    };
    const bySport: Record<string, number> = {};

    for (const cat of all) {
      byType[cat.type]++;
      const sport = cat.sport || 'all';
      bySport[sport] = (bySport[sport] || 0) + 1;
    }

    return {
      total: all.length,
      standard: ALL_STANDARD_CATEGORIES.length,
      custom: this.customCategories.size,
      byType,
      bySport
    };
  }
}
