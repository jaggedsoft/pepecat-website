export interface AvatarAsset {
  id: string
  label: string
}

export const heroAvatar: AvatarAsset = { id: 'pc03', label: 'PEPECAT grinning with its tongue out' }

export const featuredAvatars: AvatarAsset[] = [
  { id: 'pc01', label: 'PEPECAT smiling' },
  { id: 'pc02', label: 'PEPECAT plotting' },
  { id: 'pc07', label: 'PEPECAT in blue shades' },
  { id: 'pc10', label: 'PEPECAT giving the okay sign' },
  { id: 'pc12', label: 'PEPECAT with dollar eyes' },
  { id: 'pc13', label: 'PEPECAT with fire eyes' },
  { id: 'pc15', label: 'PEPECAT sending love' },
  { id: 'pc21', label: 'PEPECAT surrounded by hearts' },
  { id: 'pc24', label: 'PEPECAT laughing' },
  { id: 'pc25', label: 'PEPECAT celebrating' },
  { id: 'pc31', label: 'PEPECAT starstruck' },
  { id: 'pc34', label: 'PEPECAT with a halo' },
]

export const avatarSrcSet = (id: string, format: 'avif' | 'webp') =>
  [480, 960, 1440].map((width) => `/media/avatars/${id}-${width}.${format} ${width}w`).join(', ')
