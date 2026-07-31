<template>
  <div class="app-grain" aria-hidden="true" />
</template>

<style>
.app-grain {
  position: fixed;
  z-index: 0;
  inset: 0;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paperNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.72' numOctaves='4' seed='9' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paperNoise)' opacity='.58'/%3E%3C/svg%3E");
  background-color: rgb(255 255 255 / 2%);
  background-blend-mode: soft-light;
  background-repeat: repeat;
  background-size: 180px 180px;
}

html[data-grain-enabled='true'] .app-grain {
  visibility: visible;
  opacity: 0.045;
}

html[data-grain-layer='background'] .app-grain {
  z-index: 0;
}

html[data-grain-layer='content'] .app-grain {
  z-index: 100;
}

html[data-grain-layer='top'] .app-grain {
  z-index: 1000000;
}

@media (prefers-contrast: more) {
  html[data-grain-enabled='true'] .app-grain {
    opacity: 0.02;
  }
}

@media (prefers-reduced-transparency: reduce), (forced-colors: active) {
  .app-grain {
    display: none;
  }
}
</style>
