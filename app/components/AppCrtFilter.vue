<template>
  <div class="app-crt-filter" aria-hidden="true">
    <span class="app-crt-filter__scanlines" />
    <span class="app-crt-filter__rgb" />
    <span class="app-crt-filter__glow" />
    <span class="app-crt-filter__vignette" />
  </div>
</template>

<style scoped>
.app-crt-filter {
  position: fixed;
  z-index: 900;
  inset: 0;
  visibility: hidden;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  -webkit-backdrop-filter: contrast(1.02) saturate(0.96);
  backdrop-filter: contrast(1.02) saturate(0.96);
  transition:
    opacity 180ms ease,
    visibility 0s linear 180ms;
}

:global(html[data-visual-filter-enabled='true'] .app-crt-filter) {
  visibility: visible;
  opacity: 1;
  transition-delay: 0s;
}

.app-crt-filter > span {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.app-crt-filter__scanlines {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 2px,
    rgb(0 0 0 / 7%) 3px,
    rgb(0 0 0 / 7%) 4px
  );
  background-size: 100% 4px;
  mix-blend-mode: multiply;
  animation: crt-scanline-drift 10s linear infinite;
}

.app-crt-filter__rgb {
  opacity: 0.9;
  background-image: repeating-linear-gradient(
    to right,
    rgb(255 64 64 / 2.5%) 0,
    rgb(255 64 64 / 2.5%) 1px,
    rgb(72 255 154 / 2%) 1px,
    rgb(72 255 154 / 2%) 2px,
    rgb(64 132 255 / 2.5%) 2px,
    rgb(64 132 255 / 2.5%) 3px
  );
  background-size: 3px 100%;
  mix-blend-mode: screen;
}

.app-crt-filter__glow {
  opacity: 0.52;
  background:
    radial-gradient(circle at 18% 12%, color-mix(in oklch, var(--theme-1) 9%, transparent) 0, transparent 38%),
    radial-gradient(circle at 82% 78%, color-mix(in oklch, var(--theme-2) 7%, transparent) 0, transparent 42%);
  mix-blend-mode: screen;
  animation: crt-glow-flicker 5s steps(8, end) infinite;
}

.app-crt-filter__vignette {
  background: radial-gradient(ellipse at center, transparent 54%, rgb(0 0 0 / 4%) 74%, rgb(0 0 0 / 16%) 100%);
}

@keyframes crt-scanline-drift {
  from {
    background-position: 0 0;
  }

  to {
    background-position: 0 4px;
  }
}

@keyframes crt-glow-flicker {
  0%,
  100% {
    opacity: 0.52;
  }

  20% {
    opacity: 0.56;
  }

  42% {
    opacity: 0.49;
  }

  68% {
    opacity: 0.54;
  }

  84% {
    opacity: 0.5;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-crt-filter,
  .app-crt-filter__scanlines,
  .app-crt-filter__glow {
    animation: none;
    transition: none;
  }
}

@media (prefers-contrast: more) {
  .app-crt-filter {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  .app-crt-filter__scanlines,
  .app-crt-filter__rgb,
  .app-crt-filter__vignette {
    opacity: 0.5;
  }
}

@media (prefers-reduced-transparency: reduce), (forced-colors: active) {
  .app-crt-filter {
    display: none;
  }
}
</style>
