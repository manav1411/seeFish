import { MUTUAL_SOURCES, RESEARCH } from '../model/dating-research';

export default function DatingMethodology() {
  return <div className="method-content research-method">
    <p>The About you estimate starts with the people in your selected type pool and applies a reciprocal demographic fit to the details you enter. It is an illustrative scenario: the central 0.35 baseline and the preference coefficients are my assumptions guided by studies, because no published study supplies a validated Australian probability that one particular person will be attracted to another.</p>
    <p>Same-gender selections remain eligible. The model uses pooled Australian age rates for gay or lesbian and bisexual identity as an orientation proxy. Those rates describe identity in a population survey, not individual availability, attraction, or whether someone is currently dating, and they cannot be cross-tabulated with every filter in this small browser model.</p>
    <p>Age, city, height, income and shared reported ancestry shape the reciprocal fit. Shared ancestry is a soft general similarity assumption; there is no Indian–white attraction matrix or racial desirability ranking. The sensitivity range shows how the scenario changes when uncertain inputs move. It is not a confidence interval.</p>
    <p><strong>Sources informing the reciprocal scenario</strong></p>
    <div className="source-list mutual-source-list">{MUTUAL_SOURCES.map(study => <a key={study.id} href={study.url} target="_blank" rel="noopener noreferrer"><span><strong>{study.title}</strong><small>{study.source}</small><p>{study.finding}<br /><em>{study.scope}</em></p></span><span aria-hidden="true">↗</span></a>)}</div>
    <p><strong>Other dating research</strong></p>
    <div className="source-list">{RESEARCH.map(study => <a key={study.id} href={study.url} target="_blank" rel="noopener noreferrer"><span><strong>{study.source}</strong><small>{study.scope}</small><p>{study.finding}</p></span><span aria-hidden="true">↗</span></a>)}</div>
    <p>These studies describe group averages, stated preferences, or observed first-date and pairing behaviour. They help set direction and disclose scope; they do not turn the figure into a measured attraction rate. Your profile details remain on this device and are not submitted with the aggregate preference contribution.</p>
  </div>;
}
