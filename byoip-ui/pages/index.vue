<script setup lang="ts">
interface NodeItem {
  ip: string
  port: string
  region: string
  speed: number
  full: string
  status: 'unknown' | 'checking' | 'alive' | 'dead'
  latency: number
  asn: string
  asOrg: string
  country: string
  countryCode: string
  city: string
}

const nodes = ref<NodeItem[]>([])
const search = ref('')
const checking = ref(false)
const toast = ref('')
const showLoading = ref(true)
const lastCheckTime = ref<number | null>(null)
const isDark = ref(false)
let toastTimer: ReturnType<typeof setTimeout>
let refreshTimer: ReturnType<typeof setTimeout>

function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('dark-mode', isDark.value ? '1' : '0')
}

onMounted(async () => {
  if (localStorage.getItem('dark-mode') === '1') {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
  await fetchNodes()
  showLoading.value = false
  checkAll()
  refreshTimer = setInterval(() => { checkAll() }, 300000)
})

const filteredNodes = computed(() => {
  const q = search.value.toLowerCase()
  let list = nodes.value
  if (q) {
    list = list.filter(n => n.ip.includes(q) || n.region.toLowerCase().includes(q) || n.full.includes(q) || n.country.toLowerCase().includes(q) || n.asn.toLowerCase().includes(q) || n.asOrg.toLowerCase().includes(q) || n.city.toLowerCase().includes(q))
  }
  const order: Record<string, number> = { alive: 0, unknown: 1, checking: 2, dead: 3 }
  return [...list].sort((a, b) => order[a.status] - order[b.status])
})

const aliveCount = computed(() => nodes.value.filter(n => n.status === 'alive').length)
const deadCount = computed(() => nodes.value.filter(n => n.status === 'dead').length)
const maxSpeed = computed(() => Math.max(...nodes.value.map(n => n.speed), 0))

function showToast(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2000)
}

async function copyIp(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已成功复制')
  } catch {
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      showToast('已成功复制')
    } catch {
      showToast('复制失败')
    }
  }
}

async function checkNode(node: NodeItem) {
  node.status = 'checking'
  node.latency = 0
  try {
    const data = await $fetch<{ alive: boolean; latency: number }>('/api/check', { params: { ip: node.ip, port: node.port } })
    node.status = data.alive ? 'alive' : 'dead'
    node.latency = data.latency
  } catch {
    node.status = 'dead'
    node.latency = 0
  }
}

async function checkAll() {
  if (checking.value) return
  checking.value = true
  nodes.value.forEach(n => { n.status = 'unknown'; n.latency = 0 })
  await nextTick()
  const concurrency = 5
  let i = 0
  async function next() {
    while (i < nodes.value.length) {
      const idx = i++
      await checkNode(nodes.value[idx])
    }
  }
  await Promise.all(Array.from({ length: concurrency }, next))
  checking.value = false
  lastCheckTime.value = Date.now()
}

const statusText = computed(() => {
  const alive = aliveCount.value
  const dead = deadCount.value
  if (alive + dead === 0) return '未知'
  return `在线: ${alive} / 离线: ${dead}`
})

const statusColor = computed(() => {
  if (aliveCount.value > 0) return 'text-green-700'
  if (deadCount.value > 0) return 'text-red-600'
  return 'text-gray-500'
})

const timeAgo = computed(() => {
  if (!lastCheckTime.value) return ''
  const seconds = Math.floor((Date.now() - lastCheckTime.value) / 1000)
  if (seconds < 60) return `${seconds} 秒前检测`
  return `${Math.floor(seconds / 60)} 分钟前检测`
})

const badgeColors = [
  'bg-red-500', 'bg-blue-600', 'bg-green-600', 'bg-purple-600',
  'bg-pink-500', 'bg-indigo-600', 'bg-teal-500', 'bg-orange-500',
  'bg-cyan-600', 'bg-rose-500', 'bg-violet-600', 'bg-lime-500',
  'bg-amber-500', 'bg-emerald-600', 'bg-fuchsia-600', 'bg-sky-500',
  'bg-yellow-600', 'bg-stone-600'
]

function getBadgeColor(region: string) {
  let hash = 0
  for (let i = 0; i < region.length; i++) {
    hash = region.charCodeAt(i) + ((hash << 5) - hash)
  }
  return badgeColors[Math.abs(hash) % badgeColors.length]
}
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 pb-32">
    <!-- Navigation -->
    <div class="font-mixed font-bold">
      <nav class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-2.5 md:py-3 px-3 fixed top-0 left-0 right-0 z-10">
        <div class="max-w-[1200px] mx-auto flex items-center justify-between px-2 sm:px-4 md:px-4">
          <a href="/" class="font-bold text-gray-800 dark:text-gray-100 no-underline text-base md:text-lg hover:text-blue-500 flex items-center min-w-0 gap-1">
            <svg class="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            <span class="truncate">小钱优选服务</span>
          </a>
          <div class="hidden md:flex flex-1 items-center justify-center gap-1">
            <a href="/" class="text-blue-600 dark:text-blue-400 no-underline !py-1.5 !px-3 rounded-md font-medium bg-blue-50 dark:bg-blue-900/50">首页</a>
          </div>
          <div class="flex items-center gap-2">
            <button @click="toggleDark" class="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" :title="isDark ? '切换亮色模式' : '切换暗色模式'">
              <svg v-if="isDark" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            </button>
          </div>
        </div>
      </nav>
      <div class="h-12"></div>
    </div>

    <!-- Loading Spinner -->
    <div v-if="showLoading" class="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
      <div class="flex flex-col items-center gap-3">
        <svg class="animate-spin h-8 w-8 text-gray-900 dark:text-gray-100" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
        <span class="text-sm text-gray-800 dark:text-gray-200">加载中…</span>
      </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-4 py-8">
      <div class="text-center mb-12">
        <h1 class="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-chinese">小钱优选服务</h1>
        <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-chinese">Cloudflare优选 IP 状态监测服务</p>
        <div class="mt-8 mx-auto max-w-2xl">
          <div class="bg-gradient-to-r from-green-50 dark:from-green-900/30 to-blue-50 dark:to-blue-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 shadow-sm">
            <div class="flex items-center justify-center space-x-2 text-green-700 dark:text-green-400">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="font-mixed text-base text-center">页面加载后自动检测所有IP存活状态</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-green-50 dark:bg-green-900/30 rounded-lg p-6 text-center">
          <div class="text-2xl font-bold text-green-600 dark:text-green-400 font-mixed">{{ nodes.length }}</div>
          <div class="text-sm text-green-700 dark:text-green-400">优选 IP 总数</div>
        </div>
        <div class="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6 text-center">
          <div class="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mixed">{{ maxSpeed.toFixed(0) }}</div>
          <div class="text-sm text-blue-700 dark:text-blue-400">最高带宽 Mbps</div>
        </div>
        
        <div class="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-6 text-center">
          <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400 font-mixed">{{ checking ? '检测中...' : '已检测' }}</div>
          <div class="text-sm text-yellow-700 dark:text-yellow-400">IP存活检测</div>
        </div>
      </div>

      <!-- Status + Search -->
      <div class="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <div class="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="w-2 h-2 rounded-full" :class="aliveCount > 0 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'"></div>
          <span class="text-sm font-medium" :class="statusColor">{{ statusText }}</span>
        </div>
        <div class="w-full sm:w-72">
          <input
            v-model="search"
            type="text"
            placeholder="筛选 IP / 地区 / ASN..."
            class="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-800 focus:border-blue-300"
          />
        </div>
      </div>

      <!-- Card Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="node in filteredNodes" :key="node.full">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <!-- Card Header -->
            <div class="flex items-start sm:items-center justify-between mb-4 gap-3">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" :class="getBadgeColor(node.region)">
                    {{ node.region }}
                  </div>
                </div>
                <div>
                  <h3 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 font-mixed break-all">{{ node.ip }}</h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    <template v-if="node.country || node.city">{{ node.country }}<template v-if="node.city"> · {{ node.city }}</template></template>
                  </p>
                </div>
              </div>
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 rounded-full" :class="node.status === 'alive' ? 'bg-green-500' : node.status === 'dead' ? 'bg-red-500' : node.status === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'"></div>
                <span class="text-xs font-medium" :class="node.status === 'alive' ? 'text-green-700 dark:text-green-400' : node.status === 'dead' ? 'text-red-600 dark:text-red-400' : node.status === 'checking' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'">
                  {{ node.status === 'alive' ? '在线' : node.status === 'dead' ? '离线' : node.status === 'checking' ? '检测' : '未知' }}
                </span>
              </div>
            </div>

            <!-- IP Address Box -->
            <div class="mb-4">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">优选 IP 地址:</h4>
              <div class="relative group">
                <div class="flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm rounded-lg px-3 py-2.5 transition-all duration-200 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-600">
                  <div class="flex-1 min-w-0 mr-3">
                    <div class="text-sm font-mono text-gray-800 dark:text-gray-200 font-mixed whitespace-nowrap overflow-hidden" style="mask-image:linear-gradient(to right, black 85%, transparent 100%);-webkit-mask-image:linear-gradient(to right, black 85%, transparent 100%);">{{ node.ip }}<span class="text-gray-400 dark:text-gray-500">:{{ node.port }}</span></div>
                  </div>
                  <div class="flex items-center space-x-2 flex-shrink-0">
                    <button
                      class="flex items-center px-2 py-2 text-xs font-medium rounded text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/80 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      @click.stop="copyIp(node.full)"
                    >
                      <svg class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                      </svg>
                      复制
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tags -->
            <div class="flex flex-wrap gap-2">
              <span v-if="node.asn" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{{ node.asn }}</span>
              <span v-if="node.asOrg" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 max-w-[200px] truncate" :title="node.asOrg">{{ node.asOrg }}</span>
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">{{ node.speed.toFixed(0) }} Mbps</span>
              <span v-if="node.status === 'alive' && node.latency > 0" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">{{ node.latency }} ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="bg-gray-50 dark:bg-gray-800 text-gray-950 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700 py-3 md:py-4 bg-opacity-90 backdrop-blur-sm" style="position:fixed;bottom:0;left:0;right:0;z-index:10">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col items-center justify-between gap-4 md:flex-row">
          <span class="text-sm md:text-base">Copyright &copy; 2026 小钱优选服务</span>
          <nav>
            <span class="flex items-center gap-2 leading-tight">
              Powered By
              <a href="https://nuxt.com" class="text-blue-600 dark:text-blue-400">
                <svg width="80" height="20" viewBox="0 0 800 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M377 200C379.16 200 381 198.209 381 196V103C381 103 386 112 395 127L434 194C435.785 197.74 439.744 200 443 200H470V50H443C441.202 50 439 51.4941 439 54V148L421 116L385 55C383.248 51.8912 379.479 50 376 50H350V200H377Z" fill="currentColor"/>
                  <path d="M726 92H739C742.314 92 745 89.3137 745 86V60H773V92H800V116H773V159C773 169.5 778.057 174 787 174H800V200H783C759.948 200 745 185.071 745 160V116H726V92Z" fill="currentColor"/>
                  <path d="M591 92V154C591 168.004 585.742 179.809 578 188C570.258 196.191 559.566 200 545 200C530.434 200 518.742 196.191 511 188C503.389 179.809 498 168.004 498 154V92H514C517.412 92 520.769 92.622 523 95C525.231 97.2459 526 98.5652 526 102V154C526 162.059 526.457 167.037 530 171C533.543 174.831 537.914 176 545 176C552.217 176 555.457 174.831 559 171C562.543 167.037 563 162.059 563 154V102C563 98.5652 563.769 96.378 566 94C567.96 91.9107 570.028 91.9599 573 92C573.411 92.0055 574.586 92 575 92H591Z" fill="currentColor"/>
                  <path d="M676 144L710 92H684C680.723 92 677.812 93.1758 676 96L660 120L645 97C643.188 94.1758 639.277 92 636 92H611L645 143L608 200H634C637.25 200 640.182 196.787 642 194L660 167L679 195C680.818 197.787 683.75 200 687 200H713L676 144Z" fill="currentColor"/>
                  <path d="M168 200H279C282.542 200 285.932 198.756 289 197C292.068 195.244 295.23 193.041 297 190C298.77 186.959 300.002 183.51 300 179.999C299.998 176.488 298.773 173.04 297 170.001L222 41C220.23 37.96 218.067 35.7552 215 34C211.933 32.2448 207.542 31 204 31C200.458 31 197.067 32.2448 194 34C190.933 35.7552 188.77 37.96 187 41L168 74L130 9.99764C128.228 6.95784 126.068 3.75491 123 2C119.932 0.245087 116.542 0 113 0C109.458 0 106.068 0.245087 103 2C99.9323 3.75491 96.7717 6.95784 95 9.99764L2 170.001C0.226979 173.04 0.00154312 176.488 1.90993e-06 179.999C-0.0015393 183.51 0.229648 186.959 2 190C3.77035 193.04 6.93245 195.244 10 197C13.0675 198.756 16.4578 200 20 200H90C117.737 200 137.925 187.558 152 164L186 105L204 74L259 168H186L168 200ZM89 168H40L113 42L150 105L125.491 147.725C116.144 163.01 105.488 168 89 168Z" fill="#00DC82"/>
                </svg>
              </a>
            </span>
          </nav>
        </div>
      </div>
    </footer>

    <!-- Toast -->
    <Teleport to="body">
      <div v-if="toast" class="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div class="px-4 py-2 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-lg shadow-lg text-green-700 dark:text-green-400 text-sm font-medium">
          {{ toast }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
body {
  font-family: "Cascadia Code", "xiaolai", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", monospace, sans-serif !important;
}
.font-chinese {
  font-family: "xiaolai", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif !important;
}
.font-english {
  font-family: "Cascadia Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace !important;
}
.font-mixed {
  font-family: "Cascadia Code", "xiaolai", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", monospace, sans-serif !important;
}
</style>

