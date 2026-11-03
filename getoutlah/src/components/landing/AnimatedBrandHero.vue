<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { INTERESTS } from '@/config/preferences'
import { burstFrom } from '@/utils/celebrate'

const props = defineProps({ variant: { type: String, default: 'panel', validator: (value) => ['panel', 'full'].includes(value) } })
const LOGO = 'GETOUTLAH!'.split('')
const stickerIds = ['outdoors', 'arts', 'food', 'sports', 'games', 'wellness']
const stickers = computed(() => stickerIds.map((id, index) => ({ ...INTERESTS.find((category) => category.id === id), pos: `s${index + 1}` })))
const ideas = ['hiking 🌿', 'café hopping ☕', 'bouldering 🧗', 'to a gig 🎸', 'with friends 🫶', 'and touch grass 🌱']
const idea = ref(0)
const popped = ref(null)
let timer

onMounted(() => { timer = setInterval(() => { idea.value = (idea.value + 1) % ideas.length }, 2200) })
onBeforeUnmount(() => clearInterval(timer))

function pop(sticker, event) {
  popped.value = sticker.pos
  try { burstFrom(event.currentTarget) } catch { /* decoration only */ }
  setTimeout(() => { popped.value = null }, 600)
}
</script>

<template>
  <section class="hero" :class="`hero--${props.variant}`" aria-label="GETOUTLAH!">
    <span class="blob blob-a" aria-hidden="true"></span><span class="blob blob-b" aria-hidden="true"></span>
    <button v-for="(sticker, index) in stickers" :key="sticker.id" type="button" class="sticker" :class="[sticker.pos, { popped: popped === sticker.pos }]" :style="{ background: sticker.color, '--d': index * .4 + 's' }" :aria-label="sticker.label + ' (tap me)'" @click="pop(sticker, $event)">{{ sticker.emoji }}</button>
    <div class="hero-text"><p class="hero-eyebrow">For uni students in Singapore</p><h1 class="logo" aria-label="GETOUTLAH!"><span v-for="(character, index) in LOGO" :key="index" class="logo-ch" :style="{ '--i': index }" aria-hidden="true">{{ character }}</span></h1><p class="tagline">Exams done. Now go out <span class="idea-slot"><Transition name="idea" mode="out-in"><span :key="idea" class="idea">{{ ideas[idea] }}</span></Transition></span></p></div>
  </section>
</template>

<style scoped>
.hero { position: relative; overflow: hidden; min-height: 300px; display: flex; align-items: center; justify-content: center; padding: 6.5rem 1.25rem; text-align: center; color: #fff; border-radius: 30px; background: linear-gradient(150deg, var(--gol-purple), var(--gol-purple-dark)); box-shadow: 0 6px 0 #2f1785; }.hero::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.14) 1.5px, transparent 1.5px); background-size: 22px 22px; }.hero--full { min-height: clamp(530px, 74vh, 760px); }.blob { position: absolute; border-radius: 46% 54% 60% 40%; }.blob-a { width: 220px; height: 220px; right: -80px; bottom: -90px; background: var(--gol-coral); opacity: .9; animation: spin 18s linear infinite; }.blob-b { width: 120px; height: 120px; left: -50px; top: -40px; background: var(--gol-lime); opacity: .85; animation: spin 24s linear infinite reverse; }.hero-text { position: relative; z-index: 2; }.hero-eyebrow { font-size: .72rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--gol-yellow); margin-bottom: .4rem; }.logo { margin: 0; font-weight: 900; font-size: clamp(2.6rem,9vw,4.6rem); line-height: 1; color: var(--gol-lime); text-shadow: 4px 4px 0 var(--gol-ink); white-space: nowrap; }.hero--full .logo { font-size: clamp(3.2rem, 9vw, 6.4rem); }.logo-ch { display: inline-block; animation: drop-in .6s cubic-bezier(.34,1.56,.64,1) both, bob 3s ease-in-out infinite; animation-delay: calc(var(--i) * 60ms), calc(.8s + var(--i) * 120ms); }.logo-ch:last-child { color: var(--gol-yellow); }.tagline { margin: .9rem 0 0; font-weight: 700; font-size: 1.05rem; }.hero--full .tagline { font-size: clamp(1.05rem, 2.5vw, 1.45rem); }.idea-slot { display: inline-block; min-width: 9.5em; text-align: left; }.idea { display: inline-block; padding: .1rem .65rem; color: var(--gol-purple); background: #fff; border-radius: 999px; font-weight: 900; }.idea-enter-active,.idea-leave-active { transition: opacity .25s,transform .25s cubic-bezier(.34,1.56,.64,1); }.idea-enter-from { opacity: 0; transform: translateY(12px) rotate(4deg); }.idea-leave-to { opacity: 0; transform: translateY(-12px) rotate(-4deg); }
.sticker { position: absolute; z-index: 1; width: 48px; height: 48px; display: inline-flex; align-items: center; justify-content: center; border: 2.5px solid var(--gol-ink); border-radius: 14px; box-shadow: 4px 4px 0 var(--gol-ink); font-size: 1.4rem; cursor: pointer; animation: sticker-in .5s cubic-bezier(.34,1.56,.64,1) both,bounce 2.4s ease-in-out infinite; animation-delay: calc(.5s + var(--d)),calc(1s + var(--d)); }.sticker:hover { scale: 1.12; }.sticker.popped { animation: wiggle .6s ease; }.s1 { top: 5%; left: 5%; --r: -10deg; }.s2 { top: 5%; right: 5%; --r: 8deg; }.s3 { bottom: 5%; left: 5%; --r: 6deg; }.s4 { bottom: 5%; right: 5%; --r: -6deg; }.s5,.s6 { left: 50%; margin-left: -24px; }.s5 { top: 4%; --r: 12deg; }.s6 { bottom: 4%; --r: -12deg; }@media (max-width: 479px) { .sticker { width: 40px; height: 40px; border-radius: 12px; font-size: 1.15rem; border-width: 2px; box-shadow: 3px 3px 0 var(--gol-ink); }.s5,.s6 { margin-left: -20px; } }
@media (min-width: 900px) { .hero--panel { min-height: 560px; }.sticker { width: 70px; height: 70px; border-radius: 18px; font-size: 2rem; }.hero--full .sticker { width: 82px; height: 82px; font-size: 2.3rem; }.s1 { top: 8%; left: 7%; }.s2 { top: 10%; right: 9%; }.s3 { bottom: 12%; left: 10%; }.s4 { bottom: 14%; right: 12%; }.s5,.s6 { margin-left: -35px; }.hero--full .s5,.hero--full .s6 { margin-left: -41px; }.s5 { top: 5%; }.s6 { bottom: 5%; }.hero--panel .logo { font-size: 3.7rem; } }
@keyframes spin { to { transform: rotate(360deg); } }@keyframes drop-in { from { opacity:0; transform:translateY(-60px) rotate(-12deg) scale(.6); } to { opacity:1; transform:none; } }@keyframes bob { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }@keyframes sticker-in { from { opacity:0; transform:scale(0); } to { opacity:1; transform:scale(1) rotate(var(--r)); } }@keyframes bounce { 0%,100% { transform:translateY(0) rotate(var(--r)); } 35% { transform:translateY(-24px) rotate(calc(var(--r) * -1)); } 55% { transform:translateY(0) rotate(var(--r)) scale(1.08,.93); } }@keyframes wiggle { 50% { transform:scale(1.25) rotate(16deg); } }@keyframes float-soft { 0%,100% { transform:translateY(0) rotate(var(--r)); } 50% { transform:translateY(-8px) rotate(var(--r)); } }
@media (prefers-reduced-motion: reduce) { .sticker { animation: sticker-in .6s ease both, float-soft 4s ease-in-out infinite; animation-delay: calc(.4s + var(--d)), calc(1s + var(--d)); }.logo-ch { animation: bob 3.2s ease-in-out infinite; animation-delay: calc(var(--i) * 120ms); }.blob-a { animation-duration: 40s; }.blob-b { animation-duration: 50s; }.idea-enter-from,.idea-leave-to { transform:none; } }
</style>