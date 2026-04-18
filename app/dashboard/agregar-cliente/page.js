'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import './style.css'

export default function AgregarClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Estados para los campos del formulario
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    telefono: '',
    telefonoSecundario: '',
    direccion: '',
    empresa: '',
    notas: ''
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
    if (!formData.nombres.trim()) {
      setError('El nombre es obligatorio')
      return false
    }
    if (!formData.apellidos.trim()) {
      setError('El apellido es obligatorio')
      return false
    }
    if (!formData.telefono.trim()) {
      setError('El teléfono principal es obligatorio')
      return false
    }
    if (formData.email && !formData.email.includes('@')) {
      setError('Ingresa un correo electrónico válido')
      return false
    }
    // Validar teléfono principal (solo números, mínimo 10 dígitos)
    const telefonoLimpio = formData.telefono.replace(/\D/g, '')
    if (telefonoLimpio.length < 10) {
      setError('El teléfono debe tener al menos 10 dígitos')
      return false
    }
    return true
  }

  // Función para limpiar y formatear teléfonos
  const formatPhoneNumber = (phone) => {
    if (!phone) return ''
    // Eliminar todo excepto números
    const cleaned = phone.replace(/\D/g, '')
    return cleaned
  }

  // Función para guardar en Firebase
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Limpiar números de teléfono
      const telefonoLimpio = formatPhoneNumber(formData.telefono)
      const telefonoSecundarioLimpio = formatPhoneNumber(formData.telefonoSecundario)

      // Preparar datos para Firebase
      const clienteData = {
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        nombreCompleto: `${formData.nombres.trim()} ${formData.apellidos.trim()}`,
        email: formData.email.trim() || null,
        telefono: telefonoLimpio,
        telefonoSecundario: telefonoSecundarioLimpio || null,
        direccion: formData.direccion.trim() || null,
        empresa: formData.empresa.trim() || null,
        notas: formData.notas.trim() || null,
        estado: 'activo', // activo, inactivo
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: serverTimestamp(),
        // Estadísticas iniciales
        totalTrabajos: 0,
        totalGastado: 0,
        ultimoTrabajo: null
      }

      console.log('📤 Guardando cliente:', clienteData)

      // Guardar en Firestore colección 'clientes'
      const docRef = await addDoc(collection(db, 'clientes'), clienteData)
      
      console.log('✅ Cliente guardado con ID:', docRef.id)
      
      setSuccess(`¡Cliente ${clienteData.nombreCompleto} guardado exitosamente!`)
      
      // Limpiar formulario
      setFormData({
        nombres: '',
        apellidos: '',
        email: '',
        telefono: '',
        telefonoSecundario: '',
        direccion: '',
        empresa: '',
        notas: ''
      })

      // Opcional: Redirigir después de 2 segundos
      setTimeout(() => {
        router.push('/dashboard') // Volver al dashboard
      }, 2000)

    } catch (error) {
      console.error('❌ Error al guardar en Firebase:', error)
      setError('Error al guardar el cliente: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <h1>👤 Agregar Nuevo Cliente</h1>
        <p>Completa el formulario para registrar un nuevo cliente</p>
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
          {/* Nombres y Apellidos en fila */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nombres">
                Nombre(s) <span className="required">*</span>
              </label>
              <input
                type="text"
                id="nombres"
                name="nombres"
                value={formData.nombres}
                onChange={handleChange}
                placeholder="Ej: Juan Carlos"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="apellidos">
                Apellido(s) <span className="required">*</span>
              </label>
              <input
                type="text"
                id="apellidos"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
                placeholder="Ej: Pérez González"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Email (opcional pero validado) */}
          <div className="form-group">
            <label htmlFor="email">
              Correo Electrónico
              <span className="optional"> (opcional)</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="cliente@ejemplo.com"
              disabled={loading}
            />
          </div>

          {/* Teléfonos en fila */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="telefono">
                Teléfono Principal <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Ej: 5512345678"
                disabled={loading}
                required
              />
              <small className="input-hint">Mínimo 10 dígitos, solo números</small>
            </div>

            <div className="form-group">
              <label htmlFor="telefonoSecundario">
                Teléfono Secundario
                <span className="optional"> (opcional)</span>
              </label>
              <input
                type="tel"
                id="telefonoSecundario"
                name="telefonoSecundario"
                value={formData.telefonoSecundario}
                onChange={handleChange}
                placeholder="Ej: 5587654321"
                disabled={loading}
              />
            </div>
          </div>

          {/* Dirección */}
          <div className="form-group">
            <label htmlFor="direccion">
              Dirección
              <span className="optional"> (opcional)</span>
            </label>
            <textarea
              id="direccion"
              name="direccion"
              rows="2"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Calle, número, colonia, ciudad, código postal"
              disabled={loading}
            />
          </div>

          {/* Empresa */}
          <div className="form-group">
            <label htmlFor="empresa">
              Empresa / Organización
              <span className="optional"> (opcional)</span>
            </label>
            <input
              type="text"
              id="empresa"
              name="empresa"
              value={formData.empresa}
              onChange={handleChange}
              placeholder="Nombre de la empresa"
              disabled={loading}
            />
          </div>

          {/* Notas adicionales */}
          <div className="form-group">
            <label htmlFor="notas">
              Notas adicionales
              <span className="optional"> (opcional)</span>
            </label>
            <textarea
              id="notas"
              name="notas"
              rows="3"
              value={formData.notas}
              onChange={handleChange}
              placeholder="Información relevante sobre el cliente..."
              disabled={loading}
            />
          </div>

          {/* Vista previa del nombre completo */}
          {(formData.nombres || formData.apellidos) && (
            <div className="preview-info">
              <div className="info-item">
                <span className="info-label">Nombre completo:</span>
                <span className="info-value">
                  {formData.nombres} {formData.apellidos}
                </span>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button"
              onClick={() => router.push('/dashboard')}
              disabled={loading}
            >
              Cancelar
            </button>
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
                'Guardar Cliente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}