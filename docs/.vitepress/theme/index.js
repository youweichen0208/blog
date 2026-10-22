import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { h, onMounted, onUnmounted } from 'vue'
import './custom.css'
import PaperHome from './components/PaperHome.vue'
import DevSearchBar from './components/DevSearchBar.vue'
import DocIntro from './components/DocIntro.vue'
import ReadingInfo from './components/ReadingInfo.vue'


export default {
  extends: DefaultTheme,
  Layout() {
    const { frontmatter } = useData()

    return h(
      DefaultTheme.Layout,
      null,
      {
        'layout-top': () =>
          h('a', { href: '#main-content', class: 'skip-link' }, '跳到正文'),
        'nav-bar-content-before': () => h(DevSearchBar),
        'doc-before': () => h(DocIntro),
        'aside-outline-after': () => h(ReadingInfo),
        ...(frontmatter.value.layout === 'home'
          ? {
              'home-hero-before': () => h(PaperHome),
            }
          : {}),
      },
    )
  },
  setup() {
    let outlineObserver
    onUnmounted(() => outlineObserver?.disconnect())

    onMounted(() => {
      const contentRoot = document.querySelector('.VPContent')
      if (contentRoot && !contentRoot.id) {
        contentRoot.id = 'main-content'
      }

      // Follow VitePress's active heading without scrolling the article itself.
      let previousActiveLink = null
      const followActiveHeading = () => {
        const container = contentRoot?.querySelector('.aside-container')
        if (!container || !container.getClientRects().length) return

        const activeLink = container.querySelector('.outline-link.active')
        if (activeLink === previousActiveLink) return
        previousActiveLink = activeLink

        if (!activeLink) {
          container.scrollTo({ top: 0, behavior: 'instant' })
          return
        }

        const bounds = container.getBoundingClientRect()
        const linkBounds = activeLink.getBoundingClientRect()
        const inset = 32
        if (linkBounds.top < bounds.top + inset || linkBounds.bottom > bounds.bottom - inset) {
          container.scrollTo({
            top: container.scrollTop + linkBounds.top - bounds.top - container.clientHeight / 2 + linkBounds.height / 2,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          })
        }
      }

      if (contentRoot) {
        outlineObserver = new MutationObserver(followActiveHeading)
        outlineObserver.observe(contentRoot, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['class'],
        })
        followActiveHeading()
      }

      // Mermaid lightbox 功能
      let overlay = document.getElementById('mermaid-overlay')
      if (!overlay) {
        overlay = document.createElement('div')
        overlay.id = 'mermaid-overlay'
        document.body.appendChild(overlay)
      }

      overlay.addEventListener('click', () => {
        overlay.classList.remove('active')
      })

      document.addEventListener('click', (e) => {
        const svg = e.target.closest('.mermaid svg')
        if (!svg) return
        const clone = svg.cloneNode(true)
        overlay.innerHTML = ''
        overlay.appendChild(clone)
        overlay.classList.add('active')
      })
    })
  }
}
