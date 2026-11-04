import { useState } from 'react'
import { BrowserRouter, Link, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, LoginPage, SignupPage, ProfilePage, RequireAuth, useAuth } from './features/auth'
import { ProjectPage, NewProjectPage, EditProjectPage, MyProjectsPage } from './features/projects'
import { MyApplicationsPage, ReviewApplicationsPage } from './features/opportunities'
import { LandingPage, ExplorePage } from './features/discovery/index.ts'
import { Feedback, SetupNotice } from './components/ui/Feedback'
import { supabase } from './lib/supabase'
import { message } from './lib/api'
import './App.css'

function Shell() {
  const { session, profile, error: authError, signOut } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function logout() {
    setBusy(true); setError('')
    try { await signOut() } catch (error) { setError(message(error)) } finally { setBusy(false) }
  }
  return <div className="app">
    <a href="#main" className="neo-skip">Skip to content</a>
    <header className="topbar"><div className="container neo-topbar">
      <Link to="/" className="brand"><span className="brand-mark">▲</span> North East Origins</Link>
      <nav className="nav neo-nav" aria-label="Main navigation"><NavLink className="nav-link" to="/explore">Explore</NavLink>
        {session ? <><NavLink className="nav-link" to="/dashboard/projects">Your projects</NavLink><NavLink className="nav-link" to="/dashboard/applications">Applications</NavLink><NavLink className="nav-link" to="/profile">{profile?.displayName ?? 'Your profile'}</NavLink><button disabled={busy} className="btn btn-secondary btn-sm" onClick={logout}>Sign out</button></> : <><NavLink className="nav-link" to="/login">Sign in</NavLink><Link className="btn btn-primary btn-sm" to="/signup">Join</Link></>}
      </nav></div></header>
    <main className="container main" id="main"><Feedback error={error || authError} /><Outlet /></main>
    <footer className="footer container">North East Origins · Milestones and skills are self-reported.</footer>
  </div>
}
function AppRoutes() {
  const { session } = useAuth()
  return <Routes key={session?.user.id ?? 'public'}><Route element={<Shell />}>
    <Route path="/login" element={<LoginPage />} /><Route path="/signup" element={<SignupPage />} />
    <Route element={supabase ? <Outlet /> : <SetupNotice />}>
      <Route index element={<LandingPage />} /><Route path="/explore" element={<ExplorePage />} />
      <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      <Route path="/projects/new" element={<RequireAuth><NewProjectPage /></RequireAuth>} />
      <Route path="/projects/:projectId" element={<ProjectPage />} />
      <Route path="/projects/:projectId/edit" element={<RequireAuth><EditProjectPage /></RequireAuth>} />
      <Route path="/dashboard/projects" element={<RequireAuth><MyProjectsPage /></RequireAuth>} />
      <Route path="/dashboard/applications" element={<RequireAuth><MyApplicationsPage /></RequireAuth>} />
      <Route path="/projects/:projectId/applications" element={<RequireAuth><ReviewApplicationsPage /></RequireAuth>} />
    </Route>
    <Route path="*" element={<section><h1>Page not found</h1><Link to="/">Return home</Link></section>} />
  </Route></Routes>
}
export default function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>
}
