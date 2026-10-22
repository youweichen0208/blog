import DefaultTheme from 'vitepress/theme'
import { useData, useRoute } from 'vitepress'
import { h, nextTick, onMounted, onUnmounted, watch } from 'vue'
import './custom.css'
import PaperHome from './components/PaperHome.vue'
import DevSearchBar from './components/DevSearchBar.vue'
import DocIntro from './components/DocIntro.vue'

const FIXED_RAIL_SELECTOR = '.VPSidebar'

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
    let sidebarObserver
    let observeSidebar = () => {}
    const route = useRoute()
    watch(() => route.path, () => nextTick(observeSidebar))
    onUnmounted(() => {
      outlineObserver?.disconnect()
      sidebarObserver?.disconnect()
      document.documentElement.style.removeProperty('--blog-left-rail-width')
    })

    onMounted(() => {
      sidebarObserver = new ResizeObserver(([entry]) => {
        document.documentElement.style.setProperty('--blog-left-rail-width', `${entry.contentRect.width}px`)
      })
      observeSidebar = () => {
        sidebarObserver.disconnect()
        const nav = document.querySelector('.VPSidebar .nav')
        if (nav) sidebarObserver.observe(nav)
      }
      observeSidebar()

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

      // Proxy left-sidebar wheel events only; the article outline scrolls independently.
      document.addEventListener(
        'wheel',
        (event) => {
          if (!window.matchMedia('(min-width: 961px)').matches) {
            return
          }

          if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
            return
          }

          if (!event.target.closest(FIXED_RAIL_SELECTOR)) {
            return
          }

          window.scrollBy({
            top: event.deltaY,
            left: 0,
            behavior: 'auto',
          })
          event.preventDefault()
        },
        { passive: false },
      )

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
