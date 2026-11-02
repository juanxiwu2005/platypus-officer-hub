import { z } from 'zod';
export const TimingDefaultsSchema = z.object({
    itemsWeeks: z.number().int().min(0).max(52).default(8),
    quotesWeeks: z.number().int().min(0).max(52).default(7),
    budgetWeeks: z.number().int().min(0).max(52).default(6),
});
export const DEFAULT_TIMING = { itemsWeeks: 8, quotesWeeks: 7, budgetWeeks: 6 };
export const RelativeTargetSchema = z.object({
    offsetDays: z.number().int().min(-365).max(730), // positive is BEFORE event start
    unit: z.enum(['calendar', 'business']).default('calendar'),
    source: z.enum(['organization-default', 'manual']).default('organization-default'),
});
