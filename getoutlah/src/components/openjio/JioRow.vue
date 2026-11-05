<template>
  <section class="jio-row" :data-testid="testId">
    <h3 class="jio-row__title">{{ title }} <span class="jio-row__count">{{ count }}</span></h3>
    <ul class="jio-row__track">
      <slot />
    </ul>
    <p v-if="emptyText" class="jio-row__empty">{{ emptyText }}</p>
  </section>
</template>

<script>
export default {
  name: 'JioRow',
  props: {
    title: { type: String, required: true },
    count: { type: Number, default: 0 },
    emptyText: { type: String, default: '' },
    testId: { type: String, default: '' },
  },
}
</script>

<style scoped>
.jio-row { margin-bottom: 1.6rem; }
.jio-row__title { margin: 0 0 .6rem; font-size: 1.05rem; font-weight: 900; color: var(--gol-ink); }
.jio-row__count { display: inline-grid; place-items: center; min-width: 1.6rem; height: 1.6rem; margin-left: .3rem; padding: 0 .45rem; border-radius: 999px; background: var(--gol-purple-soft); color: var(--gol-purple); font-size: .8rem; vertical-align: middle; }

.jio-row__track {
  display: flex;
  align-items: stretch;
  gap: 1rem;
  margin: 0;
  padding: .25rem .1rem .9rem;
  list-style: none;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-left: .1rem;
  scrollbar-width: thin;
}
.jio-row__track > :slotted(li) { flex: 0 0 min(300px, 82%); display: flex; min-width: 0; scroll-snap-align: start; }
.jio-row__track > :slotted(li) > * { flex: 1; min-width: 0; }
.jio-row__empty { margin: -.3rem 0 0; color: var(--gol-muted); font-weight: 700; font-size: .9rem; }
</style>
