import { ItineraryItem } from '../types';

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  const maxLength = Math.max(s1.length, s2.length);
  return 1 - (matrix[s2.length][s1.length] / maxLength);
}

/**
 * Normalize address for comparison (remove common variations)
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|place|pl)\b/g, '')
    .replace(/[.,#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two activities are potential duplicates
 */
function areActivitiesSimilar(item1: ItineraryItem, item2: ItineraryItem): boolean {
  // Calculate title similarity
  const titleSimilarity = calculateSimilarity(item1.title, item2.title);
  
  // Calculate address similarity (normalized)
  const addr1 = normalizeAddress(item1.address);
  const addr2 = normalizeAddress(item2.address);
  const addressSimilarity = calculateSimilarity(addr1, addr2);

  // Location proximity check (if both have valid coordinates)
  let locationSimilarity = 0;
  if (item1.location?.lat && item1.location?.lng && 
      item2.location?.lat && item2.location?.lng &&
      item1.location.lat !== 0 && item1.location.lng !== 0 &&
      item2.location.lat !== 0 && item2.location.lng !== 0) {
    
    const distance = calculateDistance(
      item1.location.lat, item1.location.lng,
      item2.location.lat, item2.location.lng
    );
    
    // Consider locations within 0.1 miles (160 meters) as very similar
    locationSimilarity = distance < 0.1 ? 1 : Math.max(0, 1 - (distance / 2));
  }

  // Consider items duplicates if:
  // 1. Title similarity > 80% AND address similarity > 70%
  // 2. OR title similarity > 90%
  // 3. OR address similarity > 90%
  // 4. OR location proximity very high (within 160m) AND title similarity > 60%
  
  const isDuplicate = 
    (titleSimilarity > 0.8 && addressSimilarity > 0.7) ||
    (titleSimilarity > 0.9) ||
    (addressSimilarity > 0.9) ||
    (locationSimilarity > 0.9 && titleSimilarity > 0.6);

  return isDuplicate;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export interface DuplicateGroup {
  items: ItineraryItem[];
  reasons: string[];
}

/**
 * Find all duplicate groups in a list of activities
 */
export function findDuplicates(activities: ItineraryItem[]): DuplicateGroup[] {
  const duplicateGroups: DuplicateGroup[] = [];
  const processedIds = new Set<string>();

  for (let i = 0; i < activities.length; i++) {
    const item1 = activities[i];
    
    if (processedIds.has(item1.id)) continue;

    const group: ItineraryItem[] = [item1];
    const reasons: string[] = [];

    for (let j = i + 1; j < activities.length; j++) {
      const item2 = activities[j];
      
      if (processedIds.has(item2.id)) continue;

      if (areActivitiesSimilar(item1, item2)) {
        group.push(item2);
        
        // Determine the reason for duplication
        const titleSim = calculateSimilarity(item1.title, item2.title);
        const addressSim = calculateSimilarity(
          normalizeAddress(item1.address), 
          normalizeAddress(item2.address)
        );
        
        if (titleSim > 0.9) {
          reasons.push('Very similar titles');
        } else if (addressSim > 0.9) {
          reasons.push('Very similar addresses');
        } else if (titleSim > 0.8 && addressSim > 0.7) {
          reasons.push('Similar title and address');
        } else {
          reasons.push('Similar location and title');
        }
      }
    }

    if (group.length > 1) {
      duplicateGroups.push({ items: group, reasons: [...new Set(reasons)] });
      group.forEach(item => processedIds.add(item.id));
    }
  }

  return duplicateGroups;
}

/**
 * Get statistics about duplicates
 */
export function getDuplicateStats(activities: ItineraryItem[]) {
  const duplicateGroups = findDuplicates(activities);
  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.items.length, 0);
  const duplicatesToRemove = duplicateGroups.reduce((sum, group) => sum + (group.items.length - 1), 0);
  
  return {
    groupCount: duplicateGroups.length,
    totalDuplicates,
    duplicatesToRemove,
    duplicateGroups
  };
}
