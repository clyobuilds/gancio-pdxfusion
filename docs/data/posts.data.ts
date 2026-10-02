import { createContentLoader } from 'vitepress'

export default createContentLoader('blog/*.md', {
  render: false,
  includeSrc: false,
  transform(raw) {
    return raw
      .sort((a, b) => +new Date(b.frontmatter.date) - +new Date(a.frontmatter.date))
  }
})