
export const REPORT_GROUPS = [
  { id: 'activity', label: 'About the activity' },
  { id: 'host', label: 'About the host' },
  { id: 'other', label: 'Something else' },
]

export const REPORT_REASONS = [
  { id: 'dangerous', group: 'activity', label: 'Dangerous or unsafe activity' },
  {
    id: 'illegal',
    group: 'activity',
    label: 'Illegal in Singapore',
    hint: 'e.g. drugs, vaping, unlicensed gambling, a protest or assembly without a police permit',
  },
  { id: 'underage_alcohol', group: 'activity', label: 'Alcohol with people under 18' },
  { id: 'adult', group: 'activity', label: 'Sexual or adult content' },
  { id: 'scam', group: 'activity', label: 'Scam, or asks for payment outside the app' },
  { id: 'spam', group: 'activity', label: 'Fake or spam activity' },
  { id: 'misleading', group: 'activity', label: 'Misleading time, place or price' },

  { id: 'suspicious_user', group: 'host', label: 'Suspicious or fake account' },
  { id: 'harassment', group: 'host', label: 'Harassment, hate or discrimination', hint: 'including race or religion' },
  {
    id: 'malicious',
    group: 'host',
    label: 'Using activities for malicious purposes',
    hint: 'e.g. to target, stalk or collect personal details',
  },
  { id: 'impersonation', group: 'host', label: 'Pretending to be someone else' },

  { id: 'other', group: 'other', label: 'Something else', needsDetails: true },
]
