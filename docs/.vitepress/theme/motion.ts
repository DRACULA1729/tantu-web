// Client-side navigation motion: smooth-scroll gating around route changes,
// page-enter replay, and anchor-target flash.
// SSR-safe: nothing here touches window/document at module scope.
import type { Router } from "vitepress";

const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function setupRouterMotion(router: Router) {
  const prevBefore = router.onBeforeRouteChange;
  router.onBeforeRouteChange = async (to) => {
    if ((await prevBefore?.(to)) === false) return false;
    // Keep route-change scrolls (to-top, history restore) instant; only
    // in-page anchor scrolls should be smooth.
    document.documentElement.classList.add("vp-no-smooth");
  };

  const prevAfter = router.onAfterRouteChanged;
  router.onAfterRouteChanged = async (to) => {
    await prevAfter?.(to);
    // The router scrolls in a nextTick; re-enable smooth after it lands.
    setTimeout(() => {
      document.documentElement.classList.remove("vp-no-smooth");
    }, 150);
    if (!reduced()) replayPageEnter();
    requestAnimationFrame(() => {
      updateElastic(); // page height changed with the new content
      if (location.hash) flashTarget(location.hash);
    });
  };
}

export function setupDomMotion() {
  // Deep links (#hash in the initial URL) should position instantly, not
  // animate down the whole page while it hydrates.
  document.documentElement.classList.add("vp-no-smooth");
  setTimeout(() => document.documentElement.classList.remove("vp-no-smooth"), 300);
  // The router navigates with pushState, so hashchange never fires;
  // catch same-page anchor clicks by delegation instead. This listener runs
  // before the router's window-level one, and preventDefault() makes the
  // router skip the click entirely, so the eased scroll below owns the jump.
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    const a = (e.target as Element).closest?.("a[href*='#']");
    if (!a) return;
    const url = new URL((a as HTMLAnchorElement).href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
    let el: HTMLElement | null = null;
    try {
      el = document.getElementById(decodeURIComponent(url.hash).slice(1));
    } catch {}
    if (!el || reduced()) return; // reduced motion: native instant jump
    e.preventDefault();
    if (url.hash !== location.hash) history.pushState(history.state, "", url.hash);
    smoothScrollTo(targetTop(el), () => flashTarget(url.hash));
  });
  if (location.hash) flashTarget(location.hash);
  setupElasticEnd();
}

/* Elastic overscroll at the end of the page, per the scroll-snap technique
 * from https://css-tricks.com/elastic-overflow-scrolling/: a spacer after the
 * content gives the scroller real room past EOF, and `scroll-snap-type: y
 * proximity` + `scroll-snap-align: end` on the content make the browser's own
 * snap physics pull it back once the gesture ends. Native, so it holds for
 * exactly as long as the user scrolls and springs back on release. The JS
 * here only gates the effect (vp-elastic class) to pages that actually
 * scroll, so short pages don't grow a phantom scrollbar. */
const ELASTIC_ZONE = 100; // must match the .Layout::after spacer height

function updateElastic() {
  document.documentElement.classList.toggle(
    "vp-elastic",
    document.documentElement.scrollHeight > window.innerHeight + 50
  );
}

function setupElasticEnd() {
  updateElastic();
  window.addEventListener("resize", updateElastic, { passive: true });

  // Retract is debounced off ALL activity (wheel, touch, scroll — including
  // our own retract animation's scroll events, which keep pushing the timer
  // forward until it finishes). scrollend is deliberately not used: it fires
  // between individual wheel notches, so retracting on it makes the page
  // fight the user's next notch — that reads as vibration at the bottom.
  const RETRACT_IDLE = 320;
  let pending: ReturnType<typeof setTimeout> | undefined;
  let touchActive = false;

  const tryRetract = () => {
    pending = undefined;
    if (touchActive) return; // touchend reschedules
    if (retracting) return;
    if (!document.documentElement.classList.contains("vp-elastic")) return;
    const boundary =
      document.documentElement.scrollHeight - window.innerHeight - ELASTIC_ZONE;
    if (window.scrollY <= boundary + 1) return;
    if (reduced()) {
      window.scrollTo({ top: boundary, behavior: "instant" });
      return;
    }
    // inOut start is sub-pixel for the first frames, so a retract that a
    // late wheel notch interrupts never shows as a visible jiggle
    retracting = true;
    smoothScrollTo(
      boundary,
      () => {
        retracting = false;
      },
      { duration: 550, ease: "inOut", onCancel: () => (retracting = false) }
    );
  };
  let retracting = false;

  const schedule = () => {
    if (retracting) return; // the retract's own scroll events must not defer it
    clearTimeout(pending);
    pending = setTimeout(tryRetract, RETRACT_IDLE);
  };

  window.addEventListener("wheel", schedule, { passive: true });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener(
    "touchstart",
    () => {
      touchActive = true;
      clearTimeout(pending);
    },
    { passive: true }
  );
  window.addEventListener(
    "touchend",
    () => {
      touchActive = false;
      schedule();
    },
    { passive: true }
  );
}

/* Eased anchor scrolling. Native CSS smooth scroll has no duration control,
 * so long jumps lurch; this scales duration with distance instead. */
let cancelScroll: (() => void) | null = null;

function targetTop(el: HTMLElement) {
  const nav = document.querySelector<HTMLElement>(".VPNav");
  const local = document.querySelector<HTMLElement>(".VPLocalNav");
  const offset = (nav?.offsetHeight ?? 64) + (local?.offsetHeight ?? 0) + 24;
  // never land inside the elastic zone: it would immediately retract away
  // from the heading the user asked for
  const spacer = document.documentElement.classList.contains("vp-elastic")
    ? ELASTIC_ZONE
    : 0;
  const max =
    document.documentElement.scrollHeight - window.innerHeight - spacer;
  const raw = el.getBoundingClientRect().top + window.scrollY - offset;
  return Math.max(0, Math.min(raw, max));
}

function smoothScrollTo(
  to: number,
  done?: () => void,
  opts?: { duration?: number; ease?: "inOut" | "out"; onCancel?: () => void }
) {
  cancelScroll?.();
  const from = window.scrollY;
  const dist = to - from;
  if (Math.abs(dist) < 2) {
    done?.();
    return;
  }
  // ease-in-out + generous duration: long jumps glide instead of teleporting
  const duration = opts?.duration ?? Math.min(1200, 300 + Math.abs(dist) * 0.15);
  const start = performance.now();
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const ease = opts?.ease === "out" ? easeOutCubic : easeInOutCubic;
  let raf = 0;
  const stop = () => {
    cancelAnimationFrame(raf);
    removeCancelers();
    cancelScroll = null;
  };
  // hand control back the moment the user scrolls or types
  const onUserInput = () => {
    stop();
    opts?.onCancel?.();
  };
  const addCancelers = () => {
    window.addEventListener("wheel", onUserInput, { passive: true });
    window.addEventListener("touchstart", onUserInput, { passive: true });
    window.addEventListener("keydown", onUserInput);
  };
  const removeCancelers = () => {
    window.removeEventListener("wheel", onUserInput);
    window.removeEventListener("touchstart", onUserInput);
    window.removeEventListener("keydown", onUserInput);
  };
  addCancelers();
  cancelScroll = stop;
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    // "instant" bypasses the CSS scroll-behavior so each frame lands exactly
    window.scrollTo({ top: from + dist * ease(t), behavior: "instant" });
    if (t < 1) {
      raf = requestAnimationFrame(frame);
    } else {
      stop();
      done?.();
    }
  };
  raf = requestAnimationFrame(frame);
}

function replayPageEnter() {
  // doc pages render .VPDoc; the home/landing layout renders .VPHome
  const el = document.querySelector<HTMLElement>(".VPDoc, .VPHome");
  if (!el) return;
  el.classList.remove("vp-page-enter");
  void el.offsetWidth; // reflow so the animation restarts
  el.classList.add("vp-page-enter");
}

function flashTarget(hash: string) {
  if (!hash || reduced()) return;
  let el: HTMLElement | null = null;
  try {
    el = document.getElementById(decodeURIComponent(hash).slice(1));
  } catch {
    return;
  }
  if (!el) return;
  el.classList.remove("vp-flash");
  void el.offsetWidth;
  el.classList.add("vp-flash");
  el.addEventListener("animationend", () => el!.classList.remove("vp-flash"), {
    once: true,
  });
}
