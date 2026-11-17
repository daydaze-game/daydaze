// Everything the Speedway puts over the canvas: the menu, the race HUD and
// the touch driving controls.
import { DriveControls } from "./DriveControls.tsx";
import { RaceHud, SpeedwayMenu } from "./RaceHud.tsx";

/** The Speedway's menu, race HUD and touch driving controls. */
export function SpeedwayPanels() {
  return (
    <>
      <SpeedwayMenu />
      <RaceHud />
      <DriveControls />
    </>
  );
}
