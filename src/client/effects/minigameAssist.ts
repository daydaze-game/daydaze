// Resolves the local high meter into a small adult-only offline game assist.
import { highAssist } from "../../game/effects/minigameModifiers.ts";
import { getMeters } from "./high.ts";
import { ADULT_OK } from "../adult.ts";
import { ONLINE } from "../net/session.ts";

export const minigameAssist = (): number =>
  highAssist(getMeters().high.level, ADULT_OK, ONLINE);
