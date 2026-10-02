import { describe, expect, it } from 'vitest'
import { focalPointSchema } from '../../server/lib/validator'

// https://docs-p.joinmastodon.org/api/guidelines/#focal-points
describe('image Focalpoint', () => {
  it('should parse JSON array of float', () => {
    const ret = focalPointSchema.parse('[0,0]')
    expect(ret).toEqual([0, 0])
  })

  it('should parse string comma-separated', () => {
    const ret = focalPointSchema.parse('0,0')
    expect(ret).toEqual([0, 0])
  })

  it('should parse mixed array', () => {
    const ret = focalPointSchema.parse(['0', 0])
    expect(ret).toEqual([0, 0])
  })

  it('should validate min/max bounds', () => {
    expect(() => focalPointSchema.parse([-10, 0])).toThrow()
    expect(() => focalPointSchema.parse([1.1, 0])).toThrow()
  })

  it('should round to two decimal places', () => {
    const ret = focalPointSchema.parse('0.12345,0.6789')
    expect(ret).toEqual([0.12, 0.68])
  })

  it('should parse negative values', () => {
    const ret = focalPointSchema.parse('-0.5,-0.5')
    expect(ret).toEqual([-0.5, -0.5])
  })
})