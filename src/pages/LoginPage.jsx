import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900">
      <div className="flex-1 hidden lg:flex items-center justify-center p-12">
        <div className="max-w-lg animate-fadeIn">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">MeetingNotes</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Captura tus ideas más importantes
          </h2>
          <p className="text-lg text-violet-200/70 leading-relaxed">
            Organiza tus reuniones, toma notas estructuradas y mantén todo sincronizado en un solo lugar.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Rápido' },
              { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label: 'Seguro' },
              { icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', label: 'Sincronizado' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-2 border border-white/10">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                <span className="text-sm text-violet-200/60">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-scaleIn">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">MeetingNotes</span>
            </div>

            <h1 className="text-2xl font-semibold text-white mb-1">Bienvenido de nuevo</h1>
            <p className="text-sm text-violet-200/50 mb-8">Inicia sesión para continuar</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-violet-200/70 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white
                             placeholder-violet-200/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50
                             transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-violet-200/70 mb-2">Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white
                             placeholder-violet-200/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50
                             transition-all duration-200"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl py-3 text-sm font-semibold
                           hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : 'Iniciar sesión'}
              </button>
            </form>

            <p className="mt-6 text-sm text-violet-200/40 text-center">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Regístrate</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
