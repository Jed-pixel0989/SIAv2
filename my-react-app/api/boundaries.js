import { getDb, json, handleOptions, parseBody } from './_db.js'

export const config = { runtime: 'edge' }

function pointInsideBoundary(lat, lng, coords) {
  let inside = false
  let prev = coords.length - 1
  for (let i = 0; i < coords.length; i++) {
    const [cLat, cLng] = coords[i]
    const [pLat, pLng] = coords[prev]
    const intersects =
      (cLng > lng) !== (pLng > lng) &&
      lat < ((pLat - cLat) * (lng - cLng)) / (pLng - cLng) + cLat
    if (intersects) inside = !inside
    prev = i
  }
  return inside
}

async function readBoundaries(sql) {
  const rows = await sql`SELECT boundary_key, boundary_data FROM system_boundaries`
  let serviceBoundary = null
  let clusterBoundaries = []
  for (const row of rows) {
    const data = typeof row.boundary_data === 'string'
      ? JSON.parse(row.boundary_data)
      : row.boundary_data
    if (row.boundary_key === 'service') serviceBoundary = data
    if (row.boundary_key === 'clusters') clusterBoundaries = data
  }
  return { serviceBoundary, clusterBoundaries }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions()

  const sql = getDb()

  if (req.method === 'GET') {
    const data = await readBoundaries(sql)
    data.clusterBoundaries = (data.clusterBoundaries ?? []).filter(
      (c) => c.name?.toLowerCase().trim() !== 'northbank'
    )
    return json({ success: true, data })
  }

  if (req.method === 'PUT') {
    const input = await parseBody(req)
    const serviceBoundary = input.serviceBoundary ?? null
    const clusterBoundaries = (input.clusterBoundaries ?? []).filter(
      (c) => c.name?.toLowerCase().trim() !== 'northbank'
    )

    try {
      if (Array.isArray(serviceBoundary?.coordinates)) {
        await sql`
          INSERT INTO system_boundaries (boundary_key, boundary_data)
          VALUES ('service', ${JSON.stringify(serviceBoundary)})
          ON CONFLICT (boundary_key) DO UPDATE SET boundary_data = EXCLUDED.boundary_data
        `
      }
      await sql`
        INSERT INTO system_boundaries (boundary_key, boundary_data)
        VALUES ('clusters', ${JSON.stringify(clusterBoundaries)})
        ON CONFLICT (boundary_key) DO UPDATE SET boundary_data = EXCLUDED.boundary_data
      `

      // Re-assign zones based on new cluster polygons
      const consumerRows = await sql`
        SELECT c.id, COALESCE(g.latitude, c.requested_latitude) AS lat,
               COALESCE(g.longitude, c.requested_longitude) AS lng
        FROM consumers c
        LEFT JOIN geo_connections g ON g.consumer_id = c.id
      `
      for (const consumer of consumerRows) {
        if (consumer.lat == null || consumer.lng == null) continue
        for (const cluster of clusterBoundaries) {
          const coords = cluster.coordinates ?? []
          if (!Array.isArray(coords) || coords.length < 3 || !cluster.name) continue
          if (pointInsideBoundary(parseFloat(consumer.lat), parseFloat(consumer.lng), coords)) {
            const zone = cluster.name.trim()
            await sql`UPDATE consumers SET zone = ${zone} WHERE id = ${consumer.id}`
            await sql`UPDATE geo_connections SET zone = ${zone} WHERE consumer_id = ${consumer.id}`
            await sql`UPDATE meter_assets SET zone = ${zone} WHERE consumer_id = ${consumer.id}`
            break
          }
        }
      }

      return json({ success: true, data: await readBoundaries(sql) })
    } catch (err) {
      return json({ success: false, error: err.message }, 500)
    }
  }

  return json({ success: false, error: 'Method not supported' }, 405)
}
