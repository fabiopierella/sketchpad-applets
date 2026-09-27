# Sketchpad applets

Interactive teaching tools for structural dynamics of wind turbines. The words
below are the ones the tools, their labels and their design notes use.

## Language

### Pile lab

**Pile**:
An upright slender beam rigidly clamped at its base and free at its top; a
monopile with its tower, idealised.
_Avoid_: tower, column, cantilever (true, but it names the boundary condition, not the thing)

**Nacelle**:
A point mass fixed at the top of the **Pile**. Students change its weight, never its height.
_Avoid_: tip mass, RNA, "the mass"

**Tap**:
A short, sharp push at one height on the **Pile**, after which it rings freely.
_Avoid_: pluck, nudge, hit

**Shake**:
Holding one height on the **Pile** and moving it back and forth, driving it at whatever rhythm the hand keeps.
_Avoid_: pinch, drag, force

**Probe**:
The one place a tool records a signal and plots it over time: a height on the **Pile**, a position along the **Sea**, hub height in the **Wind field**. Where it can move, it moves independently of where anything is excited.
_Avoid_: sensor, measurement point, gauge

**Ghosts**:
Fading outlines of the **Pile**'s recent shapes, which accumulate into the envelope of its motion.
_Avoid_: trails, traces

**Mode**:
A shape the **Pile** vibrates in at its own natural frequency. The tool never names or displays one; students infer them.

### Sea lab

**Sea**:
A long-crested irregular sea surface seen side-on, built from one **Spectrum** and one set of random phases.
_Avoid_: waves (a sea is many waves), wave field, sea state (that is the three numbers, not the surface)

**Spectrum**:
How a **Sea**'s energy is spread over wave frequency, in the JONSWAP form set by Hs, Tp and γ. Hs fixes its area, so γ changes only its shape.
_Avoid_: PSD, energy density plot

**Peak enhancement factor (γ)**:
How sharply the **Spectrum** is concentrated around its peak. 1 is Pierson–Moskowitz, 3.3 a typical North Sea value.
_Avoid_: peakedness, gamma factor, shape parameter

**New sea**:
Drawing a fresh set of random phases while the **Spectrum** stays unchanged. Changing a parameter never does this; the **Sea** morphs instead.
_Avoid_: reset, regenerate, reseed

**Floater**:
A floating wind turbine silhouette in the **Sea**, there only for scale. It does not respond to the waves.
_Avoid_: platform, buoy, spar (these name particular designs)

### Wind lab

**Wind field**:
The longitudinal gust u′ over a vertical plane along the wind (X downwind, Z up), carried past the **Rotor** unchanged at the mean wind speed U.
_Avoid_: turbulence box, wind box, flow field (it is one component, not the flow)

**Frozen turbulence**:
Taylor's hypothesis: the **Wind field** does not evolve while it passes, so distance downwind and time at the **Probe** are the same axis, x = U·t.
_Avoid_: Taylor's hypothesis (fine in a lecture, but the tool says what it means)

**Kaimal spectrum**:
How the variance of u at one point is spread over frequency, set by U, the turbulence intensity and the length scale L. It describes one point only; it says nothing about how two points relate.
_Avoid_: Spectrum (the Sea lab's word for the JONSWAP spectrum), PSD, turbulence spectrum

**Coherence**:
How alike the gusts at two heights are, frequency by frequency. Independent of the **Kaimal spectrum**: the same spectrum at every point fits a **Wind field** of any coherence.
_Avoid_: correlation (that is its integral over frequency), spatial spectrum

**Rotor**:
The outline of a 15 MW-class rotor drawn in the **Wind field** for scale. It does not respond to the wind.
_Avoid_: turbine, disc

## Relationships

- A **Tap** or **Shake** acts at one height; the **Probe** reads at another (or the same).
- A **Tap** at a **Mode**'s node excites none of that **Mode**; a **Probe** at a **Mode**'s node records none of it.
- A **Sea** has exactly one **Spectrum** and one set of phases; a parameter change alters the first, **New sea** alters only the second.
- The **Kaimal spectrum** and the **Coherence** together decide a **Wind field**; either can change while the other stays put.
- Under **Frozen turbulence** U sets only how fast the **Wind field** passes and where the **Kaimal spectrum** sits in frequency, never the field's shape in space.
- A heavier **Nacelle** lowers every natural frequency and moves the top of the **Pile** towards being a node of the second **Mode**.

## Flagged ambiguities

- "Pinch" was used for the hand interaction; resolved into two distinct gestures, **Tap** and **Shake**.
- "Vertical mass" first meant a mass sliding along the height (as in the cantilever mode lab); resolved to the **Nacelle**, fixed at the top.
- "The coherence of the Kaimal spectrum" was asked about. There is none: the **Kaimal spectrum** is a one-point spectrum, and **Coherence** is a separate model (IEC exponential) that the **Wind field** needs as well.
