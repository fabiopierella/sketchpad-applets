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
- **The estimate** is the periodogram of the full 10-minute record, averaged
  over three neighbouring frequency bins (1/200 Hz per point) and drawn
  faintly behind the model. It is left noisy on purpose: a 10-minute record
  holds only a few cycles of the slowest gusts. It stops at U/(4·DX), past
  which the field grid rather than the wind shapes what it shows.
- **S(f) on linear axes, 0 to 0.2 Hz** (changed 2026-09-28). The same form
  the Sea lab uses for its wave spectrum, so the two can be read side by side:
  the area under the curve is the variance. The axis stops at 0.2 Hz, the
  wave band, because almost all of the wind's variance lies below it. The
  price is that the curve is a steep fall at the left edge, with most of the
  area in the first few per cent of the axis. That is exactly the point
  compared with waves, and a dashed line spells it out: half of σ² lies
  below `kaimalQuantile(0.5)`, 0.305·U/L, about 0.009 Hz at the IEC defaults.
  It stays on the axis for every slider setting (at most 0.15 Hz, at U = 25
  and L = 50).
  History: log–log with a −5/3 guide first, then f·S(f) on a log frequency
  axis. Log–log made a tail at 10⁻⁴ look as present as a peak at 1, which
  misleads anyone who does not read log axes for a living. The premultiplied
  form was readable but did not compare with a wave spectrum. The −5/3 law
  is not visible on either linear form; the model still has it and
  `verify.mjs` still checks it. The vertical axis eases to keep S(0) about
  three quarters of the way up, as the Sea lab's does, so TI shows in the
  relabelled ticks and in the trace's swing rather than in the curve's height.
- **Changing U looks like nothing in the picture**, apart from its speed. It
  is the frozen-turbulence point, and it may surprise students more than
  anything else here.

## Verification (`verify.mjs`)

- The Kaimal spectrum integrates to σ², f·S peaks at U/(4L), the slope
  tends to −5/3, and half of σ² lies below the dashed line the plot draws. The IEC normal turbulence intensity is checked by hand.
- Averaged over 16 fields, each height's variance matches the resolved
  Kaimal variance, and the coherence between two heights, estimated with a
  DFT written in the test, matches the IEC formula in two wavenumber bands.
- a = 0 gives identical rows; independent gives uncorrelated neighbours.
- Morphing is reversible; New field changes the field; the hub row does not
  depend on a.
- The Probe record is the hub row downwind, read back in time; a sample
  never changes once taken; and its
  three-bin-averaged estimate follows Kaimal within 10% from 0.01 to 1.5 Hz.
- Reshaping takes under 150 ms in Node.
