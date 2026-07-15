"use client";

import { useEffect, useState } from "react";
import {
  loadSimulatorSettings,
  saveSimulatorSettings,
  type SimulatorSettings,
  type SimulatorTransportMode,
  type SimulatorVoiceMode,
} from "../../lib/simulator-settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Settings dialog for the Simulate menu — controls how the in-browser
 * chat/voice panels behave in this frontend-only prototype.
 */
export function SimulatorSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<SimulatorSettings>(() =>
    loadSimulatorSettings()
  );

  useEffect(() => {
    if (open) {
      setDraft(loadSimulatorSettings());
    }
  }, [open]);

  const update = <K extends keyof SimulatorSettings>(
    key: K,
    value: SimulatorSettings[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveSimulatorSettings(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Simulator settings</DialogTitle>
          <DialogDescription>
            Controls how the chat and voice simulators behave. These settings
            only affect the simulator in this browser — they never leave your
            device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <section className="space-y-2">
            <label className="flex items-center justify-between">
              <span className="font-medium">Where do replies come from?</span>
            </label>
            <div className="grid gap-1.5">
              {(
                [
                  [
                    "auto",
                    "Automatic",
                    "Same as demo mode in this prototype — prompt-aware stand-in replies.",
                  ],
                  [
                    "demo",
                    "Demo mode",
                    "Deterministic, prompt-aware stand-in. No network, no LLM — useful for screen recordings.",
                  ],
                ] as Array<[SimulatorTransportMode, string, string]>
              ).map(([value, label, help]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 ${
                    draft.transport === value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-border bg-white hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="simulator-transport"
                    className="mt-0.5"
                    checked={draft.transport === value}
                    onChange={() => update("transport", value)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-foreground">
                      {label}
                    </span>
                    <span className="block text-[11.5px] text-muted-foreground">
                      {help}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <label className="flex items-center justify-between">
              <span className="font-medium">Voice audio</span>
            </label>
            <div className="grid gap-1.5">
              {(
                [
                  [
                    "auto",
                    "Automatic",
                    "Use the browser's built-in speech synthesis and recognition.",
                  ],
                  [
                    "browser",
                    "Browser only",
                    "Use the browser's speechSynthesis + SpeechRecognition. Works offline.",
                  ],
                ] as Array<[SimulatorVoiceMode, string, string]>
              ).map(([value, label, help]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 ${
                    draft.voice === value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-border bg-white hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="simulator-voice"
                    className="mt-0.5"
                    checked={draft.voice === value}
                    onChange={() => update("voice", value)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-foreground">
                      {label}
                    </span>
                    <span className="block text-[11.5px] text-muted-foreground">
                      {help}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
