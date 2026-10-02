import { defineEventHandler, getRouterParams, sendRedirect } from 'h3'
export default defineEventHandler((evt) => {
  const { format, name } = getRouterParams(evt)
  return sendRedirect(evt, `/feed/${format}?collection=${name}`, 302)
})
