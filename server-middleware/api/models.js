// API model stubs for sample data
'use strict'

/**
 * private verified person identity tied to a collection of sessions (aka members)
 * includes admins, system, robots, persons, etc.
 */
let users = [
  { id: 'u1', name: 'u1-name', salt: 'u1-salt', hash: 'u1-hash' }, // see https://www.npmjs.com/package/pbkdf2-password
  {
    id: 'u2',
    name: 'u2-name', // TODO: if this user name is public we'll need a profanity filter
    session: 's2', // most recently associated session or falsey if purposely logged out (primarily catches multiple session login)
    channels: [
      { device: 'phone-abc', events: [{ type: 'messages', tags: ['alerts'] }] },
      { email: 'u2@mail.com', verified: 123456 }
    ]
  }
]
exports.users = users

/**
 * linked to browser cookie (aka trackers)
 *
 * tracks activity metrics, emotional feedback, etc.
 * can be associated with mutiple users, e.g. public terminal.
 */
let sessions = [
  { id: 's1', sk: 's1-sk', name: 's1-name', evidence: [{ ts: 123456, ek: 's1-ek1', ipAddress: '1.2.3.4' }] },
  {
    id: 's2', // the public key for read access to the session
    sk: 's2-sk', // controls update access and must only be shared with the session owner
    name: 's2-name', // the public display name of the session
    tags: ['robot', 'system'],
    settings: {
      cookies: true // user has accepted the cookie policy
    },
    user: 'u1', // most recently associated user or falsey if purposely logged out (primarily caches whats already in evidence)
    evidence: [{ ts: 123456, ek: 's2-ek2', user: 'u2' }, { ts: 133456, ek: 's2-ek3', user: 'u1' }], // private time ordered list of unique user agent properties
    activity: [{ ts: 123456, action: 'rate', value: 5 }] // private time ordered list of metrics about this session, usually user actions
  },
  { id: 's3', sk: 's3-sk', name: 's3-name' }
]
exports.sessions = sessions

/**
 * private messages between sessions (or assoc user)
 * - help and alerts to and from community admin to session (or associated user)
 * - session (or assoc user) to session (or assoc user) private data reveal for IRL meetup
 * individual read/reply, but group send targeting for system alerts/tos changes/etc.
 */
let messages = [
  { id: 'm1', name: 'm1-name', fromSession: 's2', toSession: 's1' },
  { id: 'm2', name: 'm2-name', fromSession: 's2', toSessions: 'all' }
]
exports.messages = messages

/**
 * unverified person identity tied to a collection of sessions
 * - sessions can be in multiple auras with differing probabilities
 * - created by evidence algorithms
 * -- known user login (100% probability, only reduced by fraud)
 * -- known user claims sessions retroactively (typically not 100%)
 * -- evidence matching like IP or geo or biometrics
 */
let auras = [
  { id: 'a1', name: 'a1-name', sessions: ['s1', 's2'] },
  { id: 'a2', name: 'a2-name', sessions: ['s2'] }
]
exports.auras = auras

/**
 * public profile participating in discussion: singles, match-makers, etc.
 * - created by a session
 * - edited by any session
 * - can be locked to a specific user aura
 * types:
 * - profile: single, match-maker, pet, etc.
 * - topic of discussion: building, park, etc. something that can't 'talk'
 */
let profiles = [
  {

    id: 'p1',
    title: 'p1-title',
    author: 's1',
    type: 'SINGLE',
    text: 'descriptive text', // markdown
    photos: ['http://images.fonearena.com/blog/wp-content/uploads/2013/11/Lenovo-p780-camera-sample-10.jpg']
  },
  { id: 'p1.1', title: 'p1-title', author: 's2', edits: 'p1' },
  { id: 'p2', title: 'p2-title', author: 's2', type: 'SINGLE' },
  { id: 'p3', title: 'p3-title', author: 's2', type: 'MATCHER' },
  { id: 'p4', title: 'p4-title', author: 's2', type: 'MODERATOR' }
]
exports.profiles = profiles

/**
 * types of public messages:
 * session about/to public profile: discuss and rate profile
 *                                  discuss and rate match-maker
 * session about pair of public profiles, discuss and rate a match
 * session as public profile about pair of public profiles, discuss and rate a match
 * session as public profile to another profile: as a match-maker
 *                                               as a match
 */
let comments = [
  { id: 'c1', title: 'c1-title', author: 's1', about: ['p1.1'] },
  {
    id: 'c2',
    title: 'c2-title',
    author: 's2',
    about: ['p1', 'p2'],
    as: 'p3',
    text: 'descriptive text' // markdown
  },
  { id: 'c3', title: 'c3-title', author: 's1', about: ['p2'], as: 'p1' }
]
exports.comments = comments
