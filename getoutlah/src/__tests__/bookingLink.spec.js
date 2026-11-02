// The "Get tickets" button on the activity page: where it goes and what it says.
import { describe, it, expect } from 'vitest'
import { bookingLink } from '@/utils/activityStyle'

const EB = 'https://www.eventbrite.sg/e/waterfront-escapades-wind-band-marathon-tickets-2001113878479'

describe('bookingLink', () => {
  it('sends Eventbrite events to their Eventbrite page', () => {
    expect(bookingLink({ source: 'eventbrite', cost: null, url: EB })).toEqual({ href: EB, label: 'Get tickets on Eventbrite' })
    expect(bookingLink({ source: 'eventbrite', cost: 0, url: EB }).label).toBe('Register on Eventbrite')
  })

  it('uses the website of curated activities', () => {
    expect(bookingLink({ source: 'curated', url: 'https://www.nparks.gov.sg/' })).toEqual({
      href: 'https://www.nparks.gov.sg/', label: 'Book or find out more',
    })
  })

  it('has no button without a proper web link', () => {
    for (const url of [null, undefined, '', 'not a link', 'javascript:alert(1)', 'mailto:a@b.sg']) {
      expect(bookingLink({ source: 'curated', url })).toBeNull()
    }
    expect(bookingLink(null)).toBeNull()
  })
})
