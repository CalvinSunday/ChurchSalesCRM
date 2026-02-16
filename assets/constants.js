export const OWNERS = ["Adrian", "Carmen"];

export const STAGES = [
  "Lead",
  "Contacted",
  "Responded",
  "Discovery Scheduled",
  "Proposal Sent",
  "Verbal Yes",
  "Closed Won",
  "Closed Lost"
];

export const ACTIVITY_TYPES = [
  "Email Sent",
  "Call Attempted",
  "Call Connected",
  "Voicemail Left",
  "Text/SMS",
  "Meeting Scheduled",
  "Meeting Held",
  "Proposal Sent",
  "Deposit Link Sent",
  "Deposit Paid",
  "Closed Lost"
];

export const REMINDER_RULES = {
  "Email Sent": { days: 7 },
  "Call Attempted": { days: 5 },
  "Call Connected": { days: 5 },
  "Voicemail Left": { days: 5 },
  "Text/SMS": { days: 5 },
  "Meeting Scheduled": { days: 0 },
  "Meeting Held": { days: 0 },
  "Proposal Sent": { days: 5 },
  "Deposit Link Sent": { days: 3 },
  "Deposit Paid": { days: 0 }
};

export const CSV_HEADER = [
  "church_name",
  "website",
  "has_livestream",
  "livestream_url",
  "city",
  "state",
  "contact_name",
  "contact_role",
  "phone",
  "email",
  "owner",
  "stage",
  "next_followup_date",
  "notes",
  "tier_interest",
  "estimated_gear_budget"
];

export const KPI_DEFAULT_TARGETS = {
  Adrian: { calls: 150, emails: 90, messages: 50 },
  Carmen: { calls: 150, emails: 90, messages: 50 }
};

export const KPI_ACTIVITY_TO_METRIC = {
  "Call Attempted": "calls",
  "Call Connected": "calls",
  "Voicemail Left": "calls",
  "Email Sent": "emails",
  "Text/SMS": "messages"
};
