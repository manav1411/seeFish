#!/usr/bin/env node
/**
 * Build the compact SeeFish browser model from the official ABS 2021 Census
 * General Community Profile DataPack (GCCSA, Australia, short header).
 *
 * Usage:
 * Prefer `sh scripts/rebuild-abs-model.sh`, or pass an already extracted
 * DataPack directory directly to this script.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
if (!root) throw new Error('Pass the extracted DataPack directory');
const find = (name) => {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (entry.name === name) return p;
    }
  }
  throw new Error(`Missing ${name}`);
};
const csv = (name) => {
  const lines = fs.readFileSync(find(name), 'utf8').trim().split(/\r?\n/);
  const headers = lines.shift().split(',');
  return lines.map(line => Object.fromEntries(line.split(',').map((v, i) => [headers[i], i ? Number(v) : v])));
};

const g04 = [...csv('2021Census_G04A_AUST_GCCSA.csv'), ...csv('2021Census_G04B_AUST_GCCSA.csv')];
// Parts have identical rows but disjoint columns: merge by geography code.
const mergeParts = names => {
  const byCode = new Map();
  for (const name of names) for (const row of csv(name)) {
    const code = row.GCCSA_CODE_2021;
    byCode.set(code, { ...(byCode.get(code) || {}), ...row });
  }
  return byCode;
};
const ageRows = new Map();
for (const row of g04) {
  const code = row.GCCSA_CODE_2021;
  ageRows.set(code, { ...(ageRows.get(code) || {}), ...row });
}
const incomeRows = mergeParts(['2021Census_G17A_AUST_GCCSA.csv', '2021Census_G17B_AUST_GCCSA.csv', '2021Census_G17C_AUST_GCCSA.csv']);
const ancestryRows = new Map(csv('2021Census_G08_AUST_GCCSA.csv').map(r => [r.GCCSA_CODE_2021, r]));

const regions = {
  sydney: ['1GSYD'], melbourne: ['2GMEL'], brisbane: ['3GBRI'], adelaide: ['4GADE'],
  perth: ['5GPER'], hobart: ['6GHOB'], darwin: ['7GDAR'], canberra: ['8ACTE'],
};
const allRegionCodes = ['1GSYD','1RNSW','2GMEL','2RVIC','3GBRI','3RQLD','4GADE','4RSAU','5GPER','5RWAU','6GHOB','6RTAS','7GDAR','7RNTE','8ACTE','9OTER'];
regions.australia = allRegionCodes;
const ageGroups = [
  ['15_19_yrs',15,19], ['20_24_yrs',20,24], ['25_34_yrs',25,34], ['35_44_yrs',35,44],
  ['45_54_yrs',45,54], ['55_64_yrs',55,64], ['65_74_yrs',65,74], ['75_84_yrs',75,84], ['85ov',85,100],
];
const incomes = [
  ['Neg_Nil_income',0,0], ['1_149',1,149], ['150_299',150,299], ['300_399',300,399],
  ['400_499',400,499], ['500_649',500,649], ['650_799',650,799], ['800_999',800,999],
  ['1000_1249',1000,1249], ['1250_1499',1250,1499], ['1500_1749',1500,1749],
  ['1750_1999',1750,1999], ['2000_2999',2000,2999], ['3000_3499',3000,3499],
  ['3500_more',3500,null], ['PI_NS',null,null],
];
const ancestryFields = {
  australian: 'Aust_Tot_resp', aboriginal: 'Aust_Abor_Tot_resp', chinese: 'Chinese_Tot_resp',
  english: 'English_Tot_resp', filipino: 'Filipino_Tot_resp', greek: 'Greek_Tot_resp',
  indian: 'Indian_Tot_resp', irish: 'Irish_Tot_resp', italian: 'Italian_Tot_resp',
  lebanese: 'Lebanese_Tot_resp', vietnamese: 'Vietnamese_Tot_resp',
};
const model = { version: 'abs-2021-g17-v1', cells: {}, ancestry: {} };

for (const [city, codes] of Object.entries(regions)) {
  const cells = [];
  for (const sex of ['M','F']) for (const [ageKey, lo, hi] of ageGroups) {
    if (lo > 80 || hi < 18) continue;
    const ages = Array.from({ length: Math.min(80, hi) - Math.max(18, lo) + 1 }, (_, i) => Math.max(18, lo) + i);
    const exact = ages.map(age => codes.reduce((sum, code) => sum + (ageRows.get(code)?.[`Age_yr_${age}_${sex}`] || 0), 0));
    const allGroup = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const groupTotal = allGroup.reduce((sum, age) => sum + codes.reduce((s, code) => s + (ageRows.get(code)?.[`Age_yr_${age}_${sex}`] || 0), 0), 0);
    for (const [incomeKey, weeklyLow, weeklyHigh] of incomes) {
      let observed = 0;
      for (const code of codes) {
        const row = incomeRows.get(code) || {};
        const variants = [
          `${sex}_${incomeKey}_${ageKey}`,
          `${sex}_${incomeKey}_ns_${ageKey}`,
          `${sex}_${incomeKey.replace('Neg_Nil_income','Negtve_Nil_incme')}_${ageKey.replace('15_19_yrs','15_19_yrs').replace('85ov','85_yrs_ovr')}`,
        ];
        observed += Number(variants.map(k => row[k]).find(v => Number.isFinite(v)) || 0);
      }
      if (!observed || !groupTotal) continue;
      ages.forEach((age, i) => cells.push({
        a: age,
        s: sex,
        g: ageKey,
        l: weeklyLow == null ? null : weeklyLow * 52,
        h: weeklyHigh == null ? null : weeklyHigh * 52,
        t: observed,
        p: groupTotal,
        n: Math.round((observed * exact[i] / groupTotal) * 100) / 100,
      }));
    }
  }
  model.cells[city] = cells;
  const totals = {};
  let persons = 0;
  for (const code of codes) persons += ancestryRows.get(code)?.Tot_P_Tot_resp || 0;
  for (const [id, field] of Object.entries(ancestryFields)) {
    let responses = 0;
    for (const code of codes) responses += ancestryRows.get(code)?.[field] || 0;
    totals[id] = Math.min(1, responses / persons);
  }
  totals._persons = persons;
  model.ancestry[city] = totals;
}

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/abs-2021-model.json', JSON.stringify(model));
console.log(`Wrote data/abs-2021-model.json (${Buffer.byteLength(JSON.stringify(model))} bytes)`);
