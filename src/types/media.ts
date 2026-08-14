export interface MediaSource {
  width: number
  avif?: string
  webp?: string
  src?: string
}

export interface MemeAsset {
  id: string
  kind: 'image' | 'video'
  sources: MediaSource[]
  poster?: string
  width: number
  height: number
  alt: string
  hash: string
  sourcePostId: string
}

export interface MemeManifest {
  snapshotDate: string
  auditedBaseline: { photos: number; videos: number }
  finalCount: number
  assets: MemeAsset[]
}
