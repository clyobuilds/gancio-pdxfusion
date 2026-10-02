// copied from squidcity
// parse comma-delimited key=value pairs (from an http header) into a map.
export function parseHttpKeyValueHeader(s: string): Map<string, string> {
  const ret = new Map<string, string>()
  let index = 0

  while (index < s.length) {
    const i = s.indexOf('=', index)
    if (i < 0) return ret
    const key = s.slice(index, i).trim()
    index = i + 1
    if (s[index] == `"`) {
      index++
      const i = s.indexOf(`"`, index)
      if (i < 0) {
        ret.set(key, s.slice(index))
        break
      }
      ret.set(key, s.slice(index, i))
      if (s[i + 1] != ',') break
      index = i + 2
    } else {
      const i = s.indexOf(',', index)
      if (i < 0) {
        ret.set(key, s.slice(index))
        break
      }
      ret.set(key, s.slice(index, i))
      index = i + 1
    }
  }

  return ret
}
