import test from 'node:test'
import assert from 'node:assert/strict'
import { locateProject } from './ProjectMap.locations.ts'

test('maps declared North East towns and area variants, without guessing unknown areas', () => {
  for (const name of ['Newcastle', 'Newcastle upon Tyne', 'Gateshead', 'Sunderland', 'Durham', 'Teesside', 'Northumberland', 'Berwick-upon-Tweed', 'Middlesbrough, UK']) {
    const point = locateProject(name)
    assert.ok(point, name)
    assert.ok(point.x > 0 && point.x < 480 && point.y > 0 && point.y < 480, name)
  }
  for (const name of ['Remote', 'North East', 'London', 'Newcastleton', '']) assert.equal(locateProject(name), null)
})
