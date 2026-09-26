# Sea lab — design notes

Decided 2026-09-26 in a triage session; the brief is §12 of the sketchpad
repo's `TODO.md`. Vocabulary is in this repo's `CONTEXT.md`.

## The teaching goal

The lecture's JONSWAP slide, made something students can move: what Hs, Tp
and the peak enhancement factor γ each do to a sea. All three carry equal
weight.

## Decisions

- **Three panels, stacked**: the Sea side-on with a Floater for scale, the
  surface elevation at the Probe over time, and the Spectrum S(f) in Hz.
- **The spectrum is the control.** Its peak is a handle: sideways sets Tp
  (absolutely - the handle stays under the finger), up and down set Hs. γ is
  the one slider, with notches at 1 (Pierson–Moskowitz) and 3.3 (North Sea).
  Hs, Tp and γ are shown as numbers; nothing derived is.
- **Hs is a relative, multiplicative drag, and the S axis rescales.** The
  peak's height goes as Hs², so 0.5 m to 12 m is a factor of 576 in height;
  no fixed linear axis shows both. So dragging up scales Hs from where the
  drag began, the axis eases to keep the peak about two thirds of the way up,
  and its tick labels change as it does. The handle is drawn at the peak,
  which can therefore drift from under the finger vertically. A log axis
  was the alternative and was turned down: it hides the shape γ changes.
- **Hs-normalised JONSWAP**, normalised numerically, so γ changes the shape
  and never the energy. σ = 0.07 / 0.09.
- **Steepness limit**: the handle stops at Hs/λp = 1/15. A dashed curve on
  the spectrum shows where the peak would sit at the limit for each Tp.
- **Deep water, linear waves**, 256 components between 0.55 and 4 times the
  peak frequency, at random points inside equal bins so the sea does not
  repeat.
- **The Sea morphs.** Phases are fixed; each component's phase is integrated
  rather than computed as ωt, so a change of Tp changes how fast every wave
  travels from then on without making any of them jump. New sea re-draws
  the phases and nothing else.
- **True scale, no exaggeration**, cropped from below the keel to just above
  the hub. A narrow window shows less sea, never a squashed one. A 50 m scale
  bar makes "true scale" checkable.
- **Probe fixed at the Floater**, between its columns. ±Hs/2 dashed lines on
  the trace.
- **The sea runs at 7.5× real time** (changed 2026-09-26 after trying it).
  At real speed the waves were too slow and a change took minutes to work
  through the trace, so the effect of a slider was hard to see. The trace
  still holds 3 minutes of sea, which now passes in 24 s. Both the sea and
  the trace say "7.5× speed", so a period is not read off as real time.
- The trace holds **3 minutes**, not 90 s: at Tp = 10 s a wave group lasts
  about a minute, and 90 s barely held one.
- The page opens with the trace already full, three minutes of sea run on
  load, so the first look shows what it is for.

## What the physics turned out to say

- **At true scale the sea looks gentle.** Hs = 4 m against a 150 m tower is
  a few pixels; even the 12 m maximum reads as a swell, not a storm. That was
  chosen knowingly ("let's try at true scale"). If it undersells the slide,
  a vertical exaggeration is a one-line change to the sea's y scale, but it
  would make the steepness limit look wrong.
- **γ's effect on the sea is real but modest.** With the same phases, runs
  of consecutive waves taller than Hs average 1.33 waves at γ = 1, 1.50 at
  3.3 and 1.71 at 7 (18 h of sea each, Hs 4 m, Tp 10 s); spectral bandwidth
  falls from 0.42 to 0.35. In a single 3-minute trace the difference is
  visible if you look for it, not striking. The spectrum shows γ far more
  plainly than the sea does, which may itself be the point to make.

## Verification (`verify.mjs`)

- Area equals Hs²/16 for every γ, and the peak height agrees with DNV's
  closed-form approximation (the area test alone cannot catch a wrong shape).
- The peak lies at 1/Tp; γ = 1 is Pierson–Moskowitz.
- The variance of η at the Probe over 12 h of sea is Hs²/16.
- Parameter changes keep every phase; New sea changes them all and keeps
  the spectrum.
- The handle cannot exceed the steepness limit.
