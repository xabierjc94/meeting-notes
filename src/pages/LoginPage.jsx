import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabaseClient'
import AuthLayout, { AuthError } from '../components/layout/AuthLayout'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

// Ventajas del panel de presentación
const FEATURES = [
  { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Rápido' },
  { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label: 'Seguro' },
  { icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', label: 'Sincronizado' },
]

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
    <>
    <Helmet>
      <title>Iniciar sesión — MeetingNotes</title>
      <meta name="description" content="Accede a tu cuenta de MeetingNotes y continúa organizando tus reuniones." />
      <link rel="canonical" href="https://meetingnotes.es/login" />
    </Helmet>
    <AuthLayout
      hero={{
        title: 'Captura tus ideas más importantes',
        text: 'Organiza tus reuniones, toma notas estructuradas y mantén todo sincronizado en un solo lugar.',
        children: (
          <ul className="grid grid-cols-3 gap-6">
            {FEATURES.map((item) => (
              <li key={item.label} className="text-center">
                <span className="w-10 h-10 bg-card rounded-xl flex items-center justify-center mx-auto mb-2 border border-line" aria-hidden="true">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </span>
                <span className="text-sm text-ink-muted">{item.label}</span>
              </li>
            ))}
          </ul>
        ),
      }}
      title="Bienvenido de nuevo"
      subtitle="Inicia sesión para continuar"
      footer={<>¿No tienes cuenta?{' '}<Link to="/register" className="text-accent hover:text-accent-hover font-medium underline-offset-2 hover:underline">Regístrate</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          {/* htmlFor + id: la etiqueta queda ligada a su campo (lector de pantalla y
              clic en la etiqueta). autoComplete: el gestor de contraseñas sabe qué rellenar */}
          <label htmlFor="login-email" className="block text-sm font-medium text-ink-muted mb-2">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="field py-3"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-ink-muted mb-2">Contraseña</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="field py-3"
          />
        </div>

        {error && <AuthError>{error}</AuthError>}

        <Button type="submit" disabled={loading} className="w-full h-12" icon={loading ? <Spinner tone="dark" label={null} /> : null}>
          {loading ? 'Entrando…' : 'Iniciar sesión'}
        </Button>
      </form>
    </AuthLayout>
    </>
  )
}
