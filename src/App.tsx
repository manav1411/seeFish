import { useMemo, useState, useDeferredValue, useEffect } from 'react';
import { ArrowLeft, ArrowUpRight, ChevronDown, Instagram, RotateCcw } from 'lucide-react';
import ParticleMap from './components/ParticleMap';
import CompactRange from './components/CompactRange';
import SingleValue from './components/SingleValue';
import AboutResults from './components/AboutResults';
import AnimatedCount from './components/AnimatedCount';
import { BACKGROUNDS, CITIES, SOURCES, calculate, calculateMutualInterest, distributions } from './model';
import { DEFAULT_PREFERENCES, type CityId, type Preferences, type Profile } from './model/types';
import { recordPageView, recordRevealEvent } from './lib/api';
import { matchesManav } from './model/intro';

type Stage = 'preferences' | 'profile' | 'methodology';
const shortBackground = (label: string) => label.includes('Aboriginal') ? 'Aboriginal' : label.replace(' ancestry', '');
const cityName = (id: CityId) => CITIES.find(c => c.id === id)?.name || 'Australia';
const oppositeGender = (gender: Preferences['gender']): Profile['gender'] => gender === 'men' ? 'women' : 'men';
const blankProfile = (gender: Preferences['gender'], city: CityId = 'australia'): Profile => ({ gender: oppositeGender(gender), city, age: null, height: null, income: null, backgrounds: [] });

export default function App() {
  const [stage, setStage] = useState<Stage>('preferences');
  const [previousStage, setPreviousStage] = useState<Stage>('preferences');
  const [preferences, setPreferences] = useState<Preferences>({ ...DEFAULT_PREFERENCES });
  const deferredPreferences = useDeferredValue(preferences);
  const estimate = useMemo(() => calculate(deferredPreferences), [deferredPreferences]);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile>(() => blankProfile(DEFAULT_PREFERENCES.gender, DEFAULT_PREFERENCES.city));
  const [profileGenderTouched, setProfileGenderTouched] = useState(false);
  useEffect(() => { void recordPageView(); }, []);
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.app-header');
    if (!header) return;
    const update = () => document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    const obs = new ResizeObserver(update);
    obs.observe(header);
    update();
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (stage === 'profile') window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [stage]);
  const bins = useMemo(() => ({ age: distributions(deferredPreferences, 'age'), height: distributions(deferredPreferences, 'height'), income: distributions(deferredPreferences, 'income') }), [deferredPreferences]);
  const ownBins = useMemo(() => {
    const own: Preferences = { ...DEFAULT_PREFERENCES, gender: profile.gender ?? (preferences.gender === 'men' ? 'women' : 'men'), city: preferences.city, age: [18, 80] };
    return { age: distributions(own, 'age'), height: distributions(own, 'height'), income: distributions(own, 'income') };
  }, [preferences.gender, preferences.city, profile.gender]);
  const mutualEstimate = useMemo(() => calculateMutualInterest(deferredPreferences, { ...profile, city: deferredPreferences.city }), [deferredPreferences, profile]);
  const change = (next: Partial<Preferences>) => { setPreferences(p => ({ ...p, ...next })); if (next.gender && !profileGenderTouched) setProfile(p => ({ ...p, gender: oppositeGender(next.gender!) })); };
  const method = () => { if (stage === 'methodology') setStage(previousStage); else { setPreviousStage(stage); setStage('methodology'); } };
  async function reveal() {
    if (busy) return;
    setBusy(true); setProfile(p => ({ ...p, city: preferences.city, gender: p.gender || oppositeGender(preferences.gender) })); setStage('profile');
    try { await recordRevealEvent(preferences); }
    catch { /* silent */ }
    finally { setBusy(false); }
  }
  const backgroundButtons = (selected: string[], update: (ids: string[]) => void) => <div className="ancestry-chips">{BACKGROUNDS.map(b => <button type="button" key={b.id} aria-pressed={selected.includes(b.id)} className={selected.includes(b.id) ? 'selected' : ''} onClick={() => update(selected.includes(b.id) ? selected.filter(x => x !== b.id) : [...selected, b.id])}>{shortBackground(b.label)}</button>)}</div>;
  return <div className="app-shell">
    <header className="app-header"><a className="brand" href="#" aria-label="SeeFish home" onClick={e => { e.preventDefault(); setStage('preferences'); }}><img src="/favicon.svg" width="40" height="32" alt="" /><span>SeeFish</span></a>
      <nav className="step-nav" aria-label="Explorer pages">{(['preferences', 'profile'] as const).map((page, i) => <button key={page} className={stage === page ? 'active' : ''} aria-current={stage === page ? 'page' : undefined} onClick={() => setStage(page)}><span>0{i + 1}</span>{page === 'preferences' ? 'Your type' : 'About you'}</button>)}</nav>
      <div className="header-links"><button className={stage === 'methodology' ? 'active' : ''} onClick={method}>Methodology</button><a className="author-button" href="https://manavdodia.com" target="_blank" rel="noreferrer"><span className="author-desktop">Made by Manav</span><span className="author-mobile">Manav</span> <ArrowUpRight size={12} /></a></div>
    </header>
    {stage === 'methodology' ? <main className="methodology-page">
      <div className="methodology-title"><h1>Behind the numbers.</h1></div>
      <div className="method-content">
        <p>Australian Census counts from 2021, with height evidence from the 2022 National Health Survey. Ages 18–80. These are demographic estimates, not current dating profiles.</p>
        <p>Every filter is evaluated against one population model. Age, income, and location use joint Census tables. Ancestry intersections and height distributions have wider uncertainty.</p>
        <ul>{estimate.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
        <p>{estimate.rangeMeaning}</p>
        <p>Background means reported ancestry, not a complete description of ethnicity. “Not set” means no ancestry was selected; it does not mean a person has no background. Aboriginal ancestry is not Indigenous status. Historical sex categories do not fully capture gender identity.</p>
        <p>The About you figure starts with your filtered type pool and applies a reciprocal demographic fit to the details you enter. Same-gender selections use pooled ABS age rates for gay/lesbian and bisexual identity as an orientation proxy. The central scenario’s 0.35 baseline and other preference coefficients are my assumptions guided by studies, not measured attraction probabilities. The sensitivity range shows model variation, not a confidence interval. Your About you details stay on your device.</p>
        <p>Basic usage analytics are retained for up to 90 days, including page visits, a random browser identifier, IP address, approximate network location, device/browser information, and the type filters submitted when revealing a result. This information is used to understand and improve SeeFish and is not sold.</p>
        <div className="source-list">{SOURCES.map(source => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><span><strong>{source.title}</strong><small>{source.period}</small><p>{source.note}</p></span><ArrowUpRight size={19} /></a>)}</div>
        <p className="method-small">Independent project. Source: Australian Bureau of Statistics. Model {estimate.modelVersion}. Particles are scaled illustrations, not individual locations.</p>
      </div>
    </main> : <main className={`app-main ${stage === 'profile' ? 'about-layout' : ''}`}>
      <section className={`control-pane pane-${stage}`} aria-label={stage === 'preferences' ? 'Dating preferences' : 'About you'}>
        {stage === 'preferences' ? <><div className="pane-title"><h1>Who’s your type?</h1><button aria-label="Reset all preferences" className="reset-button" onClick={() => change({ ...DEFAULT_PREFERENCES })}><RotateCcw size={15} /></button></div>
          <div className="two-controls"><fieldset><legend>Interested in</legend><div className="gender-switch">{(['men', 'women'] as const).map(gender => <button key={gender} className={preferences.gender === gender ? 'selected' : ''} aria-pressed={preferences.gender === gender} onClick={() => change({ gender })}>{gender === 'men' ? 'Men' : 'Women'}</button>)}</div></fieldset><label className="location-control">Location<div className="select-box"><select aria-label="Dating location" value={preferences.city} onChange={e => change({ city: e.target.value as CityId })}>{CITIES.map(c => <option key={c.id} value={c.id}>{c.id === 'australia' ? 'All Australia' : c.name}</option>)}</select><ChevronDown size={13} /></div></label></div>
          <CompactRange label="Age" min={18} max={80} value={preferences.age} bins={bins.age} onChange={age => change({ age })} unit="yrs" />
          <CompactRange label="Height" min={140} max={210} value={preferences.height || [140, 210]} bins={bins.height} onChange={height => change({ height })} unit="cm" imperialHeight any={!preferences.height} onAny={() => change({ height: preferences.height ? null : [160, 190] })} />
          <CompactRange label="Yearly income" min={0} max={182000} step={1000} value={preferences.income || [0, 182000]} bins={bins.income} onChange={income => change({ income })} money any={!preferences.income} onAny={() => change({ income: preferences.income ? null : [52000, 104000] })} />
          <fieldset className="background-control"><div className="background-heading"><legend>Cultural background</legend><button className={`any-button ${!preferences.backgrounds.length ? 'selected' : ''}`} type="button" aria-pressed={!preferences.backgrounds.length} onClick={() => change({ backgrounds: [] })}>Any</button></div>{backgroundButtons(preferences.backgrounds, backgrounds => change({ backgrounds }))}</fieldset>

          <div className="pane-bottom desktop-cta"><button className="action-button" onClick={reveal} disabled={busy}>See how many are into you</button></div>
        </> : <>
          <div className="pane-title"><h1>A little about you.</h1><button className="reset-button" aria-label="Clear your details" onClick={() => { setProfile(blankProfile(preferences.gender, preferences.city)); setProfileGenderTouched(false); }}><RotateCcw size={15} /></button></div>
          <fieldset><legend>I’m a</legend><div className="gender-switch">{(['women', 'men'] as const).map(gender => <button key={gender} aria-pressed={profile.gender === gender} className={profile.gender === gender ? 'selected' : ''} onClick={() => { setProfileGenderTouched(true); setProfile(p => ({ ...p, gender })); }}>{gender === 'women' ? 'Woman' : 'Man'}</button>)}</div></fieldset>
          <SingleValue label="Your age" min={18} max={80} value={profile.age} bins={ownBins.age} suggested={29} unit="yrs" onChange={age => setProfile(p => ({ ...p, age }))} />
          <SingleValue label="Your height" min={140} max={210} value={profile.height} bins={ownBins.height} suggested={170} unit="cm" imperialHeight onChange={height => setProfile(p => ({ ...p, height }))} />
          <SingleValue label="Your yearly income" min={0} max={182000} step={1000} value={profile.income} bins={ownBins.income} suggested={75000} money onChange={income => setProfile(p => ({ ...p, income }))} />
          <fieldset className="background-control own-background"><div className="background-heading"><legend>Your cultural background</legend><button className={`any-button ${!profile.backgrounds.length ? 'selected' : ''}`} type="button" aria-pressed={!profile.backgrounds.length} onClick={() => setProfile(p => ({ ...p, backgrounds: [] }))}>Not set</button></div>{backgroundButtons(profile.backgrounds, backgrounds => setProfile(p => ({ ...p, backgrounds })))}</fieldset>
          {matchesManav(profile) && <div className="creator-greeting"><span>hi</span><a href="https://www.instagram.com/manav141/" target="_blank" rel="noreferrer" aria-label="Instagram @manav141"><Instagram size={14} /><span>@manav141</span></a></div>}
        </>}
      </section>
      {stage === 'profile' ? <AboutResults estimate={mutualEstimate} /> : <><section className="visual-pane" aria-label="Interactive population map"><div className="visual-heading"><div><span className="map-location">{cityName(preferences.city)}</span>{preferences.city === 'australia' && <span className="map-region">Select a city to explore</span>}</div>{preferences.city !== 'australia' && <button onClick={() => change({ city: 'australia' })}><ArrowLeft size={12} /> Australia</button>}</div><ParticleMap city={preferences.city} count={estimate.estimate} baseline={estimate.denominator} onCityChange={city => change({ city })} /><div className="visual-bottom"><div className="live-total"><strong><AnimatedCount value={estimate.estimate} /></strong><span>estimated matches</span></div></div></section><div className="mobile-map-cta"><button className="action-button" onClick={reveal} disabled={busy}>See how many are into you</button></div></>}
    </main>}
  </div>;
}
