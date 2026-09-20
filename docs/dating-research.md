# What the research can support

Reviewed 20 September 2026. The app keeps demographic pool counts separate from reciprocal interest. No study below is used as a numerical multiplier on the Census population, and the site does not restore respondent-based reciprocity collection.

| Source | Useful evidence | Why it does not produce a personal mutual-interest count |
| --- | --- | --- |
| [Whyte et al., 2021, PLOS ONE](https://doi.org/10.1371/journal.pone.0250151) | 7,325 Australian adults rated nine traits in a 2016 survey, including trust, emotional connection, intelligence and education. | Trait importance is not a minimum acceptance threshold or an attraction probability. The sample is voluntary; results do not supply an ancestry × city × age acceptance matrix. |
| [Whyte & Torgler, 2017](https://doi.org/10.1089/cyber.2016.0528) | 219,013 RSVP contact decisions let researchers compare stated preferences with actual contact behaviour. | Contact is neither reciprocal attraction nor a relationship; pooled findings cannot identify who in a Census cohort would be interested. |
| [Whyte et al., 2018](https://doi.org/10.1177/0956797618771081) | Educational preferences in 41,936 dating profiles vary with age, sex and own education. | Education could support future context if compatible data were available, but adding an education slider alone would not establish mutual interest. |
| [Eastwick et al., 2025, PNAS](https://doi.org/10.1073/pnas.2416984122) | Around 4,500 US blind dates reveal a small youth preference in both sexes and no sharp drop at stated upper age limits. | US matchmaking clients aged 22–85 are not a representative Australian pool. First-date attraction does not measure relationship formation. |
| [Stulp et al., 2013, PLOS ONE](https://doi.org/10.1371/journal.pone.0054186) | Data from 12,502 UK couples show a modest male-taller pattern (height correlation about 0.18). | Couple height is not a preference probability and does not calibrate a personal height threshold. |
| [Valentova et al., 2014, PLOS ONE](https://doi.org/10.1371/journal.pone.0086534) | Relative-height preferences among gay men differ from the heterosexual pattern and vary by role. | It does not supply a calibrated same-sex men or women height model for this population. |
| [Fisman et al., 2008](https://business.columbia.edu/faculty/research/racial-preferences-dating-evidence-speed-dating-experiment) | Speed-dating choices provide evidence that same-background tendencies can appear in partner selection. | The study does not justify an Indian-over-English ranking for Australian users or a universal own-group effect. |
| [Prestage et al., 2019](https://pubmed.ncbi.nlm.nih.gov/30478706/) | Preferences among 1,853 Australian gay men vary across racial groups. | Variation is a reason to keep the ancestry modifier modest; it does not provide an exact ancestry × city × age matrix. |
| [Joel et al., 2017](https://doi.org/10.1177/0956797617714580) | Models tested more than 100 pre-date trait/preference measures in two speed-dating studies. They could not predict the pair-specific component of desire. | This supports an explicit unknown stage, not an invented estimate or a claim that attraction can never be predicted. |

## The reciprocal-interest scenario

The About you estimate integrates over the actual selected target cells. A cell contributes its Census count multiplied by its age selection, income-band overlap and NHS height probability. The demographic pool remains the observed-population estimate from the ABS model; the reciprocal number is a separate illustrative scenario inside that pool.

The central scenario is the product of an authored baseline and conservative modifiers:

```text
scenario = 0.35 × orientation × age × height × income × background × geography
age      = 0.25 + 0.75 × exp(-0.5 × (target age − your age)² / 12²)
height   = 0.80 + 0.20 × E[normal target-height similarity]
income   = 0.90 + 0.10 × exp(-abs(log((target midpoint + 5,000) / (your income + 5,000))))
background = 0.85 + 0.15 × shared-background probability
```

The 12-year age scale, 15 cm height scale, 7 cm opposite-sex target-height offset, 35% baseline and modifier strengths are authored assumptions. The symmetric age curve is a simplifying assumption because the Eastwick study found a modest youth preference rather than this exact function. Height uses NHS age and sex normal distributions conditioned on the selected target-height range. Opposite-sex height uses the modest male-taller pattern; same-sex height uses a gentle symmetric curve for both men and women because the available evidence does not calibrate a female same-sex rule, and the heterosexual rule is not transferred to same-sex users.

ABS 2022 reports pooled gay/lesbian plus bisexual identity rates of 7.6% at ages 24 and under, 5.6% at 25–34 and 1.7% at 35 and over. Those are applied to both target genders because an age-by-sex joint table is unavailable. Opposite-sex compatibility uses the published national fallback of 94.9% heterosexual plus 1.7% bisexual, or 96.6%, across ages. Bisexual identity remains eligible in both scenarios. A visitor who leaves gender unspecified gets a neutral orientation factor. These are identity proxies, not estimates of availability or mutual attraction.

For ancestry, selected categories are deduplicated. A single target Indian category and an Indian visitor are a full shared-category match; an English visitor is not. When the target background is Any, local ABS ancestry margins weight the visitor’s selected backgrounds. Multiple selected categories use union midpoints and bounds because people can report up to two ancestries and the joint cells are unavailable. The modifier stays modest and does not rank Indian, English or any other background. Its strength is halved in same-sex scenarios because the available evidence is not calibrated to this combined model.

For geography, a different selected city uses a 0.6 reach assumption. A national search weights the visitor’s city by the actual selected city cohort share and applies the remote reach weight to the remainder. Unspecified city is neutral. Income is the weakest modifier; the Whyte survey’s trait-importance ranking is not interpreted as an acceptance probability.

The displayed low/high range varies the baseline from 25% to 45% and the authored factor strengths. It is a sensitivity range, not a confidence interval. Any result can be lower than the pool, and a very small result can round to zero; no minimum is added. The model cannot observe whether a person is single, available, attracted, or interested in the visitor, so those unknown stages remain limitations of the scenario.

## Product choices

- The breakdown shows the selected pool and the scenario factors separately. Labels and the low/high range make the authored assumptions visible instead of presenting the reciprocal number as a measured acceptance rate.
- Research cards offer an interpretation and a practical action, with study dates, population and direct citations. The user's age relative to their selected range chooses the first relevant research card; it does not change an attraction score.
- Local suggestions use the user's explicitly selected city, falling back to their search area. Indian cultural suggestions respond to the desired ancestry selection, and shared background changes the wording. No attendee demographics or success rates are assumed. See [activity sources](activity-sources.md).
- The personal Instagram note is a separate, explicitly authored easter egg for women aged 20–24 who select Indian background themselves. It says the visitor matches Manav's stated type; it does not claim mutual interest or add one to a Census count. No contact is initiated automatically and no self-profile is transmitted.
