/**
 * Itinera itinerary engine — pure functions for parsing and building
 * itineraries. No I/O, fully unit-testable.
 */

export interface ItineraryStep {
  startTime: string;
  endTime: string;
  title: string;
  type: string;
  venueName: string;
  venueId?: string;
  restaurantId?: string;
  address: string;
  description: string;
  cost: number;
  latitude: number;
  longitude: number;
}

export interface SuggestedOrder {
  itemType: string;
  itemName: string;
  deliveryTarget: string;
  price: number;
}

export interface ItineraryData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  groupType: string;
  groupSize: number;
  totalCost: number;
  steps: ItineraryStep[];
  suggestedOrders?: SuggestedOrder[];
}

/** Minimal shape the engine needs from a venue/restaurant record. */
export interface PlaceRecord {
  id: string;
  name: string;
  address: string;
  description: string;
  latitude: number;
  longitude: number;
  priceLevel?: number;
  avgVisitMins?: number;
  avgPricePerPerson?: number;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidTime(t: unknown): t is string {
  return typeof t === 'string' && TIME_RE.test(t);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export interface ItineraryValidationOptions {
  allowedVenueIds?: Iterable<string>;
  allowedRestaurantIds?: Iterable<string>;
}

export interface ItineraryValidationIssue {
  code:
    | 'invalid_date'
    | 'invalid_outer_window'
    | 'invalid_step_window'
    | 'overlap'
    | 'invalid_coordinates'
    | 'unknown_venue'
    | 'unknown_restaurant';
  stepIndex?: number;
  message: string;
}

export interface ItineraryValidationResult {
  valid: boolean;
  issues: ItineraryValidationIssue[];
}

/**
 * Semantic validation for already parsed itinerary data.
 *
 * The JSON parser answers "is this shaped like an itinerary?".
 * This function answers conservative product-level questions that can be
 * checked without external APIs: time ordering, coordinate ranges, and
 * whether model-selected IDs came from the current retrieval candidates.
 */
export function validateItinerarySemantics(
  itinerary: ItineraryData,
  options: ItineraryValidationOptions = {},
): ItineraryValidationResult {
  const issues: ItineraryValidationIssue[] = [];
  const venueIds = options.allowedVenueIds ? new Set(options.allowedVenueIds) : null;
  const restaurantIds = options.allowedRestaurantIds ? new Set(options.allowedRestaurantIds) : null;

  if (!isValidDate(itinerary.date)) {
    issues.push({ code: 'invalid_date', message: 'date must be a real YYYY-MM-DD calendar date' });
  }

  const outerStart = timeToMinutes(itinerary.startTime);
  const outerEnd = timeToMinutes(itinerary.endTime);
  if (outerEnd <= outerStart) {
    issues.push({ code: 'invalid_outer_window', message: 'itinerary endTime must be after startTime' });
  }

  let previousEnd: number | null = null;
  itinerary.steps.forEach((step, stepIndex) => {
    const start = timeToMinutes(step.startTime);
    const end = timeToMinutes(step.endTime);

    if (end <= start) {
      issues.push({
        code: 'invalid_step_window',
        stepIndex,
        message: 'step endTime must be after startTime',
      });
    }

    if (previousEnd !== null && start < previousEnd) {
      issues.push({
        code: 'overlap',
        stepIndex,
        message: 'step starts before the previous step ends',
      });
    }
    previousEnd = end;

    if (
      !Number.isFinite(step.latitude) ||
      !Number.isFinite(step.longitude) ||
      step.latitude < -90 ||
      step.latitude > 90 ||
      step.longitude < -180 ||
      step.longitude > 180
    ) {
      issues.push({
        code: 'invalid_coordinates',
        stepIndex,
        message: 'coordinates are outside valid latitude/longitude ranges',
      });
    }

    if (venueIds && step.venueId && !venueIds.has(step.venueId)) {
      issues.push({
        code: 'unknown_venue',
        stepIndex,
        message: 'venueId was not present in the current retrieval candidates',
      });
    }

    if (restaurantIds && step.restaurantId && !restaurantIds.has(step.restaurantId)) {
      issues.push({
        code: 'unknown_restaurant',
        stepIndex,
        message: 'restaurantId was not present in the current retrieval candidates',
      });
    }
  });

  const firstStart = timeToMinutes(itinerary.steps[0].startTime);
  const lastEnd = timeToMinutes(itinerary.steps[itinerary.steps.length - 1].endTime);
  if (outerStart > firstStart || outerEnd < lastEnd) {
    issues.push({
      code: 'invalid_outer_window',
      message: 'itinerary start/end must contain all step time windows',
    });
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Extract a ```itinerary ...``` fenced JSON block from an LLM response.
 * Validates the shape defensively — LLM output is untrusted input.
 */
export function parseItineraryFromResponse(
  content: string,
  options: ItineraryValidationOptions = {},
): ItineraryData | null {
  if (!content) return null;
  const match = content.match(/```itinerary\s*([\s\S]*?)```/);
  if (!match) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  if (!obj || typeof obj !== 'object') return null;
  if (typeof obj.title !== 'string' || !obj.title.trim()) return null;
  if (!Array.isArray(obj.steps) || obj.steps.length === 0) return null;

  const steps: ItineraryStep[] = [];
  for (const raw of obj.steps) {
    const s = raw as Record<string, unknown>;
    if (!s || typeof s !== 'object') return null;
    if (typeof s.title !== 'string' || !isValidTime(s.startTime) || !isValidTime(s.endTime)) return null;

    const lat = Number(s.latitude);
    const lng = Number(s.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    steps.push({
      startTime: s.startTime,
      endTime: s.endTime,
      title: s.title,
      type: typeof s.type === 'string' ? s.type : 'other',
      venueName: typeof s.venueName === 'string' ? s.venueName : s.title,
      venueId: typeof s.venueId === 'string' ? s.venueId : undefined,
      restaurantId: typeof s.restaurantId === 'string' ? s.restaurantId : undefined,
      address: typeof s.address === 'string' ? s.address : '',
      description: typeof s.description === 'string' ? s.description : '',
      cost: Number.isFinite(Number(s.cost)) ? Math.max(0, Number(s.cost)) : 0,
      latitude: lat,
      longitude: lng,
    });
  }

  if (obj.date !== undefined && !isValidDate(obj.date)) return null;

  const itinerary: ItineraryData = {
    title: obj.title.trim(),
    date: isValidDate(obj.date) ? obj.date : new Date().toISOString().split('T')[0],
    startTime: isValidTime(obj.startTime) ? obj.startTime : steps[0].startTime,
    endTime: isValidTime(obj.endTime) ? obj.endTime : steps[steps.length - 1].endTime,
    groupType: typeof obj.groupType === 'string' ? obj.groupType : 'friends',
    groupSize: Number.isInteger(obj.groupSize) && (obj.groupSize as number) > 0 ? (obj.groupSize as number) : 2,
    totalCost: Number.isFinite(Number(obj.totalCost)) ? Math.max(0, Number(obj.totalCost)) : 0,
    steps,
  };

  return validateItinerarySemantics(itinerary, options).valid ? itinerary : null;
}

/**
 * Deterministic fallback itinerary builder from search results.
 * Used when the LLM fails to emit structured data.
 */
export function buildFallbackItinerary(
  venues: PlaceRecord[],
  restaurants: PlaceRecord[],
  options: { isFamily?: boolean; today?: Date } = {},
): ItineraryData | null {
  const { isFamily = false, today = new Date() } = options;
  const dateStr = today.toISOString().split('T')[0];

  const activityVenue = venues[0] ?? null;
  const restaurant = restaurants[0] ?? null;
  if (!activityVenue && !restaurant) return null;

  const steps: ItineraryStep[] = [];
  let perPersonCost = 0;

  if (activityVenue) {
    const visitMins = activityVenue.avgVisitMins ?? 120;
    const cost = activityVenue.priceLevel === 1 ? 0 : activityVenue.priceLevel === 3 ? 120 : 50;
    perPersonCost += cost;

    const endTotal = 14 * 60 + visitMins;
    const endH = Math.floor(endTotal / 60);
    const endM = endTotal % 60;

    steps.push({
      startTime: '14:00',
      endTime: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
      title: `${activityVenue.name}游玩`,
      type: 'activity',
      venueName: activityVenue.name,
      venueId: activityVenue.id,
      address: activityVenue.address,
      description: activityVenue.description,
      cost,
      latitude: activityVenue.latitude,
      longitude: activityVenue.longitude,
    });

    if (restaurant) {
      const startTotal = endTotal + 30;
      const sH = Math.floor(startTotal / 60);
      const sM = startTotal % 60;
      const end2Total = startTotal + 120;
      const e2H = Math.floor(end2Total / 60);
      const e2M = end2Total % 60;
      const price = restaurant.avgPricePerPerson ?? 80;
      perPersonCost += price;

      steps.push({
        startTime: `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`,
        endTime: `${String(e2H).padStart(2, '0')}:${String(e2M).padStart(2, '0')}`,
        title: `${restaurant.name}用餐`,
        type: 'dining',
        venueName: restaurant.name,
        restaurantId: restaurant.id,
        address: restaurant.address,
        description: restaurant.description,
        cost: price,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
      });
    }
  } else if (restaurant) {
    const price = restaurant.avgPricePerPerson ?? 80;
    perPersonCost += price;
    steps.push({
      startTime: '17:00',
      endTime: '19:00',
      title: `${restaurant.name}用餐`,
      type: 'dining',
      venueName: restaurant.name,
      restaurantId: restaurant.id,
      address: restaurant.address,
      description: restaurant.description,
      cost: price,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
    });
  }

  const groupSize = isFamily ? 3 : 4;
  const suggestedOrders = isFamily && restaurant
    ? [{ itemType: 'cake', itemName: '儿童蛋糕', deliveryTarget: restaurant.name, price: 128 }]
    : [];

  return {
    title: isFamily ? '亲子半日出游' : '朋友聚会半日出游',
    date: dateStr,
    startTime: steps[0]?.startTime ?? '14:00',
    endTime: steps[steps.length - 1]?.endTime ?? '18:00',
    groupType: isFamily ? 'family' : 'friends',
    groupSize,
    totalCost: perPersonCost * groupSize,
    steps,
    suggestedOrders,
  };
}
