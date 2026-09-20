import type { Preferences, Profile, CityId } from './types';

export interface Activity {
  id: string;
  title: string;
  why: string;
  action: string;
  url: string;
  source: string;
  checkedAt: string;
}

const CHECKED_AT = '2026-09-20';
const PARKRUN_AU = 'https://resources.parkrun.com/australia';
const INDIA_AU = 'https://india.com.au/';
const VOLUNTEERING_AU = 'https://www.dss.gov.au/volunteering/site/index.html';

// These are names used by the official parkrun directory or local event pages.
// The national page is deliberately used as the stable link: it lets a person
// confirm the current local start time before attending.
const PARKRUN_NAMES: Record<Exclude<CityId, 'australia'>, string> = {
  sydney: 'A Saturday at Centennial parkrun',
  melbourne: 'A lap of Albert Melbourne parkrun',
  brisbane: 'Brisbane parkrun options',
  perth: 'Perth parkrun options',
  adelaide: 'Adelaide parkrun options',
  canberra: 'Canberra parkrun options',
  hobart: 'Hobart parkrun options',
  darwin: 'Darwin parkrun at Bicentennial Park',
};

const CITY_LABELS: Record<CityId, string> = {
  australia: 'Australia',
  sydney: 'Sydney',
  melbourne: 'Melbourne',
  brisbane: 'Brisbane',
  perth: 'Perth',
  adelaide: 'Adelaide',
  canberra: 'Canberra',
  hobart: 'Hobart',
  darwin: 'Darwin',
};

const indianLinks: Record<CityId, { title: string; url: string; source: string }> = {
  australia: { title: 'Indian community events across Australia', url: INDIA_AU, source: 'India.com.au events and city directory' },
  sydney: { title: 'Sydney Gujarati garba and cultural events', url: 'https://gujaratisamaj.org.au/', source: 'Gujarati Samaj of Sydney' },
  melbourne: { title: 'Melbourne Gujarati Navratri and cultural events', url: 'https://gav.org.au/', source: 'Gujarati Association of Victoria' },
  brisbane: { title: 'Brisbane Holi and Indian cultural events', url: 'https://holifestival.au/', source: 'Holi Festival Australia' },
  perth: { title: 'Perth Holi and Indian cultural events', url: 'https://holifestival.au/', source: 'Holi Festival Australia' },
  adelaide: { title: 'Adelaide Holi and Indian cultural events', url: 'https://holifestival.au/', source: 'Holi Festival Australia' },
  canberra: { title: 'Canberra Holi and Indian cultural events', url: 'https://holifestival.au/', source: 'Holi Festival Australia' },
  hobart: { title: 'Hobart Indian cultural events', url: 'https://www.icstas.org.au/', source: 'Indian Cultural Society of Tasmania' },
  darwin: { title: 'Darwin Indian cultural events', url: 'https://nt.gov.au/community/multicultural-communities/multicultural-communities-and-religions/indian', source: 'Northern Territory Government Indian community profile' },
};

const cityFor = (preferences: Preferences, profile: Profile): CityId =>
  profile.city != null && profile.city !== 'australia' ? profile.city : preferences.city;

const wantsIndian = (preferences: Preferences): boolean =>
  preferences.backgrounds.some((value) => value.toLowerCase() === 'indian');

const hasIndianBackground = (profile: Profile): boolean =>
  profile.backgrounds.some((value) => value.toLowerCase() === 'indian');

export function getActivities(preferences: Preferences, profile: Profile): Activity[] {
  const city = cityFor(preferences, profile);
  const cityName = CITY_LABELS[city];
  const localParkrun = city === 'australia'
    ? 'parkrun Australia — choose a local 5k'
    : PARKRUN_NAMES[city];
  const broad: Activity = {
    id: `parkrun-${city}`,
    title: localParkrun,
    why: 'A free, recurring community activity with simple ways to participate at your own pace.',
    action: city === 'darwin' ? 'Walk or volunteer, then join the post-event coffee the organisers invite everyone to.' : city === 'australia'
      ? 'Choose a city, check its event page, then walk, run, or volunteer.'
      : 'Register free, try the walk or ask about marshalling. Make it a regular part of your weekend.',
    url: city === 'melbourne' ? 'https://www.parkrun.com.au/albertmelbourne/' : city === 'darwin' ? 'https://www.parkrun.com.au/darwin/' : city === 'sydney' ? 'https://www.activeandhealthy.nsw.gov.au/program/view/3489' : PARKRUN_AU,
    source: 'parkrun Australia',
    checkedAt: CHECKED_AT,
  };

  if (!wantsIndian(preferences)) {
    return [broad, {
      id: `volunteering-${city}`,
      title: city === 'australia' ? 'Find a local volunteer role' : `Volunteer in ${cityName}`,
      why: 'A practical way to contribute locally, learn a shared task, and meet people through repeated participation.',
      action: 'Search by city and interest, then check the organisation’s requirements before applying.',
      url: VOLUNTEERING_AU,
      source: 'Australian Government volunteering directory',
      checkedAt: CHECKED_AT,
    }];
  }

  const link = indianLinks[city];
  const shared = hasIndianBackground(profile);
  const cultural: Activity = {
    id: `indian-cultural-${city}`,
    title: link.title,
    why: shared
      ? 'A shared Indian background offers a starting point for conversation while you explore this organiser’s programme.'
      : 'Explore one specific tradition, such as Gujarati garba or Holi, without treating Indian culture as one single experience.',
    action: city === 'melbourne' || city === 'sydney'
      ? 'Ask about beginner Garba practice before Navratri. Learn a few steps, bring a friend, and join in.'
      : shared ? 'Choose a cultural programme you enjoy. Ask about helping with setup or joining a community activity.'
      : 'Read the description, choose one tradition you want to learn, and ask about a newcomer-friendly activity.',
    url: link.url,
    source: link.source,
    checkedAt: CHECKED_AT,
  };
  return [cultural, broad].slice(0, 2);
}
