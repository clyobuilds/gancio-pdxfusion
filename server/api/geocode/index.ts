import { defineEventHandler, createError, getValidatedQuery } from 'h3'
import { z } from 'zod'
import { queryNominatim } from '~~/server/services/geocode'
import { publicSettings } from '~~/server/services'

const schema = z.object({
  q: z.string()
})

/**
 * @openapi
 * /api/geocode:
 *   get:
 *     summary: Search OSM data
 *     description: Search OSM data by name and address.
 *     parameters:
 *       - name: q
 *         in: query
 *         description: Location name or address.
 *         required: true
 *         example: Milano
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of matching places with OSM data.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   icon:
 *                     type: string
 *                     description: Icon name.
 *                     example: mdi-city-variant
 *                   lat:
 *                     type: number
 *                     description: Latitude.
 *                     example: 45.4641943
 *                   lon:
 *                     type: number
 *                     description: Longitude.
 *                     example: 9.1896346
 *                   address:
 *                     type: object
 *                     description: Address object.
 *                   display_name:
 *                     type: string
 *                     description: Place name to be shown.
 *                     example: Milano, Lombardia, Italia
 *                   name:
 *                     type: string
 *                     description: Place name.
 *                     example: Milano
 *       403:
 *         description: Geocoding is not enabled.
 *     tags:
 *       - GeoCode
 */
export default defineEventHandler(async (event) => {
  if (!publicSettings.allow_geolocation) {
    throw createError({ statusCode: 403, message: 'Geocoding is not enabled' })
  }
  const { q } = await getValidatedQuery(event, schema.parse)
  return queryNominatim(q)
})
