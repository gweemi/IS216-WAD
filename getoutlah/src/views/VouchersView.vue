<!-- ✨ NEW PAGE: Redeem Voucher (opened from the Badges page) -->
<script setup>
import { computed, ref } from 'vue'
import { VOUCHERS, availablePoints, redeemVoucher, myVouchers } from '../stores/gamification(badges).js'

const points = computed(() => availablePoints())
const available = computed(() => VOUCHERS.filter((v) => v.cost <= points.value))
const more = computed(() => VOUCHERS.filter((v) => v.cost > points.value))
const redeemed = computed(() => myVouchers())

const confirming = ref(null) // voucher waiting for "Yes, redeem"
const justRedeemed = ref(null) // shows the voucher code after redeeming
const error = ref('')

function askToRedeem(voucher) {
  error.value = ''
  confirming.value = voucher
}
function confirmRedeem() {
  const res = redeemVoucher(confirming.value.id)
  if (!res.ok) { error.value = res.message; return }
  confirming.value = null
  justRedeemed.value = res.redemption
}
</script>

<template>
  <main class="gol-page vouchers">
    <div class="container py-4 inner">
      <RouterLink :to="{ name: 'badges' }" class="back"><span aria-hidden="true">←</span> Badges</RouterLink>

      <h1 class="title"><span class="gift">🎁</span> Redeem Voucher <span class="spark" aria-hidden="true"></span></h1>
      <p class="sub">Use your points to redeem rewards from our partners!</p>

      <!-- Your points -->
      <section class="points-card">
        <span class="bolt">⚡</span>
        <div>
          <p class="points-label">Your points</p>
          <p class="points-num">{{ points }} <span>pts</span></p>
        </div>
        <span class="trophy" aria-hidden="true">🏆</span>
        <span class="stars" aria-hidden="true">✨</span>
      </section>

      <!-- Vouchers already redeemed: shown first so the codes are easy to find -->
      <template v-if="redeemed.length">
        <h2 class="section-title">My Vouchers</h2>
        <div class="d-grid gap-2 mb-5" data-testid="my-vouchers">
          <div v-for="r in redeemed" :key="r.code" class="mine">
            <span class="emo">{{ r.icon }}</span>
            <div class="flex-grow-1"><strong>{{ r.name }}</strong><small>Redeemed {{ r.date }}</small></div>
            <code>{{ r.code }}</code>
          </div>
        </div>
      </template>

      <!-- Vouchers you can afford -->
      <h2 class="section-title">Available Vouchers</h2>
      <p v-if="!available.length" class="empty">Redeemable vouchers will show here!</p>
      <div class="row g-3 g-md-4">
        <div v-for="(v, i) in available" :key="v.id" class="col-6 col-md-4">
          <article class="voucher" :style="{ '--i': i }">
            <span class="coin"><span class="emo">{{ v.icon }}</span><span class="rays" aria-hidden="true"></span></span>
            <h3 class="v-name">{{ v.name }}</h3>
            <span class="cost">{{ v.cost }} pts</span>
            <button type="button" class="btn-redeem" @click="askToRedeem(v)">Redeem</button>
          </article>
        </div>
      </div>

      <!-- Vouchers that need more points -->
      <template v-if="more.length">
        <h2 class="section-title mt-5">More Vouchers</h2>
        <div class="row g-3 g-md-4">
          <div v-for="v in more" :key="v.id" class="col-6 col-md-4">
            <article class="voucher locked">
              <span class="coin"><span class="emo">{{ v.icon }}</span></span>
              <h3 class="v-name">{{ v.name }}</h3>
              <span class="cost">{{ v.cost }} pts</span>
              <button type="button" class="btn-redeem" disabled>Not enough points</button>
              <span class="need">{{ v.cost - points }} more pts</span>
            </article>
          </div>
        </div>
      </template>

    </div>

    <!-- Confirm pop-up -->
    <Transition name="pop">
      <div v-if="confirming" class="overlay" @click.self="confirming = null">
        <div class="dialog" role="dialog" aria-label="Redeem voucher">
          <span class="coin small"><span class="emo">{{ confirming.icon }}</span></span>
          <h3>Redeem {{ confirming.name }}?</h3>
          <p>This uses <strong>{{ confirming.cost }} pts</strong>. You'll have {{ points - confirming.cost }} pts left. Your level and badges stay the same.</p>
          <p v-if="error" class="err">{{ error }}</p>
          <div class="d-flex gap-2 justify-content-center">
            <button type="button" class="btn-soft" @click="confirming = null">Cancel</button>
            <button type="button" class="btn-redeem" @click="confirmRedeem">Yes, redeem</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Success pop-up with the code -->
    <Transition name="pop">
      <div v-if="justRedeemed" class="overlay" @click.self="justRedeemed = null">
        <div class="dialog" role="dialog" aria-label="Voucher redeemed">
          <span class="coin small"><span class="emo">{{ justRedeemed.icon }}</span></span>
          <h3>Enjoy your {{ justRedeemed.name }}! 🎉</h3>
          <p>Show this code to the partner:</p>
          <code class="big-code">{{ justRedeemed.code }}</code>
          <p class="small-note">You can find it again under My Vouchers.</p>
          <button type="button" class="btn-redeem" @click="justRedeemed = null">Done</button>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.vouchers { min-height: 100vh; color: var(--gol-ink); font-family: var(--gol-font); padding-bottom: 7rem; } 
.inner { max-width: 960px; }
.back { display: flex; width: fit-content; gap: .5rem; align-items: center; font-weight: 800; color: var(--gol-ink); text-decoration: none; margin-bottom: 1.2rem; }
.back:hover { color: var(--gol-purple); }
.title { position: relative; display: inline-flex; align-items: center; gap: .6rem; font-weight: 900; font-size: clamp(1.8rem, 5vw, 2.6rem); margin: 0; }
.gift { font-size: .95em; }
.spark { position: absolute; right: -26px; top: -10px; width: 22px; height: 22px; background: radial-gradient(circle, var(--gol-yellow) 0 2px, transparent 3px); }
.spark::before, .spark::after { content: ''; position: absolute; left: 50%; width: 3px; height: 12px; background: var(--gol-yellow); border-radius: 3px; transform-origin: bottom; }
.spark::before { transform: rotate(-25deg); } .spark::after { transform: rotate(35deg); }
.sub { color: var(--gol-muted); font-weight: 600; margin: .4rem 0 1.4rem; }

.points-card { position: relative; overflow: hidden; display: flex; align-items: center; gap: 1.2rem; padding: 1.4rem 1.6rem; border-radius: 26px; color: #fff; background: linear-gradient(135deg, var(--gol-purple), var(--gol-purple-dark)); box-shadow: 0 6px 0 #2f1785; margin-bottom: 2rem; }
.bolt { width: 64px; height: 64px; flex-shrink: 0; display: grid; place-items: center; border-radius: 18px; background: var(--gol-lime); color: var(--gol-ink); font-size: 1.8rem; border: 2.5px solid var(--gol-ink); box-shadow: 3px 3px 0 var(--gol-ink); }
.points-label { margin: 0; font-weight: 700; opacity: .9; }
.points-num { margin: 0; font-weight: 900; font-size: 2.4rem; line-height: 1; }
.points-num span { font-size: 1rem; font-weight: 800; opacity: .85; }
.trophy { position: absolute; right: 30px; bottom: -22px; font-size: 6.5rem; opacity: .22; filter: grayscale(1) brightness(2.2); }
.stars { position: absolute; right: 18px; top: 10px; font-size: 1.4rem; color: #fff; opacity: .7; animation: twinkle 2.4s ease-in-out infinite; }

.section-title { font-weight: 900; font-size: 1.3rem; margin-bottom: 1rem; }
.empty { color: var(--gol-muted); font-weight: 700; }

.voucher { display: flex; flex-direction: column; align-items: center; text-align: center; gap: .5rem; animation: rise .5s cubic-bezier(.34, 1.56, .64, 1) both; animation-delay: calc(var(--i, 0) * 90ms); }
.coin { position: relative; width: 116px; height: 116px; display: grid; place-items: center; border-radius: 50%; background: var(--gol-purple); border: 7px solid var(--gol-yellow); box-shadow: 0 0 0 3px #f2c14e, 0 8px 18px rgba(107, 66, 227, .25); color: #fff; font-size: 2.8rem; transition: transform .2s; }
.voucher:not(.locked):hover .coin { transform: translateY(-4px) rotate(-4deg); }
.rays { position: absolute; right: -18px; top: -14px; width: 28px; height: 28px; }
.rays::before, .rays::after { content: ''; position: absolute; width: 4px; height: 13px; background: var(--gol-yellow); border-radius: 4px; }
.rays::before { left: 4px; top: 6px; transform: rotate(-30deg); } .rays::after { left: 16px; top: 12px; transform: rotate(40deg); }
.v-name { font-weight: 900; font-size: 1rem; margin: .4rem 0 0; }
.cost { background: var(--gol-purple-soft); color: var(--gol-purple); font-weight: 800; font-size: .8rem; border-radius: 999px; padding: .15rem .8rem; }
.btn-redeem { min-width: 120px; margin-top: .3rem; font-family: var(--gol-font); font-weight: 900; color: var(--gol-ink); background: var(--gol-yellow); border: 2px solid var(--gol-ink); border-radius: 999px; padding: .5rem 1.2rem; box-shadow: 0 3px 0 var(--gol-ink); transition: translate .1s, box-shadow .1s; }
.btn-redeem:hover:not(:disabled) { translate: 0 -2px; box-shadow: 0 5px 0 var(--gol-ink); }
.btn-redeem:active:not(:disabled) { translate: 0 2px; box-shadow: 0 1px 0 var(--gol-ink); }
.emo { line-height: 1; }
.locked .coin .emo { filter: grayscale(1); opacity: .55; }
.locked .coin { background: #e9e5f1; border-color: #f3f0f8; box-shadow: 0 0 0 3px #e3def0; color: #8f879f; }
.locked .btn-redeem { background: #ebe8f0; color: #8a8199; border-color: #d9d4e3; box-shadow: none; font-weight: 800; font-size: .85rem; cursor: not-allowed; }
.need { font-size: .75rem; font-weight: 700; color: var(--gol-muted); }

.mine { display: flex; align-items: center; gap: .9rem; background: #fff; border-radius: 18px; padding: .8rem 1rem; box-shadow: 0 4px 0 var(--gol-card-edge); }
.mine > .emo { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; background: var(--gol-purple); font-size: 1.3rem; }
.mine small { display: block; color: var(--gol-muted); font-weight: 700; }
.mine code { background: var(--gol-purple-soft); color: var(--gol-purple); font-weight: 800; padding: .3rem .6rem; border-radius: 10px; }

.overlay { position: fixed; inset: 0; z-index: 2000; display: grid; place-items: center; padding: 1rem; background: rgba(34, 26, 59, .45); }
.dialog { width: min(100%, 380px); background: var(--gol-bg); border-radius: 26px; padding: 1.8rem 1.5rem; text-align: center; box-shadow: 0 20px 60px rgba(34, 26, 59, .3); }
.dialog h3 { font-weight: 900; font-size: 1.25rem; margin: .8rem 0 .5rem; }
.dialog p { color: var(--gol-muted); font-weight: 600; }
.coin.small { width: 76px; height: 76px; font-size: 1.9rem; border-width: 5px; margin: 0 auto; }
.btn-soft { font-family: var(--gol-font); font-weight: 900; background: #fff; color: var(--gol-ink); border: 2px solid var(--gol-ink); border-radius: 999px; padding: .5rem 1.2rem; margin-top: .3rem; }
.err { color: var(--gol-coral) !important; font-weight: 800 !important; }
.big-code { display: block; font-size: 1.6rem; font-weight: 900; letter-spacing: .12em; color: var(--gol-purple); background: #fff; border: 2px dashed var(--gol-purple); border-radius: 16px; padding: .7rem; margin: .3rem 0 .8rem; }
.small-note { font-size: .8rem; }

.pop-enter-active, .pop-leave-active { transition: opacity .2s; }
.pop-enter-active .dialog { animation: rise .4s cubic-bezier(.34, 1.56, .64, 1); }
.pop-enter-from, .pop-leave-to { opacity: 0; }
@keyframes rise { from { opacity: 0; transform: translateY(24px) scale(.92); } to { opacity: 1; transform: none; } }
@keyframes twinkle { 0%, 100% { opacity: .35; transform: scale(.9); } 50% { opacity: .9; transform: scale(1.1); } }
@media (prefers-reduced-motion: reduce) { .voucher, .pop-enter-active .dialog { animation-duration: .01s; } .stars { animation: none; } }
</style>
