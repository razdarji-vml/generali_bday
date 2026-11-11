"use client";

import { useCallback, useState } from "react";
import { AnimatePresence } from "motion/react";
import { audio, restorePlaybackSession, unlockAudio } from "@/lib/audio";
import { BlowDetector, requestMic } from "@/lib/blow";
import { Gate } from "./Gate";
import { Theatre } from "./Theatre";
import { Celebration } from "./Celebration";

type Stage = "gate" | "theatre" | "celebrate";

export function Experience({ name, debug }: { name: string; debug: boolean }) {
  const [stage, setStage] = useState<Stage>("gate");
  const [detector, setDetector] = useState<BlowDetector>();
  const [run, setRun] = useState(0);
  const [busy, setBusy] = useState(false);

  /** Ask for the mic up-front so the prompt never interrupts the show. */
  const connectMic = useCallback(async () => {
    const stream = await requestMic();
    const { ctx } = audio();
    if (ctx.state !== "running") void ctx.resume();
    setDetector(stream ? new BlowDetector(stream, ctx) : undefined);
  }, []);

  const begin = useCallback(async () => {
    setBusy(true);
    unlockAudio();
    await connectMic();
    setStage("theatre");
  }, [connectMic]);

  const encore = useCallback(async () => {
    unlockAudio();
    await connectMic();
    setRun((r) => r + 1);
    setStage("theatre");
  }, [connectMic]);

  const blownOut = useCallback(() => {
    restorePlaybackSession();
    setStage("celebrate");
  }, []);

  return (
    <main className="stage-root">
      {stage !== "gate" && (
        <Theatre
          key={`theatre-${run}`}
          name={name}
          detector={detector}
          celebrating={stage === "celebrate"}
          onBlownOut={blownOut}
          debug={debug}
        />
      )}
      {stage === "celebrate" && <Celebration key={`celebrate-${run}`}name={name} onEncore={encore} />}
      <AnimatePresence>
        {stage === "gate" && <Gate key="gate" name={name} busy={busy} onBegin={begin} />}
      </AnimatePresence>
    </main>
  );
}
