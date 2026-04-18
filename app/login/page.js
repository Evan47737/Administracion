'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import './style.css'
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '@/firebase/config'

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault(); // Prevenir el comportamiento por defecto del form
        setError('');
        setLoading(true);

        try {
            // Usar signInWithEmailAndPassword directamente de Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log("Usuario logueado:", userCredential.user);
            
            // Redirigir al dashboard después del login exitoso
            router.push('/dashboard');
        } catch (error) {
            console.error("Error de login:", error);
            
            // Manejar diferentes tipos de errores
            switch(error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    setError('Credenciales incorrectas');
                    break;
                case 'auth/invalid-email':
                    setError('Correo electrónico inválido');
                    break;
                case 'auth/too-many-requests':
                    setError('Demasiados intentos fallidos. Intenta más tarde');
                    break;
                default:
                    setError('Error al iniciar sesión. Intenta de nuevo');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = () => {
        // Usuario de demostración
        setEmail('demo@ejemplo.com');
        setPassword('demo123');
        // Opcional: auto-submit después de un pequeño delay
        setTimeout(() => {
            document.getElementById('loginForm').dispatchEvent(
                new Event('submit', { cancelable: true, bubbles: true })
            );
        }, 100);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Iniciar Sesión</h1>
                <p className="subtitle">Sistema de Gestión de Trabajos</p>
                
                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}
                
                <form 
                    id="loginForm"
                    onSubmit={handleLogin} 
                    className="login-form"
                >
                    <div className="form-group">
                        <label htmlFor="email">Correo Electrónico</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="usuario@ejemplo.com"
                            required
                            disabled={loading}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={loading}
                        />
                    </div>
                    
                    <button 
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
                    </button>
                    
                   
                </form>
                
                <div className="login-footer">
                    <p>¿Problemas para ingresar? Contacta al administrador</p>
                </div>
            </div>
        </div>
    )
}