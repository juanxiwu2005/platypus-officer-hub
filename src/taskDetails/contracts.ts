export interface TaskExternalLink { label: string; url: string }
export interface TaskAttachment { id: string; name: string; size: number; dataUrl?: string; blobKey?: string }
export interface TaskWorkRecord { authorId: string; details: string; attachmentIds: string[]; savedOn: string }
export interface TaskSubmission extends TaskWorkRecord { id: string; ownerVersion: number }
export interface TaskWork {
  version: 1 | 2
  revision: number
  files: TaskAttachment[]
  drafts: TaskWorkRecord[]
  submissions: TaskSubmission[]
}
export type TaskAuthorization = { kind: "access" | "legacy"; token: string }
export interface TaskWorkInput {
  details: string
  attachments: TaskAttachment[]
  expectedRevision: number
  expectedOwnerId: string | null
  expectedOwnerVersion: number
  submit: boolean
}
