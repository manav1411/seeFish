// =============================================================================
// Dating Pool Calculator Engine
//
// Computes the number of Australians matching user preferences by iterating
// over all demographic cells (city × sex × ageGroup × ethnicity) and applying
// conditional probability filters.
//
// The key formula for each demographic cell:
//
//   cellPopulation = cityPop × sexProportion × ageProportion × ethnicityProportion
//   cellMatch = cellPopulation × ageOverlap × singleRate × incomeRate × heightRate
//
// This correctly handles correlations between variables (e.g. height varies by
// ethnicity, income varies by city and ethnicity) because we compute each
// cell's specific rates rather than using independent marginals.
// =============================================================================

import {
  UserPreferences,
  CalculationResult,
  FilterBreakdown,
  AgeGroup,
  AGE_GROUPS,
  AGE_GROUP_SPANS,
  ETHNICITIES,
  Sex,
} from './types';

import {
  populationByCity,
  ethnicityByCity,
  singleRates,
  incomeAboveThreshold,
  cityIncomeMultiplier,
  ethnicityIncomeMultiplier,
  heightDistributions,
  TOTAL_ADULT_POPULATION,
} from './data/demographics';

// ---------------------------------------------------------------------------
// Math utilities
// ---------------------------------------------------------------------------

/**
 * Error function approximation (Abramowitz & Stegun formula 7.1.26).
 * Maximum error: 1.5 × 10⁻⁷
 */
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX));
  return sign * y;
}

/**
 * Normal (Gaussian) CDF — returns P(X ≤ x) for X ~ N(mean, stdDev²).
 */
function normalCDF(x: number, mean: number, stdDev: number): number {
  return 0.5 * (1 + erf((x - mean) / (stdDev * Math.SQRT2)));
}

/**
 * Returns the proportion of a normal distribution between lo and hi.
 */
function normalPropInRange(lo: number, hi: number, mean: number, stdDev: number): number {
  if (lo > hi) return 0;
  return Math.max(0, normalCDF(hi, mean, stdDev) - normalCDF(lo, mean, stdDev));
}

/**
 * Calculate what fraction of an age group [groupMin, groupMax] overlaps
 * with the user's desired range [userMin, userMax].
 *
 * Uses uniform distribution within each age group.
 */
function ageOverlapFraction(
  ageGroup: AgeGroup,
  userMin: number,
  userMax: number
): number {
  const [groupMin, groupMax] = AGE_GROUP_SPANS[ageGroup];
  const overlapMin = Math.max(groupMin, userMin);
  const overlapMax = Math.min(groupMax, userMax);

  if (overlapMin > overlapMax) return 0;

  const groupSpan = groupMax - groupMin + 1;
  const overlapSpan = overlapMax - overlapMin + 1;

  return overlapSpan / groupSpan;
}

/**
 * Clamp a value between 0 and 1.
 */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ---------------------------------------------------------------------------
// Main calculator
// ---------------------------------------------------------------------------

/**
 * The list of cities to iterate over. If the user selects a specific city,
 * we only use that one. If "any", we use all cities.
 */
function getSelectedCities(city: string): string[] {
  if (city === 'any') {
    return Object.keys(populationByCity);
  }
  if (populationByCity[city]) {
    return [city];
  }
  // Fallback: all cities
  return Object.keys(populationByCity);
}

/**
 * The list of sexes to include. If user is interested in "any", include both.
 */
function getSelectedSexes(interestedIn: Sex | 'any'): Sex[] {
  if (interestedIn === 'any') return ['male', 'female'];
  return [interestedIn];
}

/**
 * The list of ethnicity IDs to include. If empty, include all.
 */
function getSelectedEthnicities(selected: string[]): string[] {
  if (selected.length === 0) {
    return ETHNICITIES.map((e) => e.id);
  }
  return selected;
}

/**
 * Core calculation: iterates over every demographic cell and sums the
 * matching population using conditional probability filters.
 */
export function calculateDatingPool(prefs: UserPreferences): CalculationResult {
  const selectedCities = getSelectedCities(prefs.city);
  const selectedSexes = getSelectedSexes(prefs.interestedInSex);
  const selectedEthnicities = getSelectedEthnicities(prefs.ethnicities);

  // --- Total adult population for the selected area ---
  let totalAdultPop = 0;
  for (const cityId of selectedCities) {
    totalAdultPop += populationByCity[cityId].total;
  }

  // --- Accumulate matching population through each filter ---
  // We track intermediate pools to build the breakdown waterfall
  let poolAfterSex = 0;
  let poolAfterAge = 0;
  let poolAfterSingle = 0;
  let poolAfterEthnicity = 0;
  let poolAfterIncome = 0;
  let poolAfterHeight = 0;

  // Also compute "what if" pools (removing one filter at a time)
  let poolWithoutIncome = 0;
  let poolWithoutHeight = 0;
  let poolWithoutEthnicity = 0;

  for (const cityId of selectedCities) {
    const cityData = populationByCity[cityId];
    const cityEthDist = ethnicityByCity[cityId] || ethnicityByCity['rest'];
    const cityIncomeMult = cityIncomeMultiplier[cityId] || 1.0;

    for (const sex of selectedSexes) {
      const sexProportion =
        sex === 'male' ? cityData.maleProportion : 1 - cityData.maleProportion;
      const sexPop = cityData.total * sexProportion;

      for (const ageGroup of AGE_GROUPS) {
        const ageProportion = cityData.ageDistribution[ageGroup];
        const ageOverlap = ageOverlapFraction(ageGroup, prefs.ageMin, prefs.ageMax);

        if (ageOverlap === 0) continue;

        const ageGroupPop = sexPop * ageProportion;
        const ageFilteredPop = ageGroupPop * ageOverlap;

        // Single filter
        const singleRate = prefs.singleOnly
          ? singleRates[ageGroup][sex]
          : 1.0;
        const singleFilteredPop = ageFilteredPop * singleRate;

        // Income base rate for this sex × age
        const incomeData = incomeAboveThreshold[prefs.minIncome];
        const baseIncomeRate = incomeData
          ? incomeData[ageGroup][sex]
          : 1.0;

        for (const ethId of selectedEthnicities) {
          const ethProportion = cityEthDist[ethId] || 0;
          if (ethProportion === 0) continue;

          const ethPop = singleFilteredPop * ethProportion;

          // Income rate adjusted for city and ethnicity
          const ethIncomeMult = ethnicityIncomeMultiplier[ethId] || 1.0;
          const adjustedIncomeRate = clamp01(
            baseIncomeRate * cityIncomeMult * ethIncomeMult
          );
          const incomeFilteredPop = ethPop * adjustedIncomeRate;

          // Height rate for this sex × ethnicity
          const heightParams = heightDistributions[ethId]?.[sex] ||
            heightDistributions['other'][sex];
          const heightRate = normalPropInRange(
            prefs.heightMin,
            prefs.heightMax,
            heightParams.mean,
            heightParams.stdDev
          );
          const heightFilteredPop = incomeFilteredPop * heightRate;

          // Accumulate final result
          poolAfterHeight += heightFilteredPop;

          // "What if" pools (for insights)
          poolWithoutIncome += ethPop * heightRate;
          poolWithoutHeight += incomeFilteredPop;
          poolWithoutEthnicity += singleFilteredPop * adjustedIncomeRate * heightRate;
        }

        // Accumulate intermediate pools for breakdown
        // (these don't depend on ethnicity loop)
        poolAfterSex += ageGroupPop;
        poolAfterAge += ageFilteredPop;
        poolAfterSingle += singleFilteredPop;

        // For ethnicity and income intermediate totals, sum across all ethnicities
        for (const ethId of selectedEthnicities) {
          const ethProportion = cityEthDist[ethId] || 0;
          poolAfterEthnicity += singleFilteredPop * ethProportion;

          const ethIncomeMult = ethnicityIncomeMultiplier[ethId] || 1.0;
          const adjustedIncomeRate = clamp01(
            baseIncomeRate * cityIncomeMult * ethIncomeMult
          );
          poolAfterIncome += singleFilteredPop * ethProportion * adjustedIncomeRate;
        }
      }
    }
  }

  const matchingPop = Math.round(poolAfterHeight);
  const percentage = totalAdultPop > 0 ? (matchingPop / totalAdultPop) * 100 : 0;

  // --- Build the filter breakdown (waterfall) ---
  const breakdown: FilterBreakdown[] = [];

  // Location filter
  breakdown.push({
    filterName: 'city',
    label: prefs.city === 'any' ? 'Location: All of Australia' : `Location: ${capitalize(prefs.city)}`,
    poolBefore: TOTAL_ADULT_POPULATION,
    poolAfter: totalAdultPop,
    percentKept: (totalAdultPop / TOTAL_ADULT_POPULATION) * 100,
  });

  // Gender filter
  if (prefs.interestedInSex !== 'any') {
    breakdown.push({
      filterName: 'sex',
      label: `Gender: ${capitalize(prefs.interestedInSex)}`,
      poolBefore: totalAdultPop,
      poolAfter: Math.round(poolAfterSex / AGE_GROUPS.length), // average across age groups
      percentKept: getAvgSexProportion(selectedCities, prefs.interestedInSex) * 100,
    });
  }

  // Now build a sequential breakdown
  const sequentialBreakdown = buildSequentialBreakdown(prefs, totalAdultPop, matchingPop);

  // --- Generate insights ---
  const insights: string[] = [];

  // Income insight
  if (prefs.minIncome !== 'any') {
    const poolIncreaseWithoutIncome = poolWithoutIncome > 0
      ? ((poolWithoutIncome / poolAfterHeight) - 1) * 100
      : 0;
    if (poolIncreaseWithoutIncome > 10) {
      insights.push(
        `If you removed the income filter, your pool would increase by ${Math.round(poolIncreaseWithoutIncome)}%.`
      );
    }
  }

  // Height insight
  const poolIncreaseWithoutHeight = poolWithoutHeight > 0
    ? ((poolWithoutHeight / poolAfterHeight) - 1) * 100
    : 0;
  if (poolIncreaseWithoutHeight > 10 && prefs.heightMin > 140) {
    insights.push(
      `Your height preference eliminates ${Math.round((1 - poolAfterHeight / poolWithoutHeight) * 100)}% of potential matches.`
    );
  }

  // Ethnicity insight
  if (prefs.ethnicities.length > 0) {
    const poolIncreaseWithoutEthnicity = poolWithoutEthnicity > 0
      ? ((poolWithoutEthnicity / poolAfterHeight) - 1) * 100
      : 0;
    if (poolIncreaseWithoutEthnicity > 20) {
      insights.push(
        `Selecting all ethnicities would increase your pool by ${Math.round(poolIncreaseWithoutEthnicity)}%.`
      );
    }
  }

  // Age range insight
  const ageSpan = prefs.ageMax - prefs.ageMin;
  if (ageSpan <= 5) {
    insights.push(
      `Your age range is quite narrow (${ageSpan} years). Widening it by 5 years could significantly expand your pool.`
    );
  }

  // Single filter insight
  if (prefs.singleOnly) {
    insights.push(
      `About ${Math.round(getWeightedSingleRate(prefs) * 100)}% of people in your age range are single.`
    );
  }

  // --- Fun facts ---
  const funFacts: string[] = [];

  if (matchingPop > 0) {
    // Stadium comparison
    const mcgCapacity = 100_024;
    if (matchingPop >= mcgCapacity) {
      funFacts.push(
        `Your dating pool could fill the MCG ${(matchingPop / mcgCapacity).toFixed(1)} times! 🏟️`
      );
    } else {
      funFacts.push(
        `Your dating pool would fill ${Math.round((matchingPop / mcgCapacity) * 100)}% of the MCG. 🏟️`
      );
    }

    // Odds comparison
    if (percentage < 0.01) {
      funFacts.push(
        `Finding your match is rarer than a four-leaf clover (1 in ${Math.round(100 / percentage).toLocaleString()}).  🍀`
      );
    } else if (percentage < 0.1) {
      funFacts.push(
        `About 1 in every ${Math.round(100 / percentage).toLocaleString()} Australian adults fits your criteria. 🎯`
      );
    } else if (percentage < 1) {
      funFacts.push(
        `About 1 in every ${Math.round(100 / percentage)} Australian adults fits your criteria. 🎯`
      );
    }

    // City comparison
    if (matchingPop < 1000) {
      funFacts.push(
        `Your pool is about the size of a small outback town. 🏜️`
      );
    } else if (matchingPop < 10000) {
      funFacts.push(
        `Your pool is about the size of a large country town. 🌾`
      );
    } else if (matchingPop < 100000) {
      funFacts.push(
        `Your pool is about the size of a city like Ballarat or Cairns. 🏙️`
      );
    } else if (matchingPop < 500000) {
      funFacts.push(
        `Your pool is bigger than the population of Canberra! 🇦🇺`
      );
    }

    // Random encounter probability
    const randomEncounterProb = percentage / 100;
    if (prefs.city !== 'any') {
      const cityPop = populationByCity[prefs.city]?.total || totalAdultPop;
      const encounterRate = matchingPop / cityPop;
      funFacts.push(
        `If you passed every adult in ${capitalize(prefs.city)} on the street, about ${Math.round(encounterRate * 1000)} in every 1,000 would match your criteria. 🚶`
      );
    }
  }

  return {
    totalAdultPopulation: totalAdultPop,
    matchingPopulation: matchingPop,
    percentage: Math.round(percentage * 1000) / 1000,
    breakdown: sequentialBreakdown,
    insights,
    funFacts,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getAvgSexProportion(cityIds: string[], sex: Sex): number {
  let totalPop = 0;
  let sexPop = 0;
  for (const id of cityIds) {
    const city = populationByCity[id];
    totalPop += city.total;
    sexPop += city.total * (sex === 'male' ? city.maleProportion : 1 - city.maleProportion);
  }
  return totalPop > 0 ? sexPop / totalPop : 0.5;
}

function getWeightedSingleRate(prefs: UserPreferences): number {
  const sexes = getSelectedSexes(prefs.interestedInSex);
  let totalWeight = 0;
  let weightedRate = 0;

  for (const ageGroup of AGE_GROUPS) {
    const overlap = ageOverlapFraction(ageGroup, prefs.ageMin, prefs.ageMax);
    if (overlap === 0) continue;
    for (const sex of sexes) {
      const rate = singleRates[ageGroup][sex];
      weightedRate += rate * overlap;
      totalWeight += overlap;
    }
  }

  return totalWeight > 0 ? weightedRate / totalWeight : 0.5;
}

/**
 * Build a sequential breakdown showing how each filter narrows the pool.
 * Applies filters one at a time to show each filter's individual impact.
 */
function buildSequentialBreakdown(
  prefs: UserPreferences,
  totalAreaPop: number,
  finalPop: number
): FilterBreakdown[] {
  const breakdown: FilterBreakdown[] = [];
  const selectedCities = getSelectedCities(prefs.city);
  const selectedSexes = getSelectedSexes(prefs.interestedInSex);
  const selectedEthnicities = getSelectedEthnicities(prefs.ethnicities);

  let currentPool = totalAreaPop;

  // 1. Location
  if (prefs.city !== 'any') {
    breakdown.push({
      filterName: 'city',
      label: `📍 Location: ${capitalize(prefs.city)}`,
      poolBefore: TOTAL_ADULT_POPULATION,
      poolAfter: totalAreaPop,
      percentKept: (totalAreaPop / TOTAL_ADULT_POPULATION) * 100,
    });
  }

  // 2. Gender
  if (prefs.interestedInSex !== 'any') {
    const prevPool = currentPool;
    const sexProp = getAvgSexProportion(selectedCities, prefs.interestedInSex as Sex);
    currentPool = Math.round(currentPool * sexProp);
    breakdown.push({
      filterName: 'sex',
      label: `👤 Gender: ${prefs.interestedInSex === 'male' ? 'Men' : 'Women'}`,
      poolBefore: prevPool,
      poolAfter: currentPool,
      percentKept: sexProp * 100,
    });
  }

  // 3. Age range
  {
    const prevPool = currentPool;
    // Calculate weighted age proportion
    let ageProp = 0;
    for (const cityId of selectedCities) {
      const cityData = populationByCity[cityId];
      const cityWeight = cityData.total / totalAreaPop;
      for (const ag of AGE_GROUPS) {
        ageProp += cityWeight * cityData.ageDistribution[ag] * ageOverlapFraction(ag, prefs.ageMin, prefs.ageMax);
      }
    }
    currentPool = Math.round(currentPool * ageProp);
    breakdown.push({
      filterName: 'age',
      label: `🎂 Age: ${prefs.ageMin}–${prefs.ageMax}`,
      poolBefore: prevPool,
      poolAfter: currentPool,
      percentKept: ageProp * 100,
    });
  }

  // 4. Single only
  if (prefs.singleOnly) {
    const prevPool = currentPool;
    const avgSingleRate = getWeightedSingleRate(prefs);
    currentPool = Math.round(currentPool * avgSingleRate);
    breakdown.push({
      filterName: 'single',
      label: '💍 Status: Single only',
      poolBefore: prevPool,
      poolAfter: currentPool,
      percentKept: avgSingleRate * 100,
    });
  }

  // 5. Ethnicity
  if (prefs.ethnicities.length > 0) {
    const prevPool = currentPool;
    // Calculate weighted ethnicity proportion
    let ethProp = 0;
    for (const cityId of selectedCities) {
      const cityData = populationByCity[cityId];
      const cityWeight = cityData.total / totalAreaPop;
      const cityEth = ethnicityByCity[cityId] || ethnicityByCity['rest'];
      let cityEthProp = 0;
      for (const ethId of selectedEthnicities) {
        cityEthProp += cityEth[ethId] || 0;
      }
      ethProp += cityWeight * cityEthProp;
    }
    currentPool = Math.round(currentPool * ethProp);
    const selectedNames = ETHNICITIES
      .filter((e) => selectedEthnicities.includes(e.id))
      .map((e) => e.name);
    const label = selectedNames.length <= 3
      ? selectedNames.join(', ')
      : `${selectedNames.length} groups`;
    breakdown.push({
      filterName: 'ethnicity',
      label: `🌏 Ethnicity: ${label}`,
      poolBefore: prevPool,
      poolAfter: currentPool,
      percentKept: ethProp * 100,
    });
  }

  // 6. Income
  if (prefs.minIncome !== 'any') {
    const prevPool = currentPool;
    // Calculate weighted income proportion
    let incomeProp = 0;
    let totalWeight = 0;
    for (const cityId of selectedCities) {
      const cityData = populationByCity[cityId];
      const cityIncomeMult = cityIncomeMultiplier[cityId] || 1.0;
      const cityEth = ethnicityByCity[cityId] || ethnicityByCity['rest'];

      for (const sex of selectedSexes) {
        for (const ag of AGE_GROUPS) {
          const ageOverlap = ageOverlapFraction(ag, prefs.ageMin, prefs.ageMax);
          if (ageOverlap === 0) continue;

          const baseRate = incomeAboveThreshold[prefs.minIncome]?.[ag]?.[sex] ?? 1.0;

          for (const ethId of selectedEthnicities) {
            const ethProp = cityEth[ethId] || 0;
            const ethIncomeMult = ethnicityIncomeMultiplier[ethId] || 1.0;
            const adjustedRate = clamp01(baseRate * cityIncomeMult * ethIncomeMult);

            const weight = cityData.total *
              (sex === 'male' ? cityData.maleProportion : 1 - cityData.maleProportion) *
              cityData.ageDistribution[ag] *
              ageOverlap *
              ethProp;

            incomeProp += adjustedRate * weight;
            totalWeight += weight;
          }
        }
      }
    }
    const effectiveIncomeProp = totalWeight > 0 ? incomeProp / totalWeight : 1.0;
    currentPool = Math.round(currentPool * effectiveIncomeProp);
    breakdown.push({
      filterName: 'income',
      label: `💰 Income: ${prefs.minIncome === '30k' ? '$30k+' : prefs.minIncome === '50k' ? '$50k+' : prefs.minIncome === '75k' ? '$75k+' : prefs.minIncome === '100k' ? '$100k+' : prefs.minIncome === '150k' ? '$150k+' : '$200k+'}`,
      poolBefore: prevPool,
      poolAfter: currentPool,
      percentKept: effectiveIncomeProp * 100,
    });
  }

  // 7. Height
  if (prefs.heightMin > 100 || prefs.heightMax < 230) {
    const prevPool = currentPool;
    // Calculate weighted height proportion
    let heightProp = 0;
    let totalWeight = 0;
    for (const sex of selectedSexes) {
      for (const ethId of selectedEthnicities) {
        const params = heightDistributions[ethId]?.[sex] || heightDistributions['other'][sex];
        const rate = normalPropInRange(prefs.heightMin, prefs.heightMax, params.mean, params.stdDev);

        // Weight by how common this sex × ethnicity combo is
        let ethWeight = 0;
        for (const cityId of selectedCities) {
          const cityEth = ethnicityByCity[cityId] || ethnicityByCity['rest'];
          ethWeight += (cityEth[ethId] || 0) * populationByCity[cityId].total;
        }
        heightProp += rate * ethWeight;
        totalWeight += ethWeight;
      }
    }
    const effectiveHeightProp = totalWeight > 0 ? heightProp / totalWeight : 1.0;
    // Use the actual final population since height is the last filter
    currentPool = Math.round(currentPool * effectiveHeightProp);

    // Convert cm to a readable format
    const minFt = Math.floor(prefs.heightMin / 30.48);
    const minIn = Math.round((prefs.heightMin / 2.54) % 12);
    const maxFt = Math.floor(prefs.heightMax / 30.48);
    const maxIn = Math.round((prefs.heightMax / 2.54) % 12);
    breakdown.push({
      filterName: 'height',
      label: `📏 Height: ${prefs.heightMin}cm–${prefs.heightMax}cm (${minFt}'${minIn}"–${maxFt}'${maxIn}")`,
      poolBefore: prevPool,
      poolAfter: currentPool,
      percentKept: effectiveHeightProp * 100,
    });
  }

  // Reconcile: make the last breakdown item's poolAfter match the actual calculated total
  // (small rounding differences are expected due to the sequential vs joint approach)
  if (breakdown.length > 0) {
    breakdown[breakdown.length - 1].poolAfter = finalPop;
  }

  return breakdown;
}
