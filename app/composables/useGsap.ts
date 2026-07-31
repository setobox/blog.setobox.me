import type { GSAPPluginName } from '~/utils/gsap-plugins'
import { loadGsapPlugin, loadGsapPlugins } from '~/utils/gsap-plugins'

export function useGsap() {
  const { $gsap } = useNuxtApp()
  const gsap = import.meta.client ? $gsap : null

  async function loadPlugin<Name extends GSAPPluginName>(name: Name) {
    if (!gsap)
      return null

    try {
      return await loadGsapPlugin(gsap, name)
    }
    catch (error) {
      console.error(error)
      return null
    }
  }

  async function loadPlugins<
    const Names extends readonly GSAPPluginName[],
  >(names: Names) {
    if (!gsap)
      return null

    try {
      const plugins = await loadGsapPlugins(gsap, names)
      return { gsap, ...plugins }
    }
    catch (error) {
      console.error(error)
      return null
    }
  }

  return {
    gsap,
    loadPlugin,
    loadPlugins,
  }
}
