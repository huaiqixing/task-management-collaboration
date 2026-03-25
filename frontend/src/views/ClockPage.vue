<template>
  <div class="clock-page">
    <div class="time">{{ time }}</div>
    <div class="date">{{ date }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const time = ref('')
const date = ref('')
let timer = null

function update() {
  const now = new Date()
  time.value = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  date.value = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
}

onMounted(() => {
  update()
  timer = setInterval(update, 1000)
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.clock-page {
  min-height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  user-select: none;
}
.time {
  font-size: clamp(80px, 15vw, 180px);
  font-weight: 200;
  letter-spacing: -4px;
  line-height: 1;
  font-family: 'Helvetica Neue', 'Inter', sans-serif;
}
.date {
  font-size: clamp(14px, 2vw, 22px);
  font-weight: 300;
  color: rgba(255,255,255,0.45);
  margin-top: 24px;
  letter-spacing: 2px;
}
</style>
