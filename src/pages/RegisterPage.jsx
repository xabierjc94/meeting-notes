import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabaseClient'

function PasswordRequirements({ password }) {
  const checks = [
    { label: '8 caracteres o más', met: password.length >= 8 },
    { label: '1 mayúscula', met: /[A-Z]/.test(password) },
    { label: '1 minúscula', met: /[a-z]/.test(password) },
    { label: '1 símbolo (!@#$%^&*)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) },
  ]

  return (
    <div className="mt-3 space-y-1.5">
      {checks.map((c, i) => (
        <div key={i} className="flex items-center gap-2 text-xs transition-colors duration-200">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all duration-200 ${
            c.met ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-white/5 border-white/15'
          }`}>
            {c.met && (
              <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className={c.met ? 'text-emerald-400/80' : 'text-violet-200/30'}>{c.label}</span>
        </div>
      ))}
    </div>
  )
}

function validatePassword(password) {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[A-Z]/.test(password)) return 'Debe incluir al menos una mayúscula'
  if (!/[a-z]/.test(password)) return 'Debe incluir al menos una minúscula'
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) return 'Debe incluir al menos un símbolo (!@#$%^&*)'
  return null
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const passwordValid = useMemo(() => {
    return password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)
  }, [password])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <>
    <Helmet>
      <title>Crear cuenta — MeetingNotes</title>
      <meta name="description" content="Crea tu cuenta gratuita en MeetingNotes y empieza a organizar tus reuniones con notas estructuradas y tablero Kanban." />
      <link rel="canonical" href="https://meetingnotes.es/register" />
    </Helmet>
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
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-4">
            Empieza a organizar tus reuniones hoy
          </h2>
          <p className="text-lg text-violet-200/70 leading-relaxed">
            Crea una cuenta gratuita y accede a todas las herramientas que necesitas para tomar mejores notas.
          </p>
          <div className="mt-12 space-y-4">
            {['Notas ilimitadas', 'Sincronización en tiempo real', 'Editor de texto enriquecido'].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-violet-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-violet-200/60">{item}</span>
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

            <h1 className="text-2xl font-semibold text-white mb-1">Crear cuenta</h1>
            <p className="text-sm text-violet-200/50 mb-8">Regístrate para empezar</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-violet-200/70 mb-2">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white
                             placeholder-violet-200/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50
                             transition-all duration-200"
                />
              </div>

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
                  placeholder="Escribe una contraseña segura"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white
                             placeholder-violet-200/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50
                             transition-all duration-200"
                />
                <PasswordRequirements password={password} />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !passwordValid}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl py-3 text-sm font-semibold
                           hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando cuenta...
                  </span>
                ) : 'Registrarse'}
              </button>
            </form>

            <p className="mt-6 text-sm text-violet-200/40 text-center">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Inicia sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
