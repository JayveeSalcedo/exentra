import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { AuthUser } from '../types/auth'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (schoolId: string, password: string) => Promise<{ error: string | null }>
  loginWithGoogle: () => Promise<{ error: string | null }>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Tracks the id of the profile currently loaded into `user`, so we can
  // ignore redundant SIGNED_IN events that Supabase fires on tab focus /
  // token refresh — without this, refocusing the tab reloads the profile,
  // produces a new `user` object, and retriggers every dashboard fetch
  // effect that depends on `user`, causing a visible reload/flicker.
  const loadedUserIdRef = useRef<string | null>(null)

  // Load session on mount
  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await loadProfile(session.user.id, session.user)
      }
      setIsLoading(false)
    }

    initSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.id)
        if (event === 'SIGNED_IN' && session?.user) {
          if (loadedUserIdRef.current === session.user.id) {
            // Same user already loaded — this is a tab-focus / token-refresh
            // re-fire, not a real sign-in. Skip to avoid reloading the page.
            return
          }
          // Small delay to ensure profile insert completes first
          setTimeout(async () => {
            await loadProfile(session.user.id, session.user)
          }, 1000)
        } else if (event === 'USER_UPDATED' && session?.user) {
          // Fires once a pending email change is actually confirmed (the
          // person clicked the link(s) sent to their old/new address).
          // profiles.school_id is intentionally left untouched at save time
          // for this exact reason — writing it early would let login()
          // construct a login email that doesn't match auth.users.email yet
          // and lock the account out until confirmation. Sync it here instead.
          await syncSchoolIdFromAuthEmail(session.user)
          await loadProfile(session.user.id, session.user)
        } else if (event === 'SIGNED_OUT') {
          loadedUserIdRef.current = null
          setUser(null)
          setIsLoading(false)
        } else {
          setIsLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const syncSchoolIdFromAuthEmail = async (authUser: any) => {
    const email: string | undefined = authUser?.email
    if (!email || !email.endsWith('@psu.edu.ph')) return
    const derivedSchoolId = email.split('@')[0]
    const { data } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', authUser.id)
      .single()
    if (data && data.school_id !== derivedSchoolId) {
      const { error } = await supabase
        .from('profiles')
        .update({ school_id: derivedSchoolId })
        .eq('id', authUser.id)
      if (error) console.error('Failed to sync school_id after email confirmation:', error)
    }
  }

  const loadProfile = async (userId: string, authUser?: any) => {
    console.log('Loading profile for:', userId)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // If no profile exists and we have Google auth data, create one
    if ((error || !data) && authUser) {
      const fullName = authUser.user_metadata?.full_name ?? ''
      const nameParts = fullName.trim().split(' ')
      const firstName = nameParts[0] ?? 'User'
      const lastName = nameParts.slice(1).join(' ') || 'Unknown'
      const username = authUser.email?.split('@')[0] ?? `user_${userId.slice(0, 6)}`
      const schoolId = username

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          school_id: schoolId,
          first_name: firstName,
          last_name: lastName,
          username,
          role: 'student',
          avatar_url: authUser.user_metadata?.avatar_url ?? null,
        })
        .select()
        .single()

      if (insertError || !newProfile) {
        console.error('Failed to create Google profile:', insertError)
        loadedUserIdRef.current = null
        setUser(null)
        return
      }

      loadedUserIdRef.current = newProfile.id
      setUser({
        id: newProfile.id,
        schoolId: newProfile.school_id,
        firstName: newProfile.first_name,
        lastName: newProfile.last_name,
        username: newProfile.username,
        role: newProfile.role,
        avatarUrl: newProfile.avatar_url,
        xp: newProfile.xp ?? 0,
        level: newProfile.level ?? 1,
        streak: newProfile.streak ?? 0,
      })
      setIsLoading(false)
      return
    }

    if (error || !data) {
      console.error('Failed to load profile:', error)
      loadedUserIdRef.current = null
      setUser(null)
      setIsLoading(false)
      return
    }

    loadedUserIdRef.current = data.id
    setUser({
      id: data.id,
      schoolId: data.school_id,
      firstName: data.first_name,
      lastName: data.last_name,
      username: data.username,
      role: data.role,
      avatarUrl: data.avatar_url,
      xp: data.xp ?? 0,
      level: data.level ?? 1,
      streak: data.streak ?? 0,
    })
    setIsLoading(false)
  }

  const login = async (schoolId: string, password: string) => {
    setIsLoading(true)

    // Look up email from school_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('school_id', schoolId)
      .single()

    if (profileError || !profile) {
      setIsLoading(false)
      return { error: 'School ID not found.' }
    }

    const email = `${schoolId}@psu.edu.ph`
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setIsLoading(false)
      return { error: 'Invalid credentials.' }
    }

    // Don't set isLoading false here
    // onAuthStateChange will handle it after profile loads
    return { error: null }
  }

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  const logout = async () => {
    setIsLoading(false)
    await supabase.auth.signOut()
    setUser(null)
  }

  const refreshProfile = async () => {
    if (!user) return
    await loadProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
