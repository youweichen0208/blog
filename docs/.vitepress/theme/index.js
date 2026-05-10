import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { h, onMounted } from 'vue'
import './custom.css'
import PaperHome from './components/PaperHome.vue'
import DevSearchBar from './components/DevSearchBar.vue'
import DocIntro from './components/DocIntro.vue'

const FIXED_RAIL_SELECTOR = '.VPSidebar, .VPDocAside .outline, .VPDocAside .VPDocAsideOutline'

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
    onMounted(() => {
      const contentRoot = document.querySelector('.VPContent')
      if (contentRoot && !contentRoot.id) {
        contentRoot.id = 'main-content'
      }

      // Fixed side rails can swallow wheel events on desktop, so proxy them to window scroll.
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
