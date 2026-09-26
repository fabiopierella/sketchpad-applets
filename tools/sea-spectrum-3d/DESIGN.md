# Sea lab 3D — design notes

A variant of `sea-spectrum`, asked for 2026-09-26 after trying that one, and
kept alongside it so the two can be compared. The trace and the spectrum are
unchanged; everything below is about what differs. Read `sea-spectrum`'s
`DESIGN.md` for the decisions the two share.

## Why a variant

The side view at true scale did not add much: a 4 m sea next to a 150 m tower
is a few pixels, and the effect of γ on wave groups did not show. The ask was
an immediate feel for each parameter, and above all for γ bringing larger,
more consistent wave groups.

## Decisions

- **No turbine.** The Probe is a pin on the front edge of the slab.
- **A slab of sea, 1.6 km along the direction of travel and 700 m across**,
  in orthographic isometric view, with a cut-away front face whose top edge
  is the wave profile, drawn in the traces' glow. 1.6 km holds several wave
  groups at Tp = 10 s, which is what this view is for.
- **Heights ×7**, stated on the panel. Without exaggeration the slab is flat.
  ×12 was tried first and made short waves look like spikes.
- **Colour follows height, gloss follows a smoothed slope.** Shading by slope
  alone turned the slab into a barcode, because short waves are the steepest
  even though they carry little energy. Colouring by height, and taking
  normals from the surface smoothed over λp/8, makes big waves bright crests
  over dark troughs and lets a lull read as flat mid-tone.
- **Low sun along the direction of travel**, so a slope's brightness says how
  steep it is.
- **Waves shorter than four grid cells (about 6 m) are not drawn**, only
  omitted from the picture; the Probe and the trace use every component.
- **15× speed** (7.5× in the side-view version). Planned as a 3–4 minute
  exercise, so a change has to show within seconds: 3 minutes of sea now
  passes through the trace in 12 s.
- **WebGL for the slab, 2D canvas for everything else.** Lighting a surface
  is what WebGL is for; the trace, spectrum, profile edge and marks share the
  2D code with the other tools. Without WebGL the slab is missing but the
  profile edge, Probe, trace and spectrum still draw, so the page never
  fails outright.

## What it shows

In side-by-side stills with the same phases, γ = 7 gives a visibly smoother
slab of longer, more regular crests than γ = 1, which is choppier. Groups are
there at every γ; γ makes them longer and cleaner rather than creating them.
The measured effect (from `sea-spectrum`): runs of waves taller than Hs
average 1.33 waves at γ = 1 and 1.71 at γ = 7.
