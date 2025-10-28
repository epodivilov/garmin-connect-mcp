/**
 * @fileoverview Personal record (PR) tracking and detection tools
 *
 * Provides comprehensive personal record management including automated PR detection from
 * activities, historical progression tracking, custom category creation, and quality scoring.
 * Automatically detects PRs for standard distances (5K, 10K, half marathon, marathon) and
 * durations (30min, 60min), supports custom categories for specialized goals, and tracks
 * PR progression over time. Essential for monitoring performance milestones, tracking
 * improvements, and celebrating achievements.
 *
 * Tools provided:
 * - getPersonalRecords: Query current PRs with flexible filtering by sport, category, or quality score
 * - getPRHistory: Retrieve PR progression history for a specific category with trend analysis
 * - detectNewPRs: Scan recent activities for new PRs with automatic quality assessment
 * - manageCustomPRCategory: Create, update, delete, or list custom PR categories (CRUD operations)
 *
 * @category Analytics
 * @see ../../services/prDetector for PR detection algorithms
 * @see ../../services/prHistoryService for progression tracking
 * @see ../../services/prCategoryService for category management
 * @see ../../storage/prStorage for PR persistence
 */

import { GarminClient } from '../../client/garmin-client.js';
import { BaseAdvancedTool } from '../base/BaseAdvancedTool.js';
import { ToolResult } from '../../types/garmin-types.js';
import { PRDetector } from '../../services/prDetector.js';
import { PRHistoryService } from '../../services/prHistoryService.js';
import { PRCategoryService } from '../../services/prCategoryService.js';
import { PRStorage } from '../../storage/prStorage.js';
import {
  PRQueryFilters,
  PRDetectionOptions,
  CustomPRCategoryInput,
  SportType,
  PRHistoryEntry,
  PRProgression
} from '../../types/personalRecords.js';
import { removeEmptyValues } from '../../utils/data-transforms.js';
import { logger } from '../../utils/logger.js';
import {
  GetPersonalRecordsParams,
  GetPRHistoryParams,
  DetectNewPRsParams,
  ManageCustomPRCategoryParams
} from '../../types/tool-params.js';

export class PersonalRecordsTools extends BaseAdvancedTool {
  private prDetector: PRDetector;
  private historyService: PRHistoryService;
  private categoryService: PRCategoryService;
  private storage: PRStorage;

  constructor(garminClient: GarminClient, storagePath?: string) {
    super(garminClient);
    this.storage = new PRStorage(storagePath);
    this.categoryService = new PRCategoryService();
    this.prDetector = new PRDetector(garminClient, this.categoryService);
    this.historyService = new PRHistoryService(this.storage);

    // Load custom categories from storage
    this.initializeCustomCategories();
  }

  /**
   * Detect new personal records from recent activities
   * @param params - Typed parameters for PR detection
   */
  async detectNewPRs(params: DetectNewPRsParams): Promise<ToolResult> {
    try {
      const maxActivities = params?.maxActivities || 1000;
      const minQuality = params?.minQuality || 70;
      const dateRange = params?.dateRange;
      const sports = params?.sports as SportType[] | undefined;
      const categories = params?.categories as string[] | undefined;
      const enableSegments = params?.enableSegments !== false;

      // Parse date range if provided
      let parsedDateRange:
        | { startDate: string; endDate: string }
        | undefined;
      if (dateRange) {
        const [startDate, endDate] = dateRange.split('/');
        parsedDateRange = { startDate, endDate };
      }

      const options: PRDetectionOptions = {
        maxActivities,
        minQuality,
        dateRange: parsedDateRange,
        sports,
        categories,
        enableSegments,
        updateHistory: true
      };

      // Detect PRs
      const detectionResult = await this.prDetector.detectPRs(options);

      // Update history for new PRs
      let updatedCount = 0;
      for (const pr of Object.values(detectionResult.prsByCategory)) {
        const result = await this.historyService.addPR(pr);
        if (result.isNewPR) {
          updatedCount++;
        }
      }

      detectionResult.updatedPRs = updatedCount;

      const cleanedData = removeEmptyValues(detectionResult);

      if (!this.validateResponseSize(cleanedData)) {
        return this.createSizeErrorResponse('PR detection data too large', {
          scannedActivities: detectionResult.scannedActivities,
          newPRsFound: detectionResult.newPRsFound,
          categories: detectionResult.summary.categories.length
        });
      }

      return this.createSuccessResponse(cleanedData);
    } catch (error) {
      return this.createErrorResponse(
        `Failed to detect new PRs: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get current personal records with optional filters
   * @param params - Typed parameters for personal records retrieval
   */
  async getPersonalRecords(params: GetPersonalRecordsParams): Promise<ToolResult> {
    try {
      const sport = params?.sport as SportType | undefined;
      const categoryType = params?.categoryType;
      const categoryId = params?.categoryId;
      const minQuality = params?.minQuality;
      const includeSummary = params?.includeSummary !== false;

      const filters: PRQueryFilters = {
        sport,
        categoryType,
        categoryId,
        minQuality
      };

      // Get all PRs
      const allPRs = await this.storage.getAllPRs();
      let prs = Object.values(allPRs);

      // Apply filters
      if (sport) {
        prs = prs.filter(pr => pr.sport === sport);
      }
      if (categoryType) {
        prs = prs.filter(pr => pr.category.type === categoryType);
      }
      if (categoryId) {
        const ids = Array.isArray(categoryId) ? categoryId : [categoryId];
        prs = prs.filter(pr => ids.includes(pr.category.id));
      }
      if (minQuality) {
        prs = prs.filter(pr => pr.quality.score >= minQuality);
      }

      // Sort by timestamp (newest first)
      prs.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const result: {
        count: number;
        personalRecords: typeof prs;
        summary?: Record<string, unknown>;
      } = {
        count: prs.length,
        personalRecords: prs
      };

      if (includeSummary) {
        result.summary = await this.historyService.getSummary();
      }

      const cleanedData = removeEmptyValues(result);

      if (!this.validateResponseSize(cleanedData)) {
        return this.createSizeErrorResponse('Personal records data too large', {
          count: prs.length,
          filters
        });
      }

      return this.createSuccessResponse(cleanedData);
    } catch (error) {
      return this.createErrorResponse(
        `Failed to get personal records: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get PR history and progression
   * @param params - Typed parameters for PR history retrieval
   */
  async getPRHistory(params: GetPRHistoryParams): Promise<ToolResult> {
    try {
      const categoryId = params?.categoryId;
      const sport = params?.sport as SportType | undefined;
      const limit = params?.limit;
      const dateRange = params?.dateRange;
      const includeProgression = params?.includeProgression !== false;

      if (!categoryId) {
        return this.createErrorResponse('Error: categoryId is required');
      }

      const result: {
        history?: PRHistoryEntry[];
        progression?: PRProgression | null;
      } = {};

      // Get history
      if (dateRange) {
        const [startDate, endDate] = dateRange.split('/');
        const history = await this.historyService.getHistory({
          categoryId,
          sport,
          dateRange: { startDate, endDate }
        });
        result.history = limit ? history.slice(0, limit) : history;
      } else {
        result.history = await this.historyService.getCategoryHistory(
          categoryId,
          limit
        );
      }

      // Get progression if requested
      if (includeProgression && sport) {
        result.progression = await this.historyService.getProgression(
          categoryId,
          sport
        );
      }

      const cleanedData = removeEmptyValues(result);

      if (!this.validateResponseSize(cleanedData)) {
        return this.createSizeErrorResponse('PR history data too large', {
          categoryId,
          historyCount: result.history?.length || 0
        });
      }

      return this.createSuccessResponse(cleanedData);
    } catch (error) {
      return this.createErrorResponse(
        `Failed to get PR history: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Manage custom PR categories (CRUD operations)
   * @param params - Typed parameters for custom category management
   */
  async manageCustomPRCategory(params: ManageCustomPRCategoryParams): Promise<ToolResult> {
    try {
      const action = params?.action as
        | 'create'
        | 'update'
        | 'delete'
        | 'list';

      if (!action) {
        return this.createErrorResponse(
          'Error: action is required (create, update, delete, or list)'
        );
      }

      if (action === 'list') {
        const categories = this.categoryService.getAllCategories();
        const customCategories = categories.filter(cat => cat.isCustom);

        return this.createSuccessResponse({
          count: customCategories.length,
          categories: customCategories,
          stats: this.categoryService.getCategoryStats()
        });
      }

      if (action === 'create') {
        const input: CustomPRCategoryInput = {
          id: params.id!,
          name: params.name!,
          type: params.type!,
          value: params.value!,
          tolerance: params.tolerance,
          sport: params.sport as SportType | undefined
        };

        const category = this.categoryService.addCustomCategory(input);
        await this.storage.saveCustomCategory(category);

        return this.createSuccessResponse({
          message: 'Custom category created successfully',
          category
        });
      }

      if (action === 'update') {
        const id = params.id;
        if (!id) {
          return this.createErrorResponse('Error: id is required for update');
        }

        const updates: Partial<CustomPRCategoryInput> = {
          name: params.name,
          value: params.value,
          tolerance: params.tolerance,
          sport: params.sport as SportType | undefined
        };

        const category = this.categoryService.updateCustomCategory(
          id,
          updates
        );
        await this.storage.saveCustomCategory(category);

        return this.createSuccessResponse({
          message: 'Custom category updated successfully',
          category
        });
      }

      if (action === 'delete') {
        const id = params.id;
        if (!id) {
          return this.createErrorResponse('Error: id is required for delete');
        }

        this.categoryService.deleteCustomCategory(id);
        await this.storage.deleteCustomCategory(id);

        return this.createSuccessResponse({
          message: 'Custom category deleted successfully',
          id
        });
      }

      return this.createErrorResponse(`Error: Unknown action: ${action}`);
    } catch (error) {
      return this.createErrorResponse(
        `Failed to manage custom category: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private async initializeCustomCategories() {
    try {
      const customCategories = await this.storage.getCustomCategories();
      this.categoryService.loadCustomCategories(customCategories);
    } catch (error) {
      logger.error('Failed to load custom categories:', error);
    }
  }
}
