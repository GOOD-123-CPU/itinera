import { describe, it, expect } from 'vitest';
import { parseItineraryFromResponse, buildFallbackItinerary, validateItinerarySemantics, type PlaceRecord } from '@/lib/itinerary';

function fenced(json: string): string {
  return '```itinerary\n' + json + '\n```';
}

const validItineraryJson = JSON.stringify({
  title: '亲子半日出游',
  date: '2026-09-05',
  startTime: '14:00',
  endTime: '18:00',
  groupType: 'family',
  groupSize: 3,
  totalCost: 500,
  steps: [
    {
      startTime: '14:00', endTime: '16:00', title: '海洋馆', type: 'activity',
      venueName: '海洋馆', venueId: 'v1', address: '朝阳区', description: '看鱼',
      cost: 50, latitude: 39.9, longitude: 116.4,
    },
    {
      startTime: '16:30', endTime: '18:00', title: '餐厅', type: 'dining',
      venueName: '餐厅', restaurantId: 'r1', address: '朝阳区', description: '吃饭',
      cost: 80, latitude: 39.91, longitude: 116.41,
    },
  ],
});

describe('parseItineraryFromResponse', () => {
  it('parses a valid fenced itinerary block', () => {
    const content = `好的，为您规划如下：\n\n\`\`\`itinerary\n${validItineraryJson}\n\`\`\`\n\n祝您玩得开心！`;
    const result = parseItineraryFromResponse(content);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('亲子半日出游');
    expect(result!.steps).toHaveLength(2);
    expect(result!.steps[0].venueId).toBe('v1');
  });

  it('returns null when no fenced block exists', () => {
    expect(parseItineraryFromResponse('普通回复，没有行程')).toBeNull();
    expect(parseItineraryFromResponse('')).toBeNull();
  });

  it('returns null on invalid JSON inside the block', () => {
    expect(parseItineraryFromResponse('```itinerary\n{not json}\n```')).toBeNull();
  });

  it('rejects structurally invalid itineraries (missing steps / bad times)', () => {
    const noSteps = JSON.stringify({ title: 'X', steps: [] });
    expect(parseItineraryFromResponse(fenced(noSteps))).toBeNull();

    // '16:00' is the first step's endTime (unique in the JSON). The outer
    // startTime is intentionally fallback-tolerant, so we target step-level
    // time, which is strictly validated.
    const badTime = validItineraryJson.replace('16:00', '25:99');
    expect(parseItineraryFromResponse(fenced(badTime))).toBeNull();
  });

  it('coerces malformed numeric cost to 0 instead of crashing', () => {
    const weird = validItineraryJson.replace('"cost":50', '"cost":"abc"');
    const result = parseItineraryFromResponse(fenced(weird));
    expect(result).not.toBeNull();
    expect(result!.steps[0].cost).toBe(0);
  });

  it('rejects overlapping or reversed step time windows', () => {
    const overlapping = JSON.parse(validItineraryJson);
    overlapping.steps[1].startTime = '15:30';
    expect(parseItineraryFromResponse(fenced(JSON.stringify(overlapping)))).toBeNull();

    const reversed = JSON.parse(validItineraryJson);
    reversed.steps[0].endTime = '13:59';
    expect(parseItineraryFromResponse(fenced(JSON.stringify(reversed)))).toBeNull();
  });

  it('rejects invalid coordinates', () => {
    const bad = JSON.parse(validItineraryJson);
    bad.steps[0].latitude = 123;
    expect(parseItineraryFromResponse(fenced(JSON.stringify(bad)))).toBeNull();
  });

  it('rejects model-selected IDs that were not in current retrieval candidates', () => {
    const result = parseItineraryFromResponse(fenced(validItineraryJson), {
      allowedVenueIds: ['v2'],
      allowedRestaurantIds: ['r1'],
    });
    expect(result).toBeNull();
  });

  it('accepts IDs that were present in current retrieval candidates', () => {
    const result = parseItineraryFromResponse(fenced(validItineraryJson), {
      allowedVenueIds: ['v1'],
      allowedRestaurantIds: ['r1'],
    });
    expect(result).not.toBeNull();
  });
});

describe('validateItinerarySemantics', () => {
  it('returns actionable issue codes for product-level validation failures', () => {
    const itinerary = parseItineraryFromResponse(fenced(validItineraryJson))!;
    itinerary.steps[1].startTime = '15:00';
    const validation = validateItinerarySemantics(itinerary);
    expect(validation.valid).toBe(false);
    expect(validation.issues.some((issue) => issue.code === 'overlap')).toBe(true);
  });
});

describe('buildFallbackItinerary', () => {
  const venue: PlaceRecord = {
    id: 'v1', name: '朝阳公园', address: '朝阳区朝阳公园路',
    description: '大公园', latitude: 39.93, longitude: 116.47,
    priceLevel: 2, avgVisitMins: 150,
  };
  const restaurant: PlaceRecord = {
    id: 'r1', name: '轻食坊', address: '朝阳区幸福路',
    description: '健康轻食', latitude: 39.94, longitude: 116.48,
    avgPricePerPerson: 65,
  };

  it('builds activity + dining steps with correct times', () => {
    const result = buildFallbackItinerary([venue], [restaurant], { isFamily: true });
    expect(result).not.toBeNull();
    expect(result!.steps).toHaveLength(2);
    expect(result!.steps[0].endTime).toBe('16:30'); // 14:00 + 150min
    expect(result!.steps[1].startTime).toBe('17:00'); // +30min gap
    expect(result!.steps[1].endTime).toBe('19:00'); // +120min
  });

  it('computes total cost as perPerson * groupSize', () => {
    const result = buildFallbackItinerary([venue], [restaurant], { isFamily: true });
    // venue priceLevel 2 -> 50 + restaurant 65 = 115 per person * 3 = 345
    expect(result!.totalCost).toBe(345);
    expect(result!.groupSize).toBe(3);
  });

  it('family scenario adds a cake order targeting the restaurant', () => {
    const result = buildFallbackItinerary([venue], [restaurant], { isFamily: true });
    expect(result!.suggestedOrders).toHaveLength(1);
    expect(result!.suggestedOrders![0].deliveryTarget).toBe('轻食坊');
  });

  it('returns null when no places are available', () => {
    expect(buildFallbackItinerary([], [], { isFamily: false })).toBeNull();
  });

  it('builds dining-only itinerary when only a restaurant exists', () => {
    const result = buildFallbackItinerary([], [restaurant], { isFamily: false });
    expect(result).not.toBeNull();
    expect(result!.steps).toHaveLength(1);
    expect(result!.steps[0].type).toBe('dining');
  });
});
