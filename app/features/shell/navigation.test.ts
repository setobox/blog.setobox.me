import { describe, expect, it } from 'vitest'
import {
  footerNavigation,
  primaryNavigation,
  requiredDiscoverableRoutes,
} from './navigation'

describe('site navigation', () => {
  it('keeps every canonical route discoverable', () => {
    const internalRoutes = new Set(
      [...primaryNavigation, ...footerNavigation]
        .filter(item => !('external' in item && item.external))
        .map(item => item.to),
    )

    expect(requiredDiscoverableRoutes.every(route => internalRoutes.has(route))).toBe(true)
  })

  it('does not duplicate primary navigation destinations', () => {
    const destinations = primaryNavigation.map(item => item.to)
    expect(new Set(destinations).size).toBe(destinations.length)
  })

  it('marks absolute destinations as external', () => {
    const absoluteDestinations = footerNavigation.filter(item => item.to.startsWith('http'))

    expect(absoluteDestinations.length).toBeGreaterThan(0)
    expect(absoluteDestinations.every(item => 'external' in item && item.external)).toBe(true)
  })
})
