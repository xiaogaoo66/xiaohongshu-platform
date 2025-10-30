export interface Content {
  id: string
  images: string[]
  caption: string
  isClaimed: boolean
  createdAt: string
  claimedAt?: string
}

export interface Admin {
  id: string
  username: string
  createdAt: string
}

export interface Stats {
  total: number
  claimed: number
  unclaimed: number
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
}

export interface CreateContentRequest {
  images: string[]
  caption: string
}

export interface PresignedUrlRequest {
  filename: string
  contentType: string
}

export interface PresignedUrlResponse {
  presignedUrl: string
  key: string
  url: string
}
