"use client"

import { createContext, useContext, useState } from "react"

type EditState = { dirty: boolean; setDirty: (dirty: boolean) => void }

const ProfileEditContext = createContext<EditState>({
  dirty: false,
  setDirty: () => {},
})

/**
 * Whether the profile open in the editor has unsaved edits, shared with what
 * sits outside the form — the actions menu in the page header, whose "copy"
 * would silently start from the last saved version. Outside the editor, on
 * the list, nothing is ever unsaved.
 */
export function ProfileEditState({ children }: { children: React.ReactNode }) {
  const [dirty, setDirty] = useState(false)

  return (
    <ProfileEditContext value={{ dirty, setDirty }}>
      {children}
    </ProfileEditContext>
  )
}

export function useProfileEditState() {
  return useContext(ProfileEditContext)
}
