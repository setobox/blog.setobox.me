import type { GSAP } from '#shared/types/gsap'

const pluginLoaders = {
  ScrollTrigger: () => import('gsap/ScrollTrigger').then(module => module.ScrollTrigger),
  SplitText: () => import('gsap/SplitText').then(module => module.SplitText),
} as const

export type GSAPPluginName = keyof typeof pluginLoaders
export type GSAPPlugin<Name extends GSAPPluginName>
  = Awaited<ReturnType<typeof pluginLoaders[Name]>>
export type GSAPLoadedPlugins<Names extends readonly GSAPPluginName[]> = {
  [Name in Names[number]]: GSAPPlugin<Name>
}

export const GSAP_PLUGIN_GROUPS = {
  hero: ['ScrollTrigger', 'SplitText'],
} as const satisfies Record<string, readonly GSAPPluginName[]>

const pluginPromises = new Map<GSAPPluginName, Promise<unknown>>()

export async function loadGsapPlugin<Name extends GSAPPluginName>(
  gsap: GSAP,
  name: Name,
): Promise<GSAPPlugin<Name>> {
  let pending = pluginPromises.get(name) as Promise<GSAPPlugin<Name>> | undefined

  if (!pending) {
    pending = pluginLoaders[name]() as Promise<GSAPPlugin<Name>>
    pluginPromises.set(name, pending)
  }

  try {
    const plugin = await pending
    gsap.registerPlugin(plugin)
    return plugin
  }
  catch (error) {
    if (pluginPromises.get(name) === pending)
      pluginPromises.delete(name)

    throw new Error(`Unable to load GSAP plugin: ${name}`, { cause: error })
  }
}

export async function loadGsapPlugins<
  const Names extends readonly GSAPPluginName[],
>(
  gsap: GSAP,
  names: Names,
): Promise<GSAPLoadedPlugins<Names>> {
  const entries = await Promise.all(
    names.map(async name => [name, await loadGsapPlugin(gsap, name)] as const),
  )

  return Object.fromEntries(entries) as GSAPLoadedPlugins<Names>
}
