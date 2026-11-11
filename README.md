# Generali — Birthday Surprise

A theatrical, mobile-first birthday moment:

1. **Gate** — "Generali presents…". Tapping *Take your seat* unlocks audio and asks for the mic up-front, so no permission prompt interrupts the show.
2. **Curtains** — red velvet tied shut with a gold bow. "Starring {name}". Pull the tassel down to snap the ribbon.
3. **Reveal** — curtains sweep open, spotlight flickers on, drumroll, the cake rises on a stage lift, candles light one by one.
4. **Blow** — "Make a wish…" then blow into the phone. Flames lean and shrink with your breath; candles go out one by one.
5. **Finale** — flash, screen shake, confetti cannons + fireworks, brass fanfare, music-box *Happy Birthday*, "Encore" to replay.

All sound is synthesised with Web Audio (no audio files). Mic audio is analysed locally and never leaves the device.

## Personalise

```
/?name=Maria
```

Add `&debug=1` to show live mic levels (useful for tuning `MIN_THRESHOLD` in `lib/blow.ts`).

Copy, candle count and brand colours live in `lib/config.ts`.

## Run

```bash
npm run dev          # http://localhost:3000
npm run dev:https    # HTTPS on your LAN, so a phone can use the mic
```

The microphone only works on `https://` (or `localhost`). For real phone testing, deploying to Vercel is the easiest route.

No mic / permission denied? Press & hold anywhere (or hold Space on desktop) to blow.

## Files

- `components/Experience.tsx` — stage machine (gate → theatre → celebrate)
- `components/Curtains.tsx` — curtains, ribbon, bow, draggable tassel, valance
- `components/Theatre.tsx` — reveal timeline + the blow loop
- `components/Cake.tsx` — SVG cake and candles
- `components/Celebration.tsx` — finale
- `lib/blow.ts` — mic blow detection
- `lib/audio.ts` — synthesised sound effects
