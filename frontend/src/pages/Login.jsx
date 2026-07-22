import Form from '../components/Form'
import '../styles/Form.css'

function Login() {
  return (
    <div className="login-page">
      <Form route="/api/token/" method="login" />
    </div>
  )
}

export default Login