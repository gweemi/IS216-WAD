<!--
  One OPENJIO in the list. Shows the details and the right button for this user:
    not in it + spots left → Join      not in it + full → Chope next spot
    going → Leave                       queued → Leave queue
    host → Cancel jio
  The card doesn't talk to Firebase itself. It emits `action` with the
  button's name and OpenJioView.vue does the work.
-->
<template>
  <article
    class="jio-card"
    :class="{ 'is-greyed': greyed, 'is-cancelled': status === 'cancelled' }"
    data-testid="jio-card"
  >
    <div class="jio-art" :style="{ background: colour }">
      <span class="jio-emoji" aria-hidden="true">{{ emoji }}</span>
      <span class="jio-status" :class="'jio-status--' + status" data-testid="jio-status">
        {{ statusLabel(jio) }}
      </span>
      <span v-if="jio.visibility === 'friends'" class="jio-visibility">
        <i class="bi bi-people-fill"></i> Friends only
      </span>
    </div>

    <div class="p-3">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div class="min-w-0">
          <h3 class="jio-title">{{ jio.title }}</h3>
          <p class="jio-meta mb-0">{{ whenText(jio) }} · {{ jio.location }}</p>
        </div>
        <span class="jio-price">{{ priceText(jio) }}</span>
      </div>

      <p v-if="jio.description" class="jio-desc mt-2 mb-0">{{ jio.description }}</p>

      <div class="d-flex flex-wrap align-items-center gap-2 mt-3">
        <span v-if="role === 'host'" class="gol-pill tag-host">You're hosting</span>
        <span v-else-if="role === 'going'" class="gol-pill gol-pill--good">
          <i class="bi bi-check-lg"></i> You're going
        </span>
        <span v-else-if="role === 'queued'" class="gol-pill tag-queued" data-testid="queue-position">
          Choped · #{{ queuePosition(jio, uid) }} in line
        </span>
        <span v-else class="jio-host">Hosted by {{ jio.hostName }}</span>
        <span class="jio-going ms-auto">
          <i class="bi bi-people"></i> {{ jio.participants.length }}/{{ jio.capacity }} going
        </span>
      </div>

      <p v-if="role === 'queued'" class="queue-note mt-2 mb-0">
        If someone drops out, the spot goes to you automatically.
      </p>

      <div v-if="button" class="mt-3">
        <button
          type="button"
          :class="button.style"
          :disabled="busy"
          data-testid="jio-action"
          @click="$emit('action', button.action)"
        >
          {{ busy ? 'One sec…' : button.label }}
        </button>
      </div>
    </div>
  </article>
</template>

<script>
import { INTERESTS } from '@/config/preferences'
import {
  statusOf,
  statusLabel,
  myRole,
  queuePosition,
  priceText,
  whenText,
} from '@/utils/openjio'

// One colour per category, from the Figma palette
const COLOURS = {
  outdoors: 'var(--gol-lime)',
  sports: 'var(--gol-coral)',
  arts: 'var(--gol-cyan)',
  food: 'var(--gol-yellow)',
  workshops: 'var(--gol-purple)',
  music: 'var(--gol-cyan)',
  games: 'var(--gol-yellow)',
  wellness: 'var(--gol-lime)',
  volunteering: 'var(--gol-coral)',
}

export default {
  name: 'JioCard',
  props: {
    jio: { type: Object, required: true },
    uid: { type: String, required: true },
    busy: { type: Boolean, default: false },
  },
  emits: ['action'],
  computed: {
    status() {
      return statusOf(this.jio)
    },
    role() {
      return myRole(this.jio, this.uid)
    },
    greyed() {
      return this.status === 'full' && this.role === 'none'
    },
    colour() {
      return COLOURS[this.jio.category] ?? 'var(--gol-purple-soft)'
    },
    emoji() {
      return INTERESTS.find((i) => i.id === this.jio.category)?.emoji ?? '✨'
    },
    // Which button to show, if any
    button() {
      if (this.status === 'cancelled' || this.status === 'ended') return null
      if (this.role === 'host') return { action: 'cancel', label: 'Cancel jio', style: 'gol-btn-soft w-100' }
      if (this.role === 'going') return { action: 'leave', label: 'Leave', style: 'gol-btn-soft w-100' }
      if (this.role === 'queued') return { action: 'leaveQueue', label: 'Leave queue', style: 'gol-btn-soft w-100' }
      if (this.status === 'full') return { action: 'chope', label: 'Chope next spot', style: 'gol-btn-coral w-100' }
      return { action: 'join', label: 'Join', style: 'gol-btn-primary' }
    },
  },
  methods: { statusLabel, queuePosition, priceText, whenText },
}
</script>

<style scoped>
.jio-card {
  background: var(--gol-card);
  border-radius: var(--gol-radius);
  box-shadow: 0 6px 0 var(--gol-card-edge);
  overflow: hidden;
  height: 100%;
}
.jio-card.is-greyed { background: #ece8f0; }
.jio-card.is-greyed .jio-art { filter: grayscale(0.8); opacity: 0.8; }
.jio-card.is-cancelled { opacity: 0.6; }
.jio-card.is-cancelled .jio-title { text-decoration: line-through; }

.jio-art {
  position: relative;
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.jio-emoji {
  font-size: 2.4rem;
  background: #fff;
  border: 3px solid var(--gol-ink);
  box-shadow: 4px 4px 0 var(--gol-ink);
  border-radius: 16px;
  padding: 0.1rem 0.8rem;
  transform: rotate(-7deg);
}
.jio-status,
.jio-visibility {
  position: absolute;
  top: 0.6rem;
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  font-size: 0.72rem;
  font-weight: 900;
}
.jio-status { left: 0.6rem; }
.jio-visibility { right: 0.6rem; background: #fff; color: var(--gol-purple); }
.jio-status--open { background: var(--gol-lime); color: var(--gol-ink); }
.jio-status--full { background: #5d4d72; color: #fff; }
.jio-status--ended { background: var(--gol-locked); color: var(--gol-ink); }
.jio-status--cancelled { background: var(--gol-coral); color: #fff; }

.min-w-0 { min-width: 0; }
.jio-title { font-weight: 900; font-size: 1.15rem; margin: 0; }
.jio-meta,
.jio-host,
.jio-going { color: var(--gol-muted); font-weight: 700; font-size: 0.85rem; }
.jio-desc { color: #685b76; font-weight: 600; font-size: 0.9rem; }
.jio-price {
  background: #fff0c2;
  color: #6a5010;
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  font-weight: 900;
  white-space: nowrap;
}
.tag-host { background: var(--gol-purple-soft); color: var(--gol-purple); }
.tag-queued { background: #ffe1de; color: #b4382f; }
.queue-note { color: #b4382f; font-weight: 700; font-size: 0.8rem; }
</style>
