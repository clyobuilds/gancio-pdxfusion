// this is from squidcity of robey
// https://code.lag.net/robey/squidcity/src/branch/main/src/http_dict.ts
// RFC 8941 defines a way for HTTP header values to contain a small dict of
// key/value pairs, where the values can be typed number/string/bool/binary
// or a list of same, and each value can have "parameters" (more key/value
// pairs). these are their stories.
//
// https://www.rfc-editor.org/rfc/rfc8941

export type FieldValue = number | string | boolean | Uint8Array

export interface DictValue {
  value: FieldValue | FieldValue[]
  params?: Map<string, FieldValue>
}

function encodeFieldValue(value: FieldValue): string {
  if (typeof value === 'boolean') {
    return '?' + (value ? '1' : '0')
  }
  if (typeof value === 'string') {
    return `"` + value.replaceAll(/["\\]/g, s => '\\' + s) + `"`
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  if (value instanceof Uint8Array) {
    return `:${Buffer.from(value).toString('base64')}:`
  }
  return ''
}

function encodeInnerList(list: FieldValue[]): string {
  return '(' + list.map(encodeFieldValue).join(' ') + ')'
}

// encode RFC 8941 structured fields
export function encodeDictValue(value: DictValue): string {
  let ret = Array.isArray(value.value) ? encodeInnerList(value.value) : encodeFieldValue(value.value)
  if (value.params !== undefined) {
    for (const [k, v] of value.params.entries()) {
      ret += (v === true) ? `;${k}` : `;${k}=${encodeFieldValue(v)}`
    }
  }
  return ret
}

export function encodeStructuredField(field: Map<string, DictValue>): string {
  return [...field.entries()].map(([key, value]) => `${key}=${encodeDictValue(value)}`).join(', ')
}

// decode RFC 8941 structured fields
export function decodeStructuredField(s: string): Map<string, DictValue> {
  let i = 0

  function ws() {
    while (i < s.length && (s[i] == ' ' || s[i] == '\t')) i++
  }

  function isTokenChar(s: string): boolean {
    if (s.charCodeAt(0) < 0x21 || s.charCodeAt(0) > 0x7e) return false
    return !`"(),/:;<=>?@[\\]{}`.includes(s)
  }

  function parseValue(): FieldValue | undefined {
    if (i == s.length) return undefined
    const start = i
    let ret = ''

    switch (s[i]) {
      case `"`: // string
        i++
        while (i < s.length && s[i] != `"`) {
          if (s[i] == '\\' && i + 1 < s.length) i++
          ret += s[i++]
        }
        if (i < s.length && s[i] == `"`) i++
        return ret
      case ':': // binary
        i++
        while (i < s.length && s[i] != ':') i++
        if (i < s.length) i++
        return Buffer.from(s.slice(start + 1, i - 1), 'base64')
      case '?': // boolean
        i++
        if (i < s.length) return s[i++] == '1'
        return false
      default:
        if (s[i]?.match(/[-\d]/)) {
          // number
          i++
          while (i < s.length && s[i]?.match(/[\d.]/)) i++
          return Number(s.slice(start, i))
        } else if (isTokenChar(s[i]!)) {
          i++
          while (i < s.length && isTokenChar(s[i]!)) i++
          return s.slice(start, i)
        } else {
          return undefined
        }
    }
  }

  function parseList(): FieldValue[] {
    if (i < s.length && s[i] == '(') i++
    const ret: FieldValue[] = []
    ws()
    while (i < s.length && s[i] != ')') {
      const v = parseValue()
      if (v === undefined) break
      ret.push(v)
      ws()
    }
    if (i < s.length && s[i] == ')') i++
    return ret
  }

  function parseDictMember(): { key: string, value: DictValue } {
    const start = i
    while (i < s.length && s[i]?.match(/[-\w_.*]/)) i++
    const key = s.slice(start, i)

    let value: FieldValue | FieldValue[] = true
    if (i < s.length && s[i] == '=') {
      i++
      value = i < s.length ? (s[i] == '(' ? parseList() : parseValue()) ?? true : true
    }

    const params: Map<string, FieldValue> = new Map()
    while (i < s.length && s[i] == ';') {
      i++
      ws()
      const start = i
      while (i < s.length && s[i]?.match(/[-\w_.*]/)) i++
      const key = s.slice(start, i)
      if (i < s.length && s[i] == '=') {
        i++
        const value = parseValue()
        if (value === undefined) break
        params.set(key, value)
      } else {
        params.set(key, true)
      }
    }

    return { key, value: { value, params } }
  }

  ws()
  const ret: Map<string, DictValue> = new Map()
  while (i < s.length) {
    const { key, value } = parseDictMember()
    ret.set(key, value)
    ws()
    if (i < s.length && s[i] == ',') {
      i++
      ws()
    }
  }
  return ret
}
