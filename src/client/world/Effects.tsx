// The post stack (bloom, ambient occlusion, tone mapping). Its own chunk, so low-tier players never
// download postprocessing.
import {
  Bloom,
  EffectComposer,
  N8AO,
  SMAA,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { RoomId } from "../../game/rooms.ts";
import { DrunkPost } from "../effects/DrunkPost.tsx";

/**
 * The post stack. `post` adds bloom and the vignette, `ao` adds ambient
 * occlusion; tone mapping and the drunk pass are always in, since the
 * composer takes tone mapping over from the renderer.
 */
export default function Effects({
  room,
  post,
  ao,
  bloom,
}: {
  room: RoomId;
  post: boolean;
  ao: boolean;
  /** Bloom intensity (the Graphics menu's strength). */
  bloom: number;
}) {
  // 2x MSAA: at 1.5x resolution 4x samples cost more than they showed. The
  // occlusion pass reads the depth buffer, which MSAA cannot resolve, so with
  // it the edges are smoothed by SMAA instead.
  return (
    <EffectComposer multisampling={ao ? 0 : 2}>
      {ao && (
        <N8AO
          aoRadius={1.2}
          distanceFalloff={1}
          intensity={2}
          quality="medium"
          halfRes
        />
      )}
      {post && (
        <Bloom
          mipmapBlur
          luminanceThreshold={1}
          luminanceSmoothing={0.2}
          intensity={bloom}
          radius={0.72}
        />
      )}
      <DrunkPost room={room} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {post && <Vignette offset={0.28} darkness={0.72} />}
      {ao && <SMAA />}
    </EffectComposer>
  );
}
