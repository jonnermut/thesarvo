import { createServerFn } from '@tanstack/react-start'
import { getContentSource } from './content'

/** The whole site hierarchy. Small enough to send in one go. */
export const fetchIndex = createServerFn({ method: 'GET' }).handler(() => getContentSource().getIndex())

export const fetchGuide = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(({ data: id }) => getContentSource().getGuide(id))

export const fetchImageNames = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(({ data: id }) => getContentSource().listImages(id))
