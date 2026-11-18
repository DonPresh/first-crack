/** Ask the horizontal main site to scroll to a panel by id. */
export const goto = (id: string) => window.dispatchEvent(new CustomEvent('fc-goto', { detail: id }))
