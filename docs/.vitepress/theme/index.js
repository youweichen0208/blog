import DefaultTheme from 'vitepress/theme'
import './custom.css'
import { onMounted } from 'vue'

export default {
  extends: DefaultTheme,
  setup() {
    onMounted(() => {
      // 创建遮罩层
      const overlay = document.createElement('div')
      overlay.id = 'mermaid-overlay'
      document.body.appendChild(overlay)

      overlay.addEventListener('click', () => {
        overlay.classList.remove('active')
      })

      // 监听 Mermaid 图表点击
      document.addEventListener('click', (e) => {
        const svg = e.target.closest('.mermaid svg')
        if (!svg) return

        const clone = svg.cloneNode(true)
        overlay.innerHTML = ''
        overlay.appendChild(clone)
        overlay.classList.add('active')
      })
    })
  },
}
