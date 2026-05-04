import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { h, onMounted } from 'vue'
import './custom.css'
import PaperHome from './components/PaperHome.vue'

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
