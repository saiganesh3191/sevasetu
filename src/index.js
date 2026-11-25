import { onRequest } from '../functions/api/[[path]].js'

export default {
  fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname.replace(/^\/api\/?/, '')
    return onRequest({ request, env, ctx, params: { path: pathname } })
  },
}
