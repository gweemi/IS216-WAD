<!--
  One OPENJIO: details, who's going, and the right button for this user
  (JioActionButton does join / chope / leave / cancel).
    <JioCard :jio="jio" :uid="uid" />
  With `link-to-details`, clicking anywhere on the card (except its buttons)
  opens the activity detail page, like ActivityCard. Join / chope / leave / cancel
  and Edit are then left to the detail page, so the card doesn't show them.
-->
<template>
  <article
    class="jio-card"
    :class="{ 'is-greyed': greyed, 'is-cancelled': status === 'cancelled', 'is-clickable': linkToDetails }"
    data-testid="jio-card"
    @click="openDetails"
  >
    <div class="jio-art" :style="{ background: categoryColor(jio.category) }">
      <span class="jio-emoji" aria-hidden="true">{{ categoryEmoji(jio.category) }}</span>
      <span class="jio-status" :class="'jio-status--' + status" data-testid="jio-status">
        {{ statusLabel(jio) }}
      </span>
      <span
        class="jio-visibility"
        :class="'jio-visibility--' + jio.visibility"
        data-testid="jio-visibility"
      >
        <i class="ph" :class="jio.visibility === 'public' ? 'ph-globe-hemisphere-west' : 'ph-lock'"></i>
        {{ visibilityLabel }}
      </span>
    </div>

    <div class="p-3">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div class="min-w-0">
          <h3 class="jio-title">
            <RouterLink v-if="linkToDetails" :to="detailsRoute" class="jio-title-link" data-testid="jio-details-link">{{ jio.title }}</RouterLink>
            <template v-else>{{ jio.title }}</template>
          </h3>
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
        <span v-else-if="invited" class="gol-pill tag-invited" data-testid="jio-invited">
          <i class="bi bi-envelope-heart"></i> {{ jio.hostName }} invited you
        </span>
        <span v-else class="jio-host">Hosted by {{ jio.hostName }}</span>
        <span class="jio-going ms-auto">
          <i class="bi bi-people"></i> {{ jio.participantCount ?? jio.participants.length }}/{{ jio.capacity }} going
        </span>
      </div>

      <p v-if="role === 'queued'" class="queue-note mt-2 mb-0">
        If someone drops out, the spot goes to you automatically.
      </p>

      <!-- Edit + Cancel only exist while the jio is open or full (canEdit) -->
      <div v-if="canManage && !linkToDetails && canEdit" class="jio-host-actions mt-3">
        <button type="button" class="gol-btn-primary" data-testid="edit-jio" @click="$router.push({ name: 'openjio-edit', params: { id: jio.id } })">
          <i class="bi bi-pencil-square" aria-hidden="true"></i> Edit OPENJIO
        </button>
        <JioActionButton :jio="jio" :uid="uid" />
      </div>
      <div v-else-if="!canManage && (!linkToDetails || canDecline)" class="jio-actions mt-3">
        <JioActionButton v-if="!linkToDetails" :jio="jio" :uid="uid" />
        <button
          v-if="canDecline"
          type="button"
          class="gol-btn-soft"
          :disabled="declining"
          data-testid="decline-jio"
          @click="decline"
        >
          {{ declining ? 'Declining…' : 'Decline' }}
        </button>
      </div>
      <!-- Host and people going can see who else is coming: one full-width row for both -->
      <button v-if="canSeeAttendees" type="button" class="gol-btn-soft jio-attendees w-100" :class="hasActionRow ? 'mt-2' : 'mt-3'"
        data-testid="view-jio-attendees" @click="showAttendees = true">
        <i class="bi bi-people" aria-hidden="true"></i> Who's going
      </button>
      <!-- Change code is necessary: report button (hides itself for the host and for cancelled, ended or suspended jios) -->
      <ReportJioButton :jio="jio" class="mt-2" />
    </div>
    <JioParticipantsSheet :open="showAttendees" :jio="jio" @close="showAttendees = false" />
  </article>
</template>

<script>
import JioActionButton from '@/components/openjio/JioActionButton.vue'
import JioParticipantsSheet from '@/components/openjio/JioParticipantsSheet.vue'
// Change code is necessary: report button
import ReportJioButton from '@/components/reports/ReportJioButton.vue'
import { categoryColor, categoryEmoji } from '@/utils/activityStyle'
import { runJioAction } from '@/services/openjio'
import {
  statusOf,
  statusLabel,
  myRole,
  isInvited,
  queuePosition,
  priceText,
  whenText,
} from '@/utils/openjio'

export default {
  name: 'JioCard',
  // Change code is necessary: added ReportJioButton
  components: { JioActionButton, JioParticipantsSheet, ReportJioButton },
  props: {
    jio: { type: Object, required: true },
    uid: { type: String, required: true },
    linkToDetails: { type: Boolean, default: false },
  },
  computed: {
    detailsRoute() {
      return { name: 'activity', params: { id: `jio-${this.jio.id}` } }
    },
    status() {
      return statusOf(this.jio)
    },
    role() {
      return myRole(this.jio, this.uid)
    },
    invited() {
      return isInvited(this.jio, this.uid)
    },
    visibilityLabel() {
      return { public: 'Public', friends_only: 'Friends only', invite_only: 'Invite only', friends: 'Legacy invite only' }[this.jio.visibility] ?? 'Private'
    },
    greyed() {
      // Change code is necessary: suspended jios are greyed out too
      return (this.status === 'full' && this.role === 'none') || this.status === 'suspended'
    },
    canEdit() {
      return this.role === 'host' && ['open', 'full'].includes(this.status)
    },
    canManage() {
      return this.role === 'host'
    },
    canSeeAttendees() {
      return this.role === 'host' || this.role === 'going'
    },
    // Whether a row of action buttons is shown above "Who's going" (mirrors the v-if / v-else-if above).
    hasActionRow() {
      return this.canManage ? !this.linkToDetails && this.canEdit : (!this.linkToDetails || this.canDecline)
    },
    canDecline() {
      return ['invite_only', 'friends'].includes(this.jio.visibility) && this.invited && this.role === 'none' && this.status !== 'cancelled' && this.status !== 'ended' && this.status !== 'suspended' // Change code is necessary: added suspended
    },
  },
  data() {
    return { showAttendees: false, declining: false }
  },
  methods: {
    statusLabel,
    queuePosition,
    priceText,
    whenText,
    categoryColor,
    categoryEmoji,
    openDetails(event) {
      if (!this.linkToDetails) return
      // Let the card's own buttons and links do their job, and don't navigate while selecting text.
      if (event.target.closest('a, button, input, select, textarea, label')) return
      if (window.getSelection?.().toString()) return
      this.$router.push(this.detailsRoute)
    },
    async decline() {
      this.declining = true
      try {
        await runJioAction('decline', this.jio.id)
      } finally {
        this.declining = false
      }
    },
  },
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
.jio-card.is-clickable { cursor: pointer; }
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
/* On narrow cards the two tags share the width instead of overlapping */
.jio-status, .jio-visibility { max-width: calc(50% - 0.9rem); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jio-visibility { right: 0.6rem; background: #fff; }
.jio-visibility--public { color: #1d5f8a; }
.jio-visibility--friends { color: var(--gol-purple); }
.jio-status--open { background: var(--gol-lime); color: var(--gol-ink); }
.jio-status--full { background: #5d4d72; color: #fff; }
.jio-status--ended { background: var(--gol-locked); color: var(--gol-ink); }
.jio-status--cancelled { background: var(--gol-coral); color: #fff; }
/* Change code is necessary: suspended badge */
.jio-status--suspended { background: #dc4d4d; color: #fff; }

.min-w-0 { min-width: 0; }
.jio-title { font-weight: 900; font-size: 1.15rem; margin: 0; overflow-wrap: anywhere; }
.jio-title-link { color: inherit; text-decoration: none; }
.jio-title-link:hover, .jio-title-link:focus-visible { text-decoration: underline; }
.jio-meta,
.jio-host,
.jio-going { color: var(--gol-muted); font-weight: 700; font-size: 0.85rem; }
.jio-desc { color: #685b76; font-weight: 600; font-size: 0.9rem; }
.jio-price {
  flex-shrink: 0;
  background: #fff0c2;
  color: #6a5010;
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  font-weight: 900;
  white-space: nowrap;
}
.tag-host { background: var(--gol-purple-soft); color: var(--gol-purple); }
.tag-queued { background: #ffe1de; color: #b4382f; }
.tag-invited { background: var(--gol-cyan); color: var(--gol-ink); }
.queue-note { color: #b4382f; font-weight: 700; font-size: 0.8rem; }
.jio-host-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr)); gap: .5rem; }
.jio-host-actions > button, .jio-host-actions :deep(.jio-action-button), .jio-actions :deep(.jio-action-button), .jio-actions > button, .jio-attendees { min-height: 2.35rem; padding: .45rem .7rem !important; font-size: .8rem !important; line-height: 1.1; }
.jio-host-actions > .gol-btn-primary, .jio-actions :deep(.gol-btn-primary) { display: inline-flex; align-items: center; justify-content: center; }
.jio-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; align-items: stretch; }
.jio-actions > :first-child { min-width: 0; }
.jio-actions :deep(.jio-action-button) { width: 100%; }
.jio-actions > button { white-space: nowrap; }
</style>
