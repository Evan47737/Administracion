'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import './style.css'

export default function AgregarTrabajoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Estados para los campos del formulario
  const [formData, setFormData] = useState({
    concepto: '',
    descripcion: '',
    cliente: '',
    fecha: '',
    precio: '',
    anticipo: ''
  })

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Limpiar mensajes al escribir
    setError('')
    setSuccess('')
  }

  // Validar formulario
  const validateForm = () => {
    if (!formData.concepto.trim()) {
      setError('El concepto es obligatorio')
      return false
    }
    if (!formData.descripcion.trim()) {
      setError('La descripción es obligatoria')
      return false
    }
    if (!formData.cliente.trim()) {
      setError('El cliente es obligatorio')
      return false
    }
    if (!formData.fecha) {
      setError('La fecha es obligatoria')
      return false
    }
    if (!formData.precio || formData.precio <= 0) {
      setError('El precio debe ser mayor a 0')
      return false
    }
    if (formData.anticipo && (formData.anticipo < 0 || formData.anticipo > formData.precio)) {
      setError('El anticipo no puede ser mayor al precio ni negativo')
      return false
    }
    return true
  }

  // Función para guardar en Firebase
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Preparar datos para Firebase
      const trabajoData = {
        concepto: formData.concepto,
        descripcion: formData.descripcion,
        cliente: formData.cliente,
        fecha: formData.fecha,
        precio: parseFloat(formData.precio),
        anticipo: formData.anticipo ? parseFloat(formData.anticipo) : 0,
        saldo: formData.anticipo 
          ? parseFloat(formData.precio) - parseFloat(formData.anticipo)
          : parseFloat(formData.precio),
        estado: 'pendiente', // pendiente, en_progreso, completado, cancelado
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: serverTimestamp(),
        // Agregar usuario que creó el trabajo (si tienes auth)
        // creadoPor: auth.currentUser?.uid || 'sistema',
        // creadoPorEmail: auth.currentUser?.email || 'sistema@demo.com'
      }

      console.log('📤 Guardando trabajo:', trabajoData)

      // Guardar en Firestore colección 'trabajos'
      const docRef = await addDoc(collection(db, 'trabajos'), trabajoData)
      
      console.log('✅ Trabajo guardado con ID:', docRef.id)
      
      setSuccess(`¡Trabajo guardado exitosamente! ID: ${docRef.id}`)
      
      // Limpiar formulario
      setFormData({
        concepto: '',
        descripcion: '',
        cliente: '',
        fecha: '',
        precio: '',
        anticipo: ''
      })

      // Opcional: Redirigir después de 2 segundos
      setTimeout(() => {
        router.push('/dashboard') // Volver al dashboard
      }, 2000)

    } catch (error) {
      console.error('❌ Error al guardar en Firebase:', error)
      setError('Error al guardar el trabajo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <h1>➕ Agregar Nuevo Trabajo</h1>
        <p>Completa el formulario para registrar un nuevo trabajo</p>
      </div>

      <div className="form-container">
        {/* Mensajes de error/success */}
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}
        
        {success && (
          <div className="success-message">
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-card">
          {/* Concepto */}
          <div className="form-group">
            <label htmlFor="concepto">
              Concepto <span className="required">*</span>
            </label>
            <input
              type="text"
              id="concepto"
              name="concepto"
              value={formData.concepto}
              onChange={handleChange}
              placeholder="Ej: Diseño de logo corporativo"
              disabled={loading}
              required
            />
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label htmlFor="descripcion">
              Descripción <span className="required">*</span>
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows="4"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Describe los detalles del trabajo..."
              disabled={loading}
              required
            />
          </div>

          {/* Cliente */}
          <div className="form-group">
            <label htmlFor="cliente">
              Cliente <span className="required">*</span>
            </label>
            <input
              type="text"
              id="cliente"
              name="cliente"
              value={formData.cliente}
              onChange={handleChange}
              placeholder="Nombre del cliente"
              disabled={loading}
              required
            />
          </div>

          {/* Fecha límite */}
          <div className="form-group">
            <label htmlFor="fecha">
              Fecha límite <span className="required">*</span>
            </label>
            <input
              type="date"
              id="fecha"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]} // Fecha mínima = hoy
              disabled={loading}
              required
            />
          </div>

          {/* Precio y anticipo en fila */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="precio">
                Precio total $ <span className="required">*</span>
              </label>
              <input
                type="number"
                id="precio"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="anticipo">
                Anticipo $ 
                <span className="optional"> (opcional)</span>
              </label>
              <input
                type="number"
                id="anticipo"
                name="anticipo"
                value={formData.anticipo}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={loading}
                max={formData.precio || 999999}
              />
            </div>
          </div>

          {/* Resumen de saldo (solo informativo) */}
          {formData.precio && (
            <div className="saldo-info">
              <div className="info-item">
                <span className="info-label">Saldo pendiente:</span>
                <span className="info-value">
                  ${(parseFloat(formData.precio) - (parseFloat(formData.anticipo) || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="form-actions">
         
            <button 
              type="submit" 
              className="submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Guardando...
                </>
              ) : (
                'Guardar Trabajo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}