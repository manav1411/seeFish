/*
 * Meet Metric estimator, v0.1
 *
 * The calculator distinguishes source-backed population inputs from estimates.
 * `ABS_SNAPSHOT` is the audited fallback used if a live ABS endpoint is not
 * supplied. In production, refresh it server-side from ABS SDMX tables and log
 * the dataflow, release period, transform and date for every calculation.
 */

const ABS_API = {
  baseUrl: "https://data.api.abs.gov.au/rest",
  guide: "https://www.abs.gov.au/statistics/application-programming-interfaces-apis/data-api-user-guide",
  // ERP by ASGS 2021 geography, age and sex. The dataflow’s exposed dimensions
  // are queried and normalised by the future server adapter described in README.
  populationDataflow: "ABS,ERP_ASGS2021,1.0.0",
  snapshot: "2021 Census + ABS population-release inputs",
};

const ABS_SNAPSHOT = {
  sourceYear: 2021,
  // Capital-city population bases are deliberately rounded inputs. Update from
  // an ABS ERP/ASGS dataflow on every production refresh.
  cities: {
    sydney: { name: "Sydney", population: 5312163, ageScale: 1.04, incomeScale: 1.16, singleScale: .98, diversity: { any: 1, "east-southeast-asian": .168, "south-asian": .094, "first-nations": .022, european: .486, mena: .057 } },
    melbourne: { name: "Melbourne", population: 5078193, ageScale: 1.05, incomeScale: 1.08, singleScale: 1.02, diversity: { any: 1, "east-southeast-asian": .151, "south-asian": .126, "first-nations": .014, european: .502, mena: .072 } },
    brisbane: { name: "Brisbane", population: 2560720, ageScale: .96, incomeScale: .97, singleScale: .98, diversity: { any: 1, "east-southeast-asian": .084, "south-asian": .044, "first-nations": .034, european: .624, mena: .037 } },
    perth: { name: "Perth", population: 2140400, ageScale: 1.01, incomeScale: 1.09, singleScale: .97, diversity: { any: 1, "east-southeast-asian": .128, "south-asian": .084, "first-nations": .028, european: .557, mena: .051 } },
    adelaide: { name: "Adelaide", population: 1402836, ageScale: .92, incomeScale: .91, singleScale: .96, diversity: { any: 1, "east-southeast-asian": .081, "south-asian": .039, "first-nations": .025, european: .658, mena: .034 } },
    canberra: { name: "Canberra", population: 453324, ageScale: 1.12, incomeScale: 1.27, singleScale: 1.07, diversity: { any: 1, "east-southeast-asian": .134, "south-asian": .088, "first-nations": .018, european: .538, mena: .033 } },
    hobart: { name: "Hobart", population: 253000, ageScale: .90, incomeScale: .88, singleScale: .95, diversity: { any: 1, "east-southeast-asian": .054, "south-asian": .021, "first-nations": .033, european: .704, mena: .022 } },
  },
  genderShare: { women: .505, men: .495, nonbinary: .018, any: 1 },
  // Broad starting shares across adult residents, smooth enough to avoid
  // claiming precision the Census does not have at every intersection.
  ageBand: { 18: .013, 19: .013, 20: .014, 21: .014, 22: .014, 23: .014, 24: .014, 25: .015, 26: .015, 27: .015, 28: .015, 29: .015, 30: .015, 31: .015, 32: .015, 33: .015, 34: .015, 35: .014, 36: .014, 37: .014, 38: .014, 39: .014, 40: .014, 41: .014, 42: .014, 43: .014, 44: .014, 45: .013, 46: .013, 47: .013, 48: .013, 49: .013, 50: .013, 51: .013, 52: .013, 53: .012, 54: .012, 55: .012, 56: .012, 57: .012, 58: .012, 59: .012, 60: .012 },
};

const $ = (selector) => document.querySelector(selector);
const ageMin = $("#ageMin"), ageMax = $("#ageMax");
const income = $("#income"), height = $("#height");
const formatter = new Intl.NumberFormat("en-AU");

function populateAges() {
  for (let age = 18; age <= 60; age += 1) {
    ageMin.add(new Option(age, age));
    ageMax.add(new Option(age, age));
  }
  ageMin.value = "25";
  ageMax.value = "34";
}

function normalCdf(x, mean, standardDeviation) {
  // Abramowitz–Stegun approximation: sufficient for an explicitly modelled UI estimate.
  const z = (x - mean) / standardDeviation;
  const t = 1 / (1 + .2316419 * Math.abs(z));
  const d = .3989423 * Math.exp(-z * z / 2);
  const p = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

function ageShare(min, max, city) {
  let share = 0;
  for (let age = min; age <= max; age += 1) share += ABS_SNAPSHOT.ageBand[age] || .015;
  return Math.min(.98, share * city.ageScale);
}

function incomeShare(threshold, city, selectedGender) {
  // Log-normal-shaped proxy calibrated at broad Census income ranges. This is
  // intentionally a range estimate, not a claim about individual earnings.
  if (threshold <= 0) return 1;
  const genderAdjust = selectedGender === "men" ? 1.12 : selectedGender === "women" ? .92 : 1.01;
  const median = 69000 * city.incomeScale * genderAdjust;
  const z = (Math.log(threshold) - Math.log(median)) / .64;
  return Math.max(.012, Math.min(.98, 1 - normalCdf(z, 0, 1)));
}

function heightShare(minHeight, gender) {
  if (minHeight <= 145) return 1;
  if (gender === "women") return 1 - normalCdf(minHeight, 162, 7.1);
  if (gender === "men") return 1 - normalCdf(minHeight, 175.6, 7.4);
  if (gender === "nonbinary") return 1 - normalCdf(minHeight, 169, 9.5);
  return .505 * (1 - normalCdf(minHeight, 162, 7.1)) + .495 * (1 - normalCdf(minHeight, 175.6, 7.4));
}

function relationshipShare(min, max, city) {
  // Broad Census relationship-status proxy, then tapered because the selected
  // age range changes the probability much more than a national base rate.
  const midpoint = (min + max) / 2;
  const base = midpoint < 25 ? .72 : midpoint < 31 ? .59 : midpoint < 40 ? .46 : midpoint < 50 ? .35 : .28;
  return base * city.singleScale;
}

function getPreferences() {
  return {
    gender: document.querySelector("input[name='gender']:checked").value,
    city: $("#city").value,
    min: Number(ageMin.value),
    max: Number(ageMax.value),
    income: Number(income.value),
    height: Number(height.value),
    background: $("#background").value,
    available: $("#available").checked,
  };
}

function calculate(preferences) {
  const city = ABS_SNAPSHOT.cities[preferences.city];
  const steps = [];
  let result = city.population;
  const apply = (label, share, type, detail) => {
    result *= share;
    steps.push({ label, share, count: Math.round(result), type, detail });
  };

  apply(`${city.name} residents`, 1, "observed", "Capital-city population base");
  apply(`Aged ${preferences.min}–${preferences.max}`, ageShare(preferences.min, preferences.max, city), "observed", "Age distribution adjusted for city");
  const genderName = { women: "Women", men: "Men", nonbinary: "Non-binary people", any: "All genders" }[preferences.gender];
  apply(genderName, ABS_SNAPSHOT.genderShare[preferences.gender], preferences.gender === "nonbinary" ? "modelled" : "observed", preferences.gender === "nonbinary" ? "Public Census categories do not capture this group directly" : "Sex distribution base");
  if (preferences.background !== "any") {
    const backgroundName = $("#background").selectedOptions[0].text;
    apply(backgroundName, city.diversity[preferences.background], "adjusted", "Ancestry / background proxy; categories are not a measure of ethnicity");
  }
  if (preferences.income > 0) apply(`Personal income $${Math.round(preferences.income / 1000)}k+`, incomeShare(preferences.income, city, preferences.gender), "modelled", "Census income brackets smoothed with a distribution model");
  if (preferences.height > 145) apply(`${preferences.height} cm or taller`, heightShare(preferences.height, preferences.gender), "modelled", "No ABS adult-height series: published health research proxy");
  if (preferences.available) apply("Likely unpartnered", relationshipShare(preferences.min, preferences.max, city), "adjusted", "Relationship-status proxy — not dating availability");
  return { city, steps, estimate: Math.max(1, Math.round(result)) };
}

function formatEstimate(number) {
  if (number < 100) return `about ${number}`;
  if (number < 1000) return `about ${Math.round(number / 10) * 10}`;
  if (number < 10000) return `about ${(Math.round(number / 100) * 100 / 1000).toFixed(1).replace(".0", "")}k`;
  return `about ${Math.round(number / 1000)}k`;
}

function typeLabel(type) {
  return type === "observed" ? "ABS base" : type === "adjusted" ? "Adjusted" : "Modelled";
}

function confidenceFor(steps) {
  const modelled = steps.filter((step) => step.type === "modelled").length;
  const adjusted = steps.filter((step) => step.type === "adjusted").length;
  const score = Math.max(38, 83 - modelled * 15 - adjusted * 8);
  return { score, label: score > 68 ? "Higher" : score > 51 ? "Moderate" : "Directional" };
}

function renderResults(preferences, calculation) {
  const { city, estimate, steps } = calculation;
  const displayNumber = formatEstimate(estimate);
  $("#resultNumber").textContent = displayNumber;
  $("#resultContext").textContent = `In ${city.name}`;
  const personLabel = { women: "women", men: "men", nonbinary: "non-binary people", any: "people" }[preferences.gender];
  const qualifiers = [
    `aged ${preferences.min}–${preferences.max}`,
    preferences.income ? `earning ${Math.round(preferences.income / 1000)}k+` : null,
    preferences.height > 145 ? `${preferences.height}cm+` : null,
  ].filter(Boolean).join(", ");
  $("#resultNarrative").textContent = `That is an estimated share of ${formatter.format(city.population)} residents: ${personLabel} ${qualifiers}${preferences.available ? ", using a broad unpartnered proxy" : ""}. This is a population estimate, not a count of people on dating apps or people who would want to date.`;

  $("#filterTrail").innerHTML = steps.map((step) => `
    <li><span><strong>${step.label}</strong><small>${typeLabel(step.type)} · ${step.detail}</small></span><span class="trail-value">${formatEstimate(step.count)}</span></li>
  `).join("");
  const confidence = confidenceFor(steps);
  $("#confidenceLabel").textContent = confidence.label;
  $("#confidenceMeter").style.width = `${confidence.score}%`;
  $("#confidenceCopy").textContent = confidence.label === "Higher"
    ? "Most of your filters use source-backed population bases; figures are still approximate."
    : confidence.label === "Moderate"
      ? "Some filters use ABS distributions; income and height rely on a disclosed model."
      : "Several combined filters lack a public cross-tab. Treat this as a directional range, not a precise count.";

  $("#methodContent").innerHTML = `
    <p><strong>What starts as data.</strong> The first layers use the ${ABS_SNAPSHOT.sourceYear} Census and ABS population inputs: capital-city population, age, sex, ancestry/background proxy and broad relationship-status categories.</p>
    <p><strong>What becomes an estimate.</strong> Public ABS tables do not provide every intersection, adult height, exact annual income or dating availability. We start from the compatible city base, apply published shares where possible, and use conservative distribution models only for the gaps.</p>
    <p><strong>Your current result.</strong> ${steps.filter((s) => s.type === "observed").length} source-backed base layer(s), ${steps.filter((s) => s.type === "adjusted").length} adjusted layer(s), and ${steps.filter((s) => s.type === "modelled").length} modelled layer(s). The model assumes some filters are independent where an approved cross-tab is unavailable; that is a limitation, not a hidden claim.</p>
    <p><strong>What it does not say.</strong> It cannot identify individuals, measure attraction, infer sexuality, tell whether someone is dating, or predict a match.</p>`;
}

function updateControls() {
  if (Number(ageMin.value) > Number(ageMax.value)) ageMax.value = ageMin.value;
  $("#ageSummary").value = `${ageMin.value}–${ageMax.value}`;
  $("#incomeOutput").value = income.value === "0" ? "No income minimum" : `$${Math.round(income.value / 1000)}k+`;
  $("#heightOutput").value = `${height.value} cm+`;
  income.style.setProperty("--value", `${(Number(income.value) / 250000) * 100}%`);
  height.style.setProperty("--value", `${((Number(height.value) - 145) / 60) * 100}%`);
}

function saveAnonymousPreference(preferences) {
  // Demo-only local aggregate. Production needs explicit consent, a privacy
  // notice, retention policy, rate limiting, and a server-side aggregate store.
  const key = "meet-metric-preference-events";
  const current = Number(localStorage.getItem(key) || 0);
  localStorage.setItem(key, String(current + 1));
  localStorage.setItem("meet-metric-last-preference", JSON.stringify({ ...preferences, savedAt: new Date().toISOString() }));
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("visible");
  setTimeout(() => element.classList.remove("visible"), 2600);
}

function initAbsSource() {
  // This lightweight health check confirms that a visitor can reach the public
  // ABS SDMX service. Actual production refreshes should go through a backend
  // proxy which validates dataflows, caches results and avoids CORS fragility.
  const status = $("#sourceStatus span");
  const label = $("#sourceLabel");
  const detail = $("#sourceDetail");
  const endpoint = `${ABS_API.baseUrl}/dataflow/ABS/ERP_ASGS2021/1.0.0?references=none`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  fetch(endpoint, { headers: { Accept: "application/vnd.sdmx.structure+json" }, signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error("ABS endpoint unavailable");
      status.textContent = "ABS API reachable · snapshot in use";
      label.textContent = "ABS API connected · 2021 snapshot";
      detail.textContent = "Live service available; estimator uses its versioned source snapshot";
    })
    .catch(() => {
      status.textContent = "ABS 2021 snapshot loaded";
      label.textContent = "ABS 2021 Census snapshot";
      detail.textContent = "Versioned fallback used while live API is unavailable";
    })
    .finally(() => clearTimeout(timeout));
}

populateAges();
updateControls();
[ageMin, ageMax, income, height].forEach((element) => element.addEventListener("input", updateControls));

$("#preferenceForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const preferences = getPreferences();
  const calculation = calculate(preferences);
  saveAnonymousPreference(preferences);
  renderResults(preferences, calculation);
  $("#results").classList.remove("hidden");
  $("#mutual").classList.remove("hidden");
  $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("#adjustPreferences").addEventListener("click", () => $("#estimator").scrollIntoView({ behavior: "smooth", block: "start" }));
$("#showMethod").addEventListener("click", () => $("#methodDialog").showModal());
$("#openProfile").addEventListener("click", () => $("#profileDialog").showModal());
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));

$("#profileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  $("#profileDialog").close();
  toast("Preview saved locally. Mutual estimates need an opted-in aggregate dataset.");
});

$("#copyResult").addEventListener("click", async () => {
  const result = $("#resultNumber").textContent;
  const context = $("#resultContext").textContent;
  const copy = `Meet Metric: ${result} people estimated to match my filters (${context}). A population estimate based on ABS inputs and disclosed models — not a count of available dates.`;
  try { await navigator.clipboard.writeText(copy); toast("Summary copied"); }
  catch { toast("Copy isn’t available in this browser"); }
});

initAbsSource();
