<template>
  <div text-2xl font-300 inline-flex cursor-default>
    <div flex flex-col children:mx-auto>
      <NuxtImg h-18 w-18 inline-block src="/nuxt.svg" alt="Nuxt" width="72" height="72" />
      <span text-green-400 mt--2>Nuxt 4</span>
    </div>
    <div
      text="3xl gray4"
      m="x-4 y-auto"
      i-carbon-add transform transition-all-500 hover:rotate-135
    />
    <div flex flex-col children:mx-auto>
      <NuxtImg
        h-18
        w-18
        inline-block
        src="/vite.png"
        alt="Vite"
        width="72"
        height="72"
        densities="x1 x2"
        format="webp"
      />
      <span text-purple-500 mt--2>Vitesse</span>
    </div>
  </div>
</template>
