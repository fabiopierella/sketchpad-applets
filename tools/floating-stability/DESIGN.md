# Floating platform stability — design notes

## The teaching point

A floating wind turbine can be held upright three ways, and every real design is
a blend of them:

```
C55  =  ρg·I_wp        +  ρg∇(KB − KG)  +  C55_moor
        waterplane          ballast         mooring
        semi-submersible    spar            tension-leg platform
```

The three terms are additive and exhaust the possibilities, which is why the
design space is drawn as a triangle. The applet's job is to make a student feel
the trade rather than be told it: every slider pushes on exactly one corner.

## Decisions worth keeping

**The model is differentiated, not derived.** One function gives the net force
and the pitch moment for a hull placed at any (surge, heave, pitch). Equilibrium
is Newton's method on it; the stiffness matrix is its numerical derivative.
Nothing is hand-derived, which is where the sign errors in hydrostatics live.
The check that this works is `verify.mjs`: the pitch stiffness found by
differentiation agrees with the textbook `ρg∇·GM` to better than 0.01% across
six quite different hulls.

**Equilibrium is solved, so the couplings are real.** Adding ballast lowers the
centre of gravity *and* deepens the hull, because the draft is found rather than
assumed. Students discover the trade instead of being told about it.

**Hull depth had to become a control.** It was not in the original list, but
without it the ballast corner is unreachable: a 40 m hull always has its centre
of gravity above its centre of buoyancy, so `KB − KG` is negative and the spar
corner is empty. A spar is 100 m deep, and that is *why* it works.

**The ballast term is shown signed, not clamped.** For any semi-submersible it
is negative — the high centre of gravity is a penalty being paid, not merely an
unused mechanism. A ternary plot cannot show a negative share, so the triangle
normalises on the positive terms and the negative value is reported beside it in
red. That is the lesson, not an edge case.

**The mooring regime emerges, it is not a setting.** One line model covers all
three: catenary with seabed touchdown while slack, elastic `EA(d − L₀)/L₀` once
taut. Heavy, long and anchors far out gives a catenary; light and short gives a
taut system; anchors directly below gives tendons. Axial elasticity is what
makes the tension-leg corner reachable at all — an inextensible vertical tendon
would be infinitely stiff.

**A tension-leg platform shows a negative GM and is still stable.** It has no
hydrostatic stability whatever; the tendons are the whole story. This looks like
a bug, so `verify.mjs` pins it.

## What is deliberately crude

- **Added mass is constant coefficients**, not a diffraction solution. It sets
  the natural periods, so it is the crudest thing that matters, and it is stated
  on the page rather than buried.
- **Steel mass** scales with column shell area and bracing with spacing. Enough
  that a bigger hull costs something; not a real structural model.
- **The three columns of a real semi** are two here, because the picture is a
  side view. Displacement and inertia are computed from real circular columns,
  so the numbers are in metres and seconds and mean something, but this is not
  any particular platform.

## Still open

- No waves. Excitation and an RAO curve would show resonance directly, and
  would need Froude-Krylov forcing at minimum. This is where scope runs away.
- No second-order mooring effects, no line dynamics: the mooring stiffness is
  linearised about the equilibrium and then held constant.
- The free decay is shown at six times real speed. Honest periods are tens of
  seconds and nobody watches that in a lecture, but the factor is arbitrary.
- Heel is reported but not checked against a limit. A "keep it under 5°"
  challenge with a pass indicator would sharpen it into a design exercise.
