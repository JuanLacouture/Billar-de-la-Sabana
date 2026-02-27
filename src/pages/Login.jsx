import { useState } from 'react'
import { supabase } from '../supabaseClient'
import '../index.css'


function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError('Credenciales incorrectas. Intenta de nuevo.')
      return
    }

    console.log('Login exitoso:', data)
  }

  return (
    <div className="login-root">
      <div className="bg-overlay">
        <img
          alt="Billiard balls background"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNV2xLGGBmJ4nCVyIlhGcC-izaQ0xItM2Ik8FV7FYdm3DdU4dmMXhMy2i9ixOYt28aoZmbaiwT1PaBFyXbENhAQGEDxW1VWFkhvHMHeKZvtRbznVM4gknxgvt2bepEFQDSNhaF_oKq8L6rnbslSDRTMpfCpERWfUtxFkWe-H0ie3buhfRztifATlctUzuxC6NFpDv5_SILQuaOFwFu9a1vd5mFpUdq8xbML3xNNLNQrEHdpKcko9487ORg0dUMqkPE1HVoWukPFeJ6"
        />
        <div className="grad-top"></div>
        <div className="grad-bottom"></div>
      </div>

      <div className="login-wrapper">
        <div className="login-header">
          <div className="logo-circle">
            <span className="material-icons">sports_esports</span>
          </div>
          <h1 className="login-title">
            Billar de la <span>Sabana</span>
          </h1>
          <p className="login-subtitle">Admin Dashboard</p>
        </div>

        <div className="login-card">
          <div className="login-card-body">
            <h2>Welcome back</h2>

            {error && (
              <div className="error-message">
                <span className="material-icons">error_outline</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email address</label>
                <div className="input-wrapper">
                  <span className="material-icons input-icon">email</span>
                  <input
                    className="form-input"
                    id="email" name="email" type="email"
                    placeholder="admin@clubbillar.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="form-label-row">
                  <label className="form-label" htmlFor="password">Password</label>
                  <a className="link-primary" href="#">Forgot password?</a>
                </div>
                <div className="input-wrapper">
                  <span className="material-icons input-icon">lock</span>
                  <input
                    className="form-input"
                    id="password" name="password" type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                className="btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Iniciando sesión...' : 'Sign In'}
              </button>
            </form>

            <div className="divider">
              <div className="divider-line"><div></div></div>
              <div className="divider-text"><span>Protected System</span></div>
            </div>
          </div>

          <div className="login-card-footer">
            <span>© 2026 Billar de la Sabana</span>
          </div>
        </div>

        <p className="help-text">
          Need help accessing your account?{' '}
          <a className="link-primary" href="#">Contact Support</a>
        </p>
      </div>
    </div>
  )
}

export default Login
