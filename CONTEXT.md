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

### Forcing lab

**Forcing lab**:
A **Pile** driven by a force applied directly to it, with no waves, showing why a forcing well below resonance can still make it swing.
_Avoid_: resonance applet, Applet A

**Waveform**:
The shape of the force over one period: sine or sawtooth. Both have the same **Fundamental** amplitude, so a sawtooth only adds harmonics.
_Avoid_: signal, forcing type

**Fundamental**:
The forcing's own repetition frequency, f_F, shown as a ratio of f₁.
_Avoid_: forcing frequency (ambiguous once harmonics are on screen), driving frequency

**Harmonic comb**:
The sawtooth's spectrum: spikes at whole multiples of the **Fundamental**, the n-th of height 1/n.
_Avoid_: overtones, partials, spectrum (on its own)

**Amplification**:
The **Pile**'s steady-state top amplitude divided by its static deflection under the same force amplitude. 1 means it behaves as if pushed slowly.
_Avoid_: response, DAF (fine in a lecture, but the tool says what it means), gain


### Modes lab

**Modes lab**:
The first three **Modes** of a uniform clamped pile, each its own oscillator, driven by the **Forcing lab**'s force at one height. Shows that only mode 1 really resonates, and that where the load acts decides how much each mode feels it.
_Avoid_: Applet B, modal applet

**Load height (z₀)**:
Where the one point force acts on the **Pile**. At the top until **Move the load** is pressed.
_Avoid_: load position, application point

**Generalized force**:
How much of the load a **Mode** receives: the force times the **Mode**'s shape at the **Load height**, φⱼ(z₀). Zero at a node.
_Avoid_: modal force, participation (that is a different quantity)

**Softened sawtooth**:
The sawtooth both labs use: the ideal comb passed through a smooth two-pole low-pass at 3 f₁, because no real load drops in zero time. Harmonics near f₁ are untouched; the comb has faded by f₂.
_Avoid_: filtered sawtooth, rounded sawtooth

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

### Two-mass lab

**Two-mass lab**:
Two equal point masses on two equal springs in a **Spring chain**, upright like the **Pile**, free and undamped. Until **Show the answer**, only the total motion is shown. After it, the **Mode plane** splits the motion into **Modes**. It is the simplest system with two **Modes**, for checking a derivation done on the board and then showing that any displacement is a mix of them.
_Avoid_: 2-DOF applet, two-element beam (that is a different stiffness model)

**Spring chain**:
Springs in series from the ground up: k₁ between the ground and m₁, acting on x₁; k₂ between m₁ and m₂, acting on x₂ − x₁. Each spring sees only the difference in displacement across it.
_Avoid_: shear building (fine in a lecture), beam model

**Release**:
Letting go of the masses after dragging them to an initial displacement. In general the motion that follows mixes both **Modes**; released exactly in one **Mode**'s shape, it keeps that shape.
_Avoid_: drop, let go, initial condition

**Show the answer**:
The toggle that reveals the characteristic equation with the current numbers, ω₁, ω₂, the shape ratios x₂/x₁, and the buttons that start the system in each **Mode**. Off by default, so students try first and get the answer after.
_Avoid_: solution, results

**Mode plane**:
The x₁–x₂ plane, with the displacement as a moving point and the two **Modes**' shapes drawn as axes through the origin. Here M = m·I, so the axes are at right angles. Shown only with the answer, since the axes are the answer. A **Release** on a mode axis traces a straight line along it; anywhere else it traces a Lissajous figure.
_Avoid_: phase plane (that is position against velocity), configuration space (fine in a lecture)

**Modal amplitude**:
q₁ and q₂, where a start splits as x = q₁ φ₁ + q₂ φ₂: the coordinates of the **Release** point along the two mode axes, in x₀, with each φ scaled so its larger entry is 1. It is fixed at **Release**, and each mode then swings with its own amplitude for ever.
_Avoid_: participation factor (a different normalisation), modal contribution, percentage

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

### Fatigue lab

**Fatigue lab**:
The **Pile** takes constant-amplitude stress cycles at a **Hot spot** and accumulates **Damage** by the Palmgren–Miner rule until it breaks at D = 1. Load sequences are not superposed and cycles are not rainflow counted. Those belong to a later lab.
_Avoid_: S-N applet, Wöhler applet

**Hot spot**:
The welded detail at the mudline of the **Pile**, where the stress cycles act and the **Damage** shows.
_Avoid_: weld, crack site, critical point

**Stress amplitude (σa)**:
Half the peak-to-peak stress of a cycle at the **Hot spot**, in MPa, the convention the course uses. It is what the **S-N curve** is read with. It is set directly; no load or dynamics turns a force into it.
_Avoid_: stress range (that is twice it, and is what DNV writes its curves in), load, stress

**S-N curve**:
The number of cycles N to failure at a constant **Stress amplitude**, drawn on log-log axes: one straight line of slope m = 3, with no knee and no cutoff. Its lives are those of DNV-RP-C203's D-curve in air, rewritten from range to amplitude. Log-log is a deliberate exception to the labs' linear axes, since on them the curve is the straight line every standard draws.
_Avoid_: Wöhler curve (fine in a lecture), fatigue curve

**Damage (D)**:
The Palmgren–Miner sum Σ nᵢ/Nᵢ over everything the **Hot spot** has taken: nᵢ cycles at a **Stress amplitude** whose **S-N curve** life is Nᵢ. The **Pile** fails when D reaches 1.
_Avoid_: fatigue, usage, life consumed

**Block**:
n cycles at one **Stress amplitude**, sent to the **Hot spot** together. Blocks queue and play in the order they were sent. Each one adds n/N to the **Damage**, whatever came before it.
_Avoid_: load case, batch, signal, sine

## Relationships

- A **Tap** or **Shake** acts at one height; the **Probe** reads at another (or the same).
- A **Tap** at a **Mode**'s node excites none of that **Mode**; a **Probe** at a **Mode**'s node records none of it.
- A **Sea** has exactly one **Spectrum** and one set of phases; a parameter change alters the first, **New sea** alters only the second.
- The **Kaimal spectrum** and the **Coherence** together decide a **Wind field**; either can change while the other stays put.
- Under **Frozen turbulence** U sets only how fast the **Wind field** passes and where the **Kaimal spectrum** sits in frequency, never the field's shape in space.
- A **Release** in exactly one **Mode**'s shape stays in that shape; any other **Release** is a mix of both.
- **Blocks** at the same **Stress amplitude** add into one count; the **Damage** they cause together does not depend on the order they came in.
- A heavier **Nacelle** lowers every natural frequency and moves the top of the **Pile** towards being a node of the second **Mode**.

## Flagged ambiguities

- "Pinch" was used for the hand interaction; resolved into two distinct gestures, **Tap** and **Shake**.
- "Vertical mass" first meant a mass sliding along the height (as in the cantilever mode lab); resolved to the **Nacelle**, fixed at the top.
- "The coherence of the Kaimal spectrum" was asked about. There is none: the **Kaimal spectrum** is a one-point spectrum, and **Coherence** is a separate model (IEC exponential) that the **Wind field** needs as well.
- "Two elements beam" was used for the two-mass system. Resolved to a **Spring chain**: a bending-element beam would couple both masses through every term of K.
