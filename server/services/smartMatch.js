// Haversine formula to compute distance between two lat/lng coordinates in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Number((R * c).toFixed(1));
}

function parseNaturalLanguageQuery(text = '') {
  const query = text.trim();
  const lower = query.toLowerCase();

  // 1. Duration extraction
  let durationDays = 1;
  const durationMatch = lower.match(/(\d+)\s*(days?|day|weeks?|week|months?|hours?)/i);
  if (durationMatch) {
    const num = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2].toLowerCase();
    if (unit.startsWith('week')) durationDays = num * 7;
    else if (unit.startsWith('month')) durationDays = num * 30;
    else durationDays = num;
  } else if (lower.includes('weekend')) {
    durationDays = 2;
  }

  // 2. Distance extraction
  let radiusKm = 15; // default reasonable discovery radius
  const distanceMatch = lower.match(/(?:within|under|in|around|radius of)?\s*(\d+(?:\.\d+)?)\s*(?:km|kms|kilometers|k\.m\.)/i);
  if (distanceMatch) {
    radiusKm = parseFloat(distanceMatch[1]);
  }

  // 3. Budget extraction (explicitly exclude numbers followed by days/weeks/km/hours)
  let maxBudget = null;
  const currencyMatch = lower.match(/[$₹€£]\s*(\d+(?:\.\d+)?)/i);
  if (currencyMatch) {
    maxBudget = parseFloat(currencyMatch[1]);
  } else {
    const budgetMatch = lower.match(/(?:under|below|budget of|max|less than|up to)\s*(\d+(?:\.\d+)?)(?!\s*(?:days?|weeks?|km|hours?))/i);
    if (budgetMatch) {
      maxBudget = parseFloat(budgetMatch[1]);
    }
  }

  // 4. Intent: Borrow vs Rent
  let preferBorrow = false;
  if (lower.includes('borrow') || lower.includes('free')) {
    preferBorrow = true;
  }

  // 5. Clean item keyword extraction
  let cleaned = lower
    .replace(/(?:need|want|looking for|searching for|require|can i get|i need a|i need an|to rent|to borrow|borrow|rent)/gi, '')
    .replace(/(?:for\s*\d+\s*(?:days?|weeks?|hours?|weekend))/gi, '')
    .replace(/(?:within|under|in|around|radius of)?\s*\d+(?:\.\d+)?\s*(?:km|kms|kilometers)/gi, '')
    .replace(/(?:under|below|budget of|max|less than|up to)?\s*[$₹€£]?\s*\d+(?:\.\d+)?\s*(?:bucks|dollars|rupees|\/day|per day)?/gi, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .trim();

  const stopWords = ['a', 'an', 'the', 'some', 'any', 'good', 'cheap', 'nearby', 'urgent', 'urgently', 'item', 'items', 'for'];
  const tokens = cleaned.split(/\s+/).filter(w => w.length > 1 && !stopWords.includes(w));
  const targetItem = tokens.join(' ');

  return {
    rawQuery: query,
    targetItem: targetItem || cleaned || query,
    tokens,
    durationDays,
    radiusKm,
    maxBudget,
    preferBorrow
  };
}

function scoreListing(listing, parsed, userLat, userLng) {
  let score = 0;
  const breakdown = [];

  const titleLower = listing.title.toLowerCase();
  const descLower = (listing.description || '').toLowerCase();
  const categoryLower = (listing.category_name || '').toLowerCase();

  // 1. Text & Category match (up to 40 pts)
  let textMatchScore = 0;
  if (parsed.targetItem && titleLower.includes(parsed.targetItem)) {
    textMatchScore += 40;
    breakdown.push(`Exact item match in title ("${parsed.targetItem}")`);
  } else {
    for (const token of parsed.tokens) {
      if (titleLower.includes(token)) {
        textMatchScore += 25;
        breakdown.push(`Matched keyword "${token}" in title`);
      } else if (categoryLower.includes(token)) {
        textMatchScore += 20;
        breakdown.push(`Matched category "${token}"`);
      } else if (descLower.includes(token)) {
        textMatchScore += 10;
        breakdown.push(`Matched description keyword "${token}"`);
      }
    }
  }
  score += Math.min(40, textMatchScore);

  // 2. Distance match (up to 30 pts)
  const distance = calculateDistanceKm(userLat, userLng, listing.latitude, listing.longitude);
  if (distance !== null) {
    if (distance <= parsed.radiusKm) {
      const distanceRatio = (parsed.radiusKm - distance) / parsed.radiusKm;
      const distScore = Math.round(20 + distanceRatio * 10);
      score += distScore;
      breakdown.push(`${distance} km away (within your ${parsed.radiusKm} km radius)`);
    } else {
      breakdown.push(`${distance} km away (outside preferred ${parsed.radiusKm} km radius)`);
      score -= 15;
    }
  } else {
    breakdown.push('Approximate distance in your area');
    score += 10;
  }

  // 3. Budget match (up to 20 pts)
  const totalCost = listing.rent_price_per_day * parsed.durationDays;
  if (parsed.maxBudget !== null) {
    if (listing.is_borrow_free || totalCost <= parsed.maxBudget) {
      score += 20;
      breakdown.push(
        listing.is_borrow_free 
          ? `Free to borrow (within budget)`
          : `Total $${totalCost} for ${parsed.durationDays} days is within budget of $${parsed.maxBudget}`
      );
    } else {
      score -= 15;
      breakdown.push(`Total cost ($${totalCost}) exceeds specified budget ($${parsed.maxBudget})`);
    }
  } else {
    score += 15;
    if (listing.is_borrow_free) {
      breakdown.push(`Free to borrow!`);
    } else {
      breakdown.push(`$${listing.rent_price_per_day}/day ($${totalCost} total for ${parsed.durationDays} days)`);
    }
  }

  // 4. Rent vs Borrow preference (up to 10 pts)
  if (parsed.preferBorrow && listing.is_borrow_free) {
    score += 10;
    breakdown.push(`Available for free borrowing as requested`);
  } else if (!parsed.preferBorrow) {
    score += 10;
  }

  // 5. Condition quality bonus
  if (listing.condition === 'New' || listing.condition === 'Like New') {
    score += 5;
    breakdown.push(`Excellent condition (${listing.condition})`);
  }

  const finalScore = Math.max(0, Math.min(100, score));

  return {
    score: finalScore,
    distanceKm: distance,
    totalEstimatedCost: totalCost,
    explanation: breakdown.join(' • ')
  };
}

module.exports = {
  calculateDistanceKm,
  parseNaturalLanguageQuery,
  scoreListing
};
