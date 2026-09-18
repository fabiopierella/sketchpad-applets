# Cantilever mode lab — design notes

Carried over from the sketchpad's `TODO.md` §3a when the applet moved here. The
physics is solid and verified: 16 Euler–Bernoulli elements, generalised
eigenproblem via the Cholesky factor of M, frequencies within 0.004% of the
closed-form cantilever (`npm test`).

## The teaching goal

The goal for the *first* lecture is that students notice modes **exist** and get
a feel for triggering them. Formal modal decomposition comes later, and part one
should set it up rather than pre-empt it.

- **Integrate the full FE system directly (Newmark), not modal coordinates.**
  The current prototype integrates modal coordinates, which quietly presupposes
  modes. Direct integration means nothing in the simulation knows what a mode
  is, and mode-like behaviour *emerges* — a far stronger demonstration. Cost is
  small: factorise the effective stiffness whenever the sliders change, then two
  triangular solves per step. Keep the eigensolver for part two and for
  calibrating Rayleigh damping.
- **A frequency sweep is the key part-one feature.** Ramp the forcing frequency
  slowly and plot amplitude against it; the peaks appear out of nothing and the
  students discover that certain frequencies are special before anyone says
  "eigenvalue". Those peak locations become the answer key for part two.
- **One applet, two modes, so the continuity is visible.** *Explore* has the
  beam, mass sliders, pluck, forcing dial and sweep plot. *Decompose* adds mode
  shapes, marks ƒ₁ ƒ₂ ƒ₃ on the sweep plot the students already produced, and
  plots the modal coordinates obtained by projecting the same live response,
  `qᵣ = φᵣᵀMx`. Same motion, new view — not a different model.
- **Natural frequencies are hidden in Explore mode.** No readout, no snap-to
  button; they hunt for the peaks. Widen the default damping so the peaks stay
  findable on a phone.

Challenges that follow from this: *make the beam bend in an S*, *find a
frequency where the middle barely moves*, *pluck it two ways and explain why the
wobble differs*.
