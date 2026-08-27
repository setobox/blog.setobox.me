/**
 * Wires the host app's content access into the AI layer.
 *
 * This is the only place the two halves meet: the layer declares the
 * `Retriever` contract, the app supplies an implementation built on
 * `@nuxt/content`. Registering a factory (not an instance) keeps each request's
 * D1 binding scoped to its own event.
 */
export default defineNitroPlugin(() => {
  registerAiRetriever(event => createBlogRetriever(event))
})
