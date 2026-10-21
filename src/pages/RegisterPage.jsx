import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabaseClient'
import AuthLayout, { AuthError } from '../components/layout/AuthLayout'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

// Lista viva de requisitos: cumplido en lima con ✓, pendiente en gris (antes
// los dos en el mismo color). El campo la enlaza con aria-describedby.
function PasswordRequirements({ id, password }) {
  const checks = [
    { label: '8 caracteres o más', met: password.length >= 8 },
    { label: '1 mayúscula', met: /[A-Z]/.test(password) },
    { label: '1 minúscula', met: /[a-z]/.test(password) },
    { label: '1 símbolo (!@#$%^&*)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) },
  ]

  return (
    <ul id={id} className="mt-3 space-y-1.5">
      {checks.map((c) => (
        <li key={c.label} className="flex items-center gap-2 text-xs">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all duration-200 ${
            c.met ? 'bg-accent-soft border-accent/50' : 'bg-card border-line-strong'
          }`} aria-hidden="true">
            {c.met && (
              <svg className="w-2.5 h-2.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className={c.met ? 'text-accent' : 'text-ink-muted'}>
            {c.label}<span className="sr-only">{c.met ? ': cumplido' : ': pendiente'}</span>
          </span>
        </li>
      ))}
    </ul>
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
    <AuthLayout
      hero={{
        title: 'Empieza a organizar tus reuniones hoy',
        text: 'Crea una cuenta gratuita y accede a todas las herramientas que necesitas para tomar mejores notas.',
        children: (
          <ul className="space-y-4">
            {['Notas ilimitadas', 'Sincronización en tiempo real', 'Editor de texto enriquecido'].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-accent-soft rounded-full flex items-center justify-center" aria-hidden="true">
                  <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-ink">{item}</span>
              </li>
            ))}
          </ul>
        ),
      }}
      title="Crear cuenta"
      subtitle="Regístrate para empezar"
      footer={<>¿Ya tienes cuenta?{' '}<Link to="/login" className="text-accent hover:text-accent-hover font-medium underline-offset-2 hover:underline">Inicia sesión</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="register-name" className="block text-sm font-medium text-ink-muted mb-2">Nombre completo</label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Tu nombre"
            className="field py-3"
          />
        </div>

        <div>
          <label htmlFor="register-email" className="block text-sm font-medium text-ink-muted mb-2">Email</label>
          <input
            id="register-email"
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
          <label htmlFor="register-password" className="block text-sm font-medium text-ink-muted mb-2">Contraseña</label>
          {/* new-password: el navegador ofrece generar una contraseña segura */}
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            aria-describedby="register-password-reqs"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Escribe una contraseña segura"
            className="field py-3"
          />
          <PasswordRequirements id="register-password-reqs" password={password} />
        </div>

        {error && <AuthError>{error}</AuthError>}

        <Button type="submit" disabled={loading || !passwordValid} className="w-full h-12" icon={loading ? <Spinner tone="dark" label={null} /> : null}>
          {loading ? 'Creando cuenta…' : 'Registrarse'}
        </Button>
      </form>
    </AuthLayout>
    </>
  )
}
