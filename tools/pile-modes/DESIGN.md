# Pile lab — design notes

Decided 2026-09-24, before any code. Vocabulary is in the repo's `CONTEXT.md`.

## The teaching goal

Students find the natural frequencies of a pile by hand: tap it, shake it,
watch a probe's displacement over time. The lesson the physics will actually
deliver is about **absence**: where you excite decides which modes you *fail*
to excite, and where you measure decides which you fail to see. It will rarely
make a higher mode dominant: a mode's share of a tap scales with its shape
value at the tap divided by its frequency, so mode 1 wins almost everywhere.
Design for the lesson that is really there.

The look follows the double pendulum at dex-2dphys.github.io: the thing itself
drawn clean with its history fading behind it, and a time plot underneath.

## Relation to modal-beam

A separate tool, not modal-beam's planned Explore mode. modal-beam stays the
"decompose" view (modes named, modal coordinates plotted); this is the
"discover" view, where nothing on screen names a mode. The FE solver is
copied, not shared, because every tool is a self-contained file.

## Decisions

- **Upright pile, rigidly clamped at the base, free at the top.** No soil
  springs; they are a good later extension, not part of a first lab.
- **The Nacelle is fixed at the top; students change its weight only.** Mass
  ratio nacelle : pile from 0 to 3, default 1. Zero is the textbook bare
  cantilever. A heavy nacelle turns the top into a near-node of mode 2, so a
  probe left at the top quietly loses mode 2. That is a discovery, not a bug.
- **Direct time integration of the full FE model (Newmark), not modal
  coordinates**, so nothing in the simulation knows what a mode is.
- **Tap**: a quick click with little movement. A fixed-strength impulse at
  that height, pushing away from the cursor's side. Fixed strength, so taps at
  different heights compare fairly.
- **Shake**: press and move. A soft spring joins the cursor to that height,
  drawn as a line to a dot at the hand. Its stiffness is a sixth of the bare
  pile's tip stiffness, which moves the first frequency by 8 % while held at
  the top (`verify.mjs` holds it under 10 %). A rigid grip would clamp the
  pile and change the very frequencies being hunted. Shaking in time builds a
  swing about twice the hand's movement; well off resonance it barely moves.
- **Pull-and-release was rejected**: a slow pull weights modes by 1/ω², so it
  is always mode 1 and teaches nothing position-dependent.
- **Probe** on a ruler beside the pile, never on the pile itself, so moving it
  cannot be confused with a Tap or Shake. Defaults to the top. The ruler shows
  height as a fraction of L.
- **Plot: probe displacement over time only.** No spectrum. Students time the
  swings themselves.
- **Ghosts**: fading outlines of recent pile shapes, which fill in a mode's
  envelope when one rings alone and look visibly mixed when several do.
- **Dimensionless, with time scaled so mode 1 swings at about 1 Hz on screen
  at the default nacelle weight.** The scale is then fixed: a heavier nacelle
  visibly swings slower, which is the point. Real monopile frequencies
  (~0.2–0.3 Hz) are too slow to shake along to.
- **Damping fixed**: Rayleigh, about 2 % on mode 1, so a tap rings for 10–15
  swings and higher modes die faster. No slider. A **Calm** button stops
  everything.
- **Frequencies are never shown.** No readout, no mode shapes, no labels.
- **No guidance text to begin with**, a pure sandbox. Challenges can be added
  later, folded away. The one exception is a single hint line naming the
  three gestures, as the pendulum has, which fades on first touch.

## What the physics turned out to say

Found while writing `verify.mjs`, and worth knowing before teaching with it:

- **With the default nacelle (1), mode 2's node is at 0.95 L, not 0.78 L.**
  The textbook 0.78 L is for a bare cantilever. A nacelle pulls the node
  nearly to the top, so the default probe, at the top, sees mode 2 at only a
  fifth of its largest swing, and a tap at the top barely excites it. To find
  mode 2, students have to tap and probe around mid-height. Set the nacelle to
  zero and the node drops back to 0.78 L. This is the lab working as intended,
  but it means the first thing a student sees is almost pure mode 1.
- **On screen, mode 2 swings at about 10 Hz and mode 3 at about 33 Hz** (with
  the default nacelle). Mode 2 is a visible shiver. Mode 3 is faster than a
  60 Hz display can draw, so it shows as a blur in the ghosts and a dense band
  on the trace, and its stronger damping kills it within a second.

## Verification (`verify.mjs`)

- The first three frequencies against the closed-form cantilever with a tip
  mass, across the whole weight range.
- A Tap at mode 2's node puts (near) zero energy into mode 2. This is the
  lab's central claim, so it is the one pinned.
