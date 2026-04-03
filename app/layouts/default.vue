<template>
  <div flex flex-col min-h-100dvh>
    <Navbar />
    <main class="container" px-4 py-10 flex-1 w-full lg:px-6 md:py-16>
      <slot />
    </main>
    <Footer />
  </div>
</template>
