# Wind lab — design notes

Decided 2026-09-26 in a grilling session. The brief is §13 of the sketchpad
repo's `TODO.md`, and the vocabulary is in this repo's `CONTEXT.md`.

## The teaching goal

The lecture's Kaimal slide, made something students can move. In order:

1. What U, the turbulence intensity and the length scale L each do to the
   Kaimal spectrum.
2. **The spectrum does not define the field.** Kaimal is a one-point
   spectrum. Coherence is a separate ingredient, and the same spectrum fits a
   field of any coherence.
3. Frozen turbulence, which the layout shows without being asked to.

Goal 2 came out of a question: *how is coherence handled in the Kaimal
spectrum, if we want to draw a 2D field?* It is not handled there at all, and
the tool is built so that this can be seen.

## Decisions

- **IEC 61400-1 Kaimal and exponential coherence**, which are the pair the
  standard gives together.
  S(f) = σ²·(4L/U)/(1 + 6fL/U)^(5/3).
  Coh(r, f) = exp(−a·√((fr/U)² + (0.12r/L)²)).
  Mann was turned down because it brings its own spectrum. Davenport was
  turned down because its coherence tends to 1 at low frequency, which is
  what IEC's second term corrects.
- **One L for both.** IEC uses 8.1·Λ₁ as the Kaimal length and again as the
  coherence length. Two knobs with the same IEC value would only invite the
  question of why there are two.
- **u only, no shear, no ground.** Every height has the same spectrum, so
  only vertical separation matters.
- **Generated in space, not time.** Both the spectrum and the coherence
  depend on frequency only through f/U, so the field in metres depends on L
  and a alone. U sets only how fast it passes. Changing U or TI therefore
  leaves the picture unchanged. The colours are u′/σ for the same reason.
- **An AR(1) chain in z, not a Cholesky factorisation.** On an even grid the
  IEC coherence between rows i and j is ρ^|i−j| at every wavenumber. That is
  exactly the correlation of an AR(1) chain, so the Veers method's
  factorisation reduces to one recurrence per wavenumber. 65 heights × 8191
  wavenumbers plus 33 FFTs of 16384 points takes about 50 ms, which is enough
  to follow a dragged slider.
- **The chain starts at hub height** and runs up and down from there. The
  hub row is then that row's own random numbers whatever a is, so **changing
  the coherence leaves the Probe's record and its estimated spectrum
  untouched** while the picture changes from vertical stripes to thin
  horizontal streaks. That is goal 2, shown directly. `verify.mjs` pins it.
- **The field morphs.** The random numbers are fixed; L and a reshape the
  field from them, and New field draws fresh ones.
- **Field size**: 16384 × 2 m = 32.8 km downwind, which is 22 minutes at
  25 m/s, so a 10-minute record never wraps. It spans 0–300 m in z in 65 rows,
  with the hub on row 32.
- **Catmull–Rom interpolation** reads the field between grid points. Linear
  interpolation lost about 20% of the power at 1 Hz, and the estimate showed
  it.
- **The trace is re-read from the field every frame.** Under frozen
  turbulence the last ten minutes at the Probe *are* the hub row downwind of
  the Rotor, read backwards. The trace therefore always matches the picture,
  and always matches the knobs as they are now: a change of U re-spaces the
  whole record at once rather than taking ten minutes to work through. The
  shaded end of the trace is the stretch still in view. On a wide screen at
  moderate U, that is all of it.
- **Real time, 10-minute record, 2 minutes shown** (changed 2026-09-27 after
  trying it). The full 10 minutes across a screen crept at 2 px/s and looked
  frozen. Two minutes moves at the pace of the picture above it, which at
  10 m/s spans about as much air. The estimate still uses all 10 minutes,
  because 10 minutes is the industry's record length.
- **Samples are pinned to the air, not to the clock** (also 2026-09-27). The
  first cut re-read the record at fixed times before *now*, so every sample
  sat somewhere slightly new each frame and picked up different fine detail.
  The whole trace shimmered in place by more than it moved. Now a sample is
  taken at fixed points U·dt apart in the field, and once taken it never
  changes. The trace is drawn thinned by a rule tied to those points, so the
  same samples are drawn every frame. `verify.mjs` pins this.
- **The estimate** is the periodogram of the 10 minutes on screen, averaged
  into ten bands per decade and drawn faintly behind the model. It is left
  deliberately noisy at the low end, where a 10-minute record holds only a
  handful of cycles. It stops at U/(4·DX), past which the field grid rather
  than the wind shapes what it shows.
- **Log–log f·S(f)**, with a −5/3 guide. The Sea lab chose linear axes; here
  they would hide both the peak and the inertial range.
- **Sliders, not a handle on the peak** as in the Sea lab. The peak's
  position is set by U/L, so dragging it sideways would not say which of the
  two it meant.
- **Knob ranges**: U 4–25 m/s. TI 5–40 %, with IEC A/B/C notches computed from
  the normal turbulence model at the current U. L 50–1000 m, logarithmic,
  with the IEC notch at 340 m. a 0–63, with the last step "independent"
  (a = ∞).
- **The trace was costly to draw.** All 8192 samples stroked under a glow
  took 34 ms a frame, so it draws one sample per screen pixel.

## What the physics turned out to say

- **A 10-minute record holds only part of σ².** Kaimal carries a lot of
  energy at periods longer than ten minutes. At L = 340 m and U = 10 m/s,
  about 18% of σ² sits below 1/600 Hz. So the trace's variance around its own
  mean usually comes out below the dashed U ± σ, and a record's mean wanders
  from U. That is real, not a fault, and it is worth saying out loud in the
  lecture. The 32.8 km field itself loses about 4% of σ² to wavelengths
  longer than itself.
- **At IEC coherence the fine scales are nearly independent from one row to
  the next.** Rows are 4.7 m apart, and at a = 12 small gusts decorrelate over
  a few metres. The field therefore reads as horizontal streaks, with
  large-scale structure clearly shared over the rotor. That is what IEC
  coherence implies, and it matches the look of TurbSim slices.
- **Changing U looks like nothing in the picture**, apart from its speed. It
  is the frozen-turbulence point, and it may surprise students more than
  anything else here.

## Verification (`verify.mjs`)

- The Kaimal spectrum integrates to σ², f·S peaks at U/(4L), and the slope
  tends to −5/3. The IEC normal turbulence intensity is checked by hand.
- Averaged over 16 fields, each height's variance matches the resolved
  Kaimal variance, and the coherence between two heights, estimated with a
  DFT written in the test, matches the IEC formula in two wavenumber bands.
- a = 0 gives identical rows; independent gives uncorrelated neighbours.
- Morphing is reversible; New field changes the field; the hub row does not
  depend on a.
- The Probe record is the hub row downwind, read back in time; a sample
  never changes once taken; and its
  band-averaged estimate follows Kaimal within 10% from 0.01 to 1.5 Hz.
- Reshaping takes under 150 ms in Node.
