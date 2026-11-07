/** A new id: sortable by time, and unlike Confluence's numbers it never collides with an imported thread. The browser picks one for a new post so its pictures can be uploaded before the post exists. */
export const newId = (now = Date.now(), rand = Math.random()) => `n${now.toString(36)}${Math.floor(rand * 36 ** 3).toString(36).padStart(3, '0')}`
