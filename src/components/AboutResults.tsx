import './about-results.css';
import type { MutualEstimate } from '../model';
import AnimatedCount from './AnimatedCount';

interface Props {
  estimate: MutualEstimate;
}

export default function AboutResults({ estimate }: Props) {
  return <section className="about-results" aria-label="About you note">
    <div className="about-results-inner">
      <div className="mutual-result">
        <p className="mutual-kicker">About you</p>
        <div className="mutual-number" aria-label={`${estimate.estimate} estimated mutual interest out of ${estimate.denominator}`}>
          <strong><AnimatedCount value={estimate.estimate} /></strong>
          <span>/ <AnimatedCount value={estimate.denominator} /></span>
        </div>
        <p className="mutual-label">estimated mutual interest</p>
      </div>

      <p className="about-note">don’t take this too seriously</p>
    </div>
  </section>;
}
