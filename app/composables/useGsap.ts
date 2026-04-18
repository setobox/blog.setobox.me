type Gsap = typeof import('gsap')['gsap']
type ScrollTrigger = typeof import('gsap/ScrollTrigger')['ScrollTrigger']
type SplitText = typeof import('gsap/SplitText')['SplitText']

interface GsapWindow extends Window {
  gsap?: Gsap
  ScrollTrigger?: ScrollTrigger
  SplitText?: SplitText
}

interface GsapPlugins {
  gsap: Gsap
  ScrollTrigger: ScrollTrigger
  SplitText: SplitText
}

interface ExternalScript {
  integrity: string
  src: string
}

const gsapScript: ExternalScript = {
  src: 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js',
  integrity: 'sha384-XmJ9SoHtVOHoQUcKvFAzVXwdkKo1Ie3bhmSoIAkcdsHGaIrVJIkmozyq0FJeb/Ly',
}

const pluginScripts: readonly ExternalScript[] = [
  {
    src: 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js',
    integrity: 'sha384-wl5TeDVvOWt30Pbf8aSo2ZrzsOjddu3avOBvHe+p+OhJt9gP6w9YXmDkN5DK2/dF',
  },
  {
    src: 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/SplitText.min.js',
    integrity: 'sha384-SWJ0lLVRoipvHh59xj0pL7uC7Ih51F+5smaFtrG+2nr+TlDZU5SYJHmxfolbeNTr',
  },
] as const

let gsapPromise: Promise<Gsap | null> | undefined
let pluginsPromise: Promise<GsapPlugins | null> | undefined

function loadScript({ src, integrity }: ExternalScript): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts).find(script => script.src === src)
    const script = existing ?? document.createElement('script')

    function cleanup() {
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }

    function handleLoad() {
      cleanup()
      script.dataset.gsapLoaded = 'true'
      resolve()
    }

    function handleError() {
      cleanup()
      script.remove()
      reject(new Error(`Unable to load external animation script: ${src}`))
    }

    if (script.dataset.gsapLoaded === 'true') {
      resolve()
      return
    }

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })

    if (!existing) {
      script.async = true
      script.crossOrigin = 'anonymous'
      script.integrity = integrity
      script.src = src
      document.head.append(script)
    }
  })
}

export function isGsapReady(): boolean {
  return import.meta.client && Boolean((window as GsapWindow).gsap)
}

export function areGsapPluginsReady(): boolean {
  if (!import.meta.client)
    return false

  const gsapWindow = window as GsapWindow
  return Boolean(gsapWindow.gsap && gsapWindow.ScrollTrigger && gsapWindow.SplitText)
}

async function loadGsapCore(): Promise<Gsap | null> {
  if (!import.meta.client)
    return null

  const gsapWindow = window as GsapWindow
  if (gsapWindow.gsap)
    return gsapWindow.gsap

  await loadScript(gsapScript)
  return gsapWindow.gsap ?? null
}

export function loadGsap(): Promise<Gsap | null> {
  if (gsapPromise)
    return gsapPromise

  const pending = loadGsapCore().catch(() => null)
  gsapPromise = pending
  void pending.then((gsap) => {
    if (!gsap && gsapPromise === pending)
      gsapPromise = undefined
  })

  return pending
}

export function loadGsapWithPlugins(): Promise<GsapPlugins | null> {
  if (pluginsPromise)
    return pluginsPromise

  const pending = (async () => {
    const gsap = await loadGsap()
    if (!gsap)
      return null

    const gsapWindow = window as GsapWindow
    const missingPluginScripts = pluginScripts.filter(({ src }) =>
      src.includes('ScrollTrigger')
        ? !gsapWindow.ScrollTrigger
        : !gsapWindow.SplitText,
    )
    await Promise.all(missingPluginScripts.map(loadScript))

    const { ScrollTrigger, SplitText } = gsapWindow
    if (!ScrollTrigger || !SplitText)
      return null

    gsap.registerPlugin(ScrollTrigger, SplitText)
    return { gsap, ScrollTrigger, SplitText }
  })().catch(() => null)

  pluginsPromise = pending
  void pending.then((plugins) => {
    if (!plugins && pluginsPromise === pending)
      pluginsPromise = undefined
  })

  return pending
}
