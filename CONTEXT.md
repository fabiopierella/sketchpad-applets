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
The one place a tool records a signal and plots it over time: a height on the **Pile**, a position along the **Sea**. Moved independently of where anything is excited.
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

## Relationships

- A **Tap** or **Shake** acts at one height; the **Probe** reads at another (or the same).
- A **Tap** at a **Mode**'s node excites none of that **Mode**; a **Probe** at a **Mode**'s node records none of it.
- A **Sea** has exactly one **Spectrum** and one set of phases; a parameter change alters the first, **New sea** alters only the second.
- A heavier **Nacelle** lowers every natural frequency and moves the top of the **Pile** towards being a node of the second **Mode**.

## Flagged ambiguities

- "Pinch" was used for the hand interaction; resolved into two distinct gestures, **Tap** and **Shake**.
- "Vertical mass" first meant a mass sliding along the height (as in the cantilever mode lab); resolved to the **Nacelle**, fixed at the top.
