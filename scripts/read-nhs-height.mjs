#!/usr/bin/env node
// Extract the published mean/median height rows from ABS NHS 2022 Table 8.
// This deliberately uses only Node and the system unzip command.
import { execFileSync } from 'node:child_process';
const file = process.argv[2];
if (!file) throw new Error('Pass NHSDC08.xlsx');
const read = name => execFileSync('unzip', ['-p', file, name], { encoding: 'utf8' });
const strings = [...read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match =>
  [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('')
);
const rows = [...read('xl/worksheets/sheet2.xml').matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].map(match => {
  const cells = {};
  for (const cell of match[2].matchAll(/<c[^>]*r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)) {
    const value = cell[3].match(/<v>(.*?)<\/v>/)?.[1];
    cells[cell[1]] = value == null ? null : cell[2].includes('t="s"') ? strings[Number(value)] : Number(value);
  }
  return { row: Number(match[1]), ...cells };
});
const male = rows.find(row => row.row === 57);
const female = rows.find(row => row.row === 85);
const columns = ['C', 'D', 'E', 'F', 'G', 'M', 'N'];
const result = {
  ageGroups: ['18–24', '25–34', '35–44', '45–54', '55–64', '65–74', '75+'],
  men: columns.map(column => male?.[column]),
  women: columns.map(column => female?.[column]),
};
const expected = JSON.stringify({ ageGroups: result.ageGroups, men: [177.4,176.4,175.6,175.6,173.6,172.3,170.2], women: [162.9,163.4,162.9,162.5,160.7,158.7,157.1] });
if (JSON.stringify(result) !== expected) throw new Error('NHS Table 8 height values differ from the reviewed snapshot');
console.log(JSON.stringify(result, null, 2));
// Labels are sometimes in column B; emit the surrounding rows for stable inspection.
const matches = rows.filter(row => Object.values(row).some(value => String(value).toLowerCase().includes('measured height')));
if (!matches.length) throw new Error('Average measured height row not found');
