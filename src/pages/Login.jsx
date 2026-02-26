import { useState } from 'react'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log({ email, password, rememberMe })
  }

  return (
    <>
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
            Club de Billar <span>Sabana</span>
          </h1>
          <p className="login-subtitle">Admin Dashboard</p>
        </div>

        <div className="login-card">
          <div className="login-card-body">
            <h2>Welcome back</h2>
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
                  />
                </div>
              </div>

              <div className="checkbox-row">
                <input
                  id="remember-me" name="remember-me" type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember-me">Remember me</label>
              </div>

              <button className="btn-primary" type="submit">Sign In</button>
            </form>

            <div className="divider">
              <div className="divider-line"><div></div></div>
              <div className="divider-text"><span>Protected System</span></div>
            </div>
          </div>

          <div className="login-card-footer">
            <span>© 2024 Club de Billar Sabana</span>
            <div>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>

        <p className="help-text">
          Need help accessing your account?{' '}
          <a className="link-primary" href="#">Contact Support</a>
        </p>
      </div>
    </>
  )
}

export default Login
