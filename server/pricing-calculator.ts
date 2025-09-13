import { WorkshopPricing } from '../shared/schema';

export interface PricingCalculationOptions {
  hours: number;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'emergency';
  expertiseCategory: string;
  isAfterHours?: boolean;
  isWeekend?: boolean;
}

export interface PricingBreakdown {
  baseHours: number;
  overtimeHours: number;
  baseRate: number;
  overtimeRate: number;
  baseAmount: number;
  overtimeAmount: number;
  urgencyMultiplier: number;
  afterHoursMultiplier: number;
  weekendMultiplier: number;
  totalAmount: number;
  breakdown: string;
}

export class WorkshopPricingCalculator {
  /**
   * Calculate total pricing for workshop services with 8-hour shift structure
   */
  static calculateServicePricing(
    pricingData: WorkshopPricing,
    options: PricingCalculationOptions
  ): PricingBreakdown {
    const { hours, urgencyLevel = 'medium', expertiseCategory, isAfterHours = false, isWeekend = false } = options;
    
    // Determine base rate based on expertise category and pricing data
    const baseRate = this.getBaseRate(pricingData, expertiseCategory, urgencyLevel);
    
    if (!baseRate || baseRate <= 0) {
      throw new Error(`No pricing data available for expertise category: ${expertiseCategory}`);
    }

    // Calculate base and overtime hours (8-hour shift structure)
    const baseHours = Math.min(hours, 8);
    const overtimeHours = Math.max(0, hours - 8);
    
    // Calculate overtime rate using schema's overtime multiplier
    const overtimeMultiplier = pricingData.overtimeMultiplier || 1.5;
    const overtimeRate = baseRate * overtimeMultiplier;
    
    // Calculate base amounts
    const baseAmount = baseHours * baseRate;
    const overtimeAmount = overtimeHours * overtimeRate;
    
    // Apply multipliers for urgency, after-hours, and weekend work
    const urgencyMultiplier = this.getUrgencyMultiplier(urgencyLevel);
    const afterHoursMultiplier = isAfterHours ? 1.25 : 1.0;
    const weekendMultiplier = isWeekend ? 1.5 : 1.0;
    
    // Calculate total with all multipliers
    const subtotal = baseAmount + overtimeAmount;
    const totalAmount = subtotal * urgencyMultiplier * afterHoursMultiplier * weekendMultiplier;
    
    // Generate breakdown description
    const breakdown = this.generateBreakdown({
      baseHours,
      overtimeHours,
      baseRate,
      overtimeRate,
      baseAmount,
      overtimeAmount,
      urgencyMultiplier,
      afterHoursMultiplier,
      weekendMultiplier,
      totalAmount,
      breakdown: ''
    });

    return {
      baseHours,
      overtimeHours,
      baseRate,
      overtimeRate,
      baseAmount,
      overtimeAmount,
      urgencyMultiplier,
      afterHoursMultiplier,
      weekendMultiplier,
      totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
      breakdown
    };
  }

  /**
   * Get base rate from pricing data
   */
  private static getBaseRate(
    pricingData: WorkshopPricing,
    expertiseCategory: string,
    urgencyLevel: string
  ): number {
    // Use the base 8-hour rate from the schema
    // Urgency and specialty pricing is handled through multipliers
    return pricingData.baseRate8Hours || 0;
  }

  /**
   * Get urgency multiplier based on urgency level
   */
  private static getUrgencyMultiplier(urgencyLevel: string): number {
    switch (urgencyLevel) {
      case 'low':
        return 0.9; // 10% discount for low urgency
      case 'medium':
        return 1.0; // Standard rate
      case 'high':
        return 1.3; // 30% premium for high urgency
      case 'emergency':
        return 2.0; // 100% premium for emergency
      default:
        return 1.0;
    }
  }

  /**
   * Generate detailed pricing breakdown description
   */
  private static generateBreakdown(breakdown: PricingBreakdown): string {
    const parts = [];
    
    // Base hours
    if (breakdown.baseHours > 0) {
      parts.push(`Regular: ${breakdown.baseHours}h × $${breakdown.baseRate}/h = $${breakdown.baseAmount.toFixed(2)}`);
    }
    
    // Overtime hours
    if (breakdown.overtimeHours > 0) {
      parts.push(`Overtime: ${breakdown.overtimeHours}h × $${breakdown.overtimeRate}/h = $${breakdown.overtimeAmount.toFixed(2)}`);
    }
    
    // Multipliers
    const multipliers = [];
    if (breakdown.urgencyMultiplier !== 1.0) {
      const urgencyPercent = Math.round((breakdown.urgencyMultiplier - 1) * 100);
      multipliers.push(`Urgency: ${urgencyPercent > 0 ? '+' : ''}${urgencyPercent}%`);
    }
    if (breakdown.afterHoursMultiplier !== 1.0) {
      const afterHoursPercent = Math.round((breakdown.afterHoursMultiplier - 1) * 100);
      multipliers.push(`After-hours: +${afterHoursPercent}%`);
    }
    if (breakdown.weekendMultiplier !== 1.0) {
      const weekendPercent = Math.round((breakdown.weekendMultiplier - 1) * 100);
      multipliers.push(`Weekend: +${weekendPercent}%`);
    }
    
    if (multipliers.length > 0) {
      parts.push(`Adjustments: ${multipliers.join(', ')}`);
    }
    
    return parts.join(' | ');
  }

  /**
   * Calculate estimated pricing for a service booking
   */
  static calculateBookingEstimate(
    pricingData: WorkshopPricing[],
    expertiseCategory: string,
    estimatedHours: number,
    urgencyLevel: string = 'medium'
  ): PricingBreakdown | null {
    // Find pricing for the specific expertise category
    const relevantPricing = pricingData.find(p => 
      p.expertiseCategory === expertiseCategory && p.isActive
    );
    
    if (!relevantPricing) {
      return null;
    }
    
    return this.calculateServicePricing(relevantPricing, {
      hours: estimatedHours,
      urgencyLevel: urgencyLevel as PricingCalculationOptions['urgencyLevel'],
      expertiseCategory
    });
  }

  /**
   * Get all available pricing tiers for a workshop
   */
  static getPricingTiers(pricingData: WorkshopPricing[]): Array<{
    expertiseCategory: string;
    baseRate8Hours: number;
    overtimeMultiplier: number;
    minimumHours: number;
    currency: string;
    notes: string;
  }> {
    return pricingData
      .filter(p => p.isActive)
      .map(p => ({
        expertiseCategory: p.expertiseCategory,
        baseRate8Hours: p.baseRate8Hours || 0,
        overtimeMultiplier: p.overtimeMultiplier || 1.5,
        minimumHours: p.minimumHours || 1,
        currency: p.currency || 'USD',
        notes: p.notes || `${p.expertiseCategory} level services`
      }));
  }
}