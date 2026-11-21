// The last line of defense around the whole game: a part that fails to load
// (a deploy deleted the chunk an open tab points at, and main.tsx's one
// automatic reload is spent) or throws while rendering would otherwise
// unmount everything and leave a blank page. This shows a card with a
// Reload button instead. Wrapped around one lazy panel, it keeps a failed
// download from taking the game down with it; the optional Continue button
// lets that panel's caller finish what it was doing without the panel.

import { Component, Suspense, type ReactNode } from "react";

export class ReloadBoundary extends Component<
  { children: ReactNode; onContinue?: (() => void) | undefined },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: Error) {
    console.error("A part of Daydaze failed to load or render", error);
  }
  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <aside className="update-prompt" role="alert">
        <span>Part of Daydaze didn&apos;t load.</span>
        <button type="button" onClick={() => location.reload()}>
          Reload
        </button>
        {this.props.onContinue && (
          <button type="button" onClick={this.props.onContinue}>
            Continue
          </button>
        )}
      </aside>
    );
  }
}

/** One lazy panel behind its own boundary and Suspense: a failed download
 * shows the card for this panel alone, and clears when the panel unmounts. */
export function LazyPanel({
  children,
  onContinue,
}: {
  children: ReactNode;
  onContinue?: () => void;
}) {
  return (
    <ReloadBoundary onContinue={onContinue}>
      <Suspense fallback={null}>{children}</Suspense>
    </ReloadBoundary>
  );
}
