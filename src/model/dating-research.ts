import type { Preferences, Profile } from './types';

export interface ResearchInsight { id: string; title: string; finding: string; takeaway: string; scope: string; source: string; url: string }
export interface MutualResearchSource { id: string; title: string; finding: string; scope: string; source: string; url: string }
export const RESEARCH: ResearchInsight[] = [
  {
    id: 'personality', title: 'Give them something a filter can’t see.',
    finding: 'In an Australian survey of 7,325 adults, trust and emotional connection mattered. Income ranked lowest of the nine traits for both sexes.',
    takeaway: 'Try an activity with time to talk. Ask a follow-up question and share something specific about yourself.',
    scope: '2016 Australian survey · published 2021 · importance ratings, not acceptance rates',
    source: 'Whyte et al. · PLOS ONE', url: 'https://doi.org/10.1371/journal.pone.0250151',
  },
  {
    id: 'age', title: 'An age range isn’t a verdict.',
    finding: 'Across 4,500 blind dates, both men and women were slightly more attracted to younger partners. Stated upper age limits did not mark a sharp drop in attraction.',
    takeaway: 'Meet through an activity you would enjoy anyway. Your age alone cannot tell us whether someone will click with you.',
    scope: '2025 US matchmaking study · adults aged 22–85 · first-date attraction',
    source: 'Eastwick et al. · PNAS', url: 'https://doi.org/10.1073/pnas.2416984122',
  },
  {
    id: 'choices', title: 'People don’t date a checklist.',
    finding: 'A study of 219,013 contact decisions on Australian dating site RSVP found differences between declared preferences and the people contacted.',
    takeaway: 'Give an introduction a chance before treating a profile filter as a final answer.',
    scope: '2017 Australian dating-site study · contact decisions, not mutual relationships',
    source: 'Whyte & Torgler · Cyberpsychology', url: 'https://doi.org/10.1089/cyber.2016.0528',
  },
  {
    id: 'education', title: 'Education adds context, not a score.',
    finding: 'Among 41,936 dating profiles, educational preferences varied with the dater’s own education, sex and age.',
    takeaway: 'A class or workshop can give you a shared topic to explore. That is a practical suggestion, not a measured dating advantage.',
    scope: '2018 Australian dating-site study · stated educational preferences',
    source: 'Whyte et al. · Psychological Science', url: 'https://doi.org/10.1177/0956797618771081',
  },
];

/**
 * Primary sources that inform the reciprocal estimate. These sources describe
 * population identity, observed pairing, or stated/revealed preferences. None
 * provides a calibrated probability that a particular Australian person will
 * be attracted to another particular person.
 */
export const MUTUAL_SOURCES: MutualResearchSource[] = [
  {
    id: 'abs-lgbti-2022',
    title: 'Estimates and characteristics of LGBTI+ populations in Australia',
    finding: 'ABS reports national age-group rates for people who identify as gay or lesbian, bisexual, or another LGB+ term.',
    scope: 'ABS 2022 national survey · ages 16+ · sexual identity, not individual availability or attraction',
    source: 'Australian Bureau of Statistics',
    url: 'https://www.abs.gov.au/statistics/people/people-and-communities/estimates-and-characteristics-lgbti-populations-australia/2022',
  },
  {
    id: 'stulp-2013',
    title: 'Are human mating preferences with respect to height reflected in actual pairings?',
    finding: 'Height preferences show up in actual pairings only modestly, with patterns such as assortative height and a male-taller norm.',
    scope: 'Stulp et al. · 2013 PLOS ONE · UK couple data · observed pairings, not a dating-rate calibration',
    source: 'Stulp, Buunk, Pollet, Nettle & Verhulst · PLOS ONE',
    url: 'https://doi.org/10.1371/journal.pone.0054186',
  },
  {
    id: 'valentova-2014',
    title: 'Preferred and actual relative height among homosexual male partners',
    finding: 'Among non-heterosexual men, preferred relative height varied with a person’s own height, dominance preference, and sex role.',
    scope: 'Valentova et al. · 2014 PLOS ONE · Czech sample of 541 non-heterosexual men · same-sex male height preferences',
    source: 'Valentova, Stulp, Třebický & Havlíček · PLOS ONE',
    url: 'https://doi.org/10.1371/journal.pone.0086534',
  },
  {
    id: 'fisman-2008',
    title: 'Racial preferences in dating: Evidence from a speed-dating experiment',
    finding: 'Revealed choices showed heterogeneous same-background preferences shaped partly by a dater’s background and place of upbringing.',
    scope: 'Fisman et al. · 2008 Review of Economic Studies · US speed-dating experiment · not an Australian ancestry matrix',
    source: 'Fisman, Iyengar, Kamenica & Simonson · Review of Economic Studies',
    url: 'https://doi.org/10.1111/j.1467-937X.2007.00465.x',
  },
  {
    id: 'prestage-2019',
    title: 'The role of age and homonegativity in racial or ethnic partner preferences among Australian gay and bisexual men',
    finding: 'A survey of Australian gay and bisexual men found wide variation in stated ethnic and racial partner preferences and associations with age and social engagement.',
    scope: 'Prestage et al. · 2019 Archives of Sexual Behavior · Australian GBM survey (n=1,853) · stated preferences, not mutual attraction rates',
    source: 'Prestage et al. · Archives of Sexual Behavior',
    url: 'https://doi.org/10.1007/s10508-018-1308-2',
  },
];

export function researchFor(preferences: Preferences, profile: Profile): ResearchInsight[] {
  const outsideAge = profile.age !== null && (profile.age < preferences.age[0] || profile.age > preferences.age[1]);
  return outsideAge ? [RESEARCH[1], RESEARCH[0], RESEARCH[2], RESEARCH[3]] : RESEARCH;
}
