'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, query, orderBy, where, getDocs, limit, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import './dashboard.css'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trabajos, setTrabajos] = useState([])
  const [completando, setCompletando] = useState(null) // ID del trabajo que se está completando
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    pendientes: 0,
    completados: 0,
    enProgreso: 0,
    totalIngresos: 0,
    anticipos: 0
  })

  // Cargar trabajos desde Firebase
  useEffect(() => {
    cargarTrabajos()
  }, [])

  const cargarTrabajos = async () => {
    setLoading(true)
    setError('')

    try {
      // Consulta: trabajos pendientes (no completados) ordenados por fecha
      const q = query(
        collection(db, 'trabajos'),
        where('estado', '!=', 'completado'),
        orderBy('estado', 'desc'),
        orderBy('fecha', 'asc'),
        limit(20)
      )

      const querySnapshot = await getDocs(q)
      const trabajosList = []
      let totalIngresos = 0
      let totalAnticipos = 0
      let pendientes = 0
      let enProgreso = 0

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const trabajo = {
          id: doc.id,
          ...data,
          fecha: data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha),
          fechaCreacion: data.fechaCreacion?.toDate() || new Date()
        }
        trabajosList.push(trabajo)

        // Calcular estadísticas
        if (trabajo.estado === 'pendiente') pendientes++
        if (trabajo.estado === 'en_progreso') enProgreso++
        totalIngresos += trabajo.precio || 0
        totalAnticipos += trabajo.anticipo || 0
      })

      setTrabajos(trabajosList)
      setEstadisticas({
        total: trabajosList.length,
        pendientes,
        enProgreso,
        completados: 0,
        totalIngresos,
        anticipos: totalAnticipos,
        saldoPendiente: totalIngresos - totalAnticipos
      })

    } catch (error) {
      console.error('❌ Error al cargar trabajos:', error)
      setError('Error al cargar los trabajos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Función para marcar trabajo como completado
  const marcarComoCompletado = async (trabajoId) => {
    if (!confirm('¿Estás seguro de marcar este trabajo como completado?')) {
      return
    }

    setCompletando(trabajoId)
    setError('')

    try {
      // Referencia al documento
      const trabajoRef = doc(db, 'trabajos', trabajoId)
      
      // Actualizar el estado a 'completado' y agregar fecha de completado
      await updateDoc(trabajoRef, {
        estado: 'completado',
        fechaCompletado: new Date(),
        fechaActualizacion: new Date()
      })

      // Mostrar mensaje de éxito
      alert('✅ Trabajo marcado como completado exitosamente')
      
      // Recargar la lista de trabajos
      await cargarTrabajos()

    } catch (error) {
      console.error('❌ Error al completar trabajo:', error)
      setError('Error al marcar trabajo como completado: ' + error.message)
    } finally {
      setCompletando(null)
    }
  }

  // Función para obtener el color según la prioridad
  const getPriorityColor = (prioridad) => {
    switch (prioridad?.toLowerCase()) {
      case 'alta': return '#fa5252'
      case 'media': return '#f08c00'
      case 'baja': return '#37b24d'
      default: return '#718096'
    }
  }

  // Función para obtener el texto del estado
  const getEstadoTexto = (estado) => {
    const estados = {
      'pendiente': '⏳ Pendiente',
      'en_progreso': '🔄 En Progreso',
      'completado': '✅ Completado',
      'cancelado': '❌ Cancelado'
    }
    return estados[estado] || estado || '📋 Pendiente'
  }

  // Función para formatear fecha
  const formatFecha = (fecha) => {
    if (!fecha) return 'Sin fecha'
    const d = new Date(fecha)
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  // Función para formatear moneda
  const formatMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(cantidad || 0)
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner-large"></div>
        <p>Cargando trabajos pendientes...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1>Panel de Control</h1>
        <p>Bienvenido de nuevo, aquí tienes tus tareas pendientes</p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <span className="stat-label">Total Pendientes</span>
            <span className="stat-number">{estadisticas.total}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <span className="stat-label">Pendientes</span>
            <span className="stat-number">{estadisticas.pendientes}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <span className="stat-label">En Progreso</span>
            <span className="stat-number">{estadisticas.enProgreso}</span>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <span className="stat-label">Ingresos Esperados</span>
            <span className="stat-number">{formatMoneda(estadisticas.totalIngresos)}</span>
          </div>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button onClick={cargarTrabajos} className="retry-button">
            Reintentar
          </button>
        </div>
      )}

      {/* Lista de trabajos */}
      <div className="dashboard-grid">
        {/* Sección principal: Tareas pendientes */}
        <div className="main-section">
          <div className="section-header">
            <h2>📋 Trabajos Pendientes</h2>
            <span className="task-count">{trabajos.length} trabajos</span>
          </div>
          
          <div className="tasks-container">
            {trabajos.length > 0 ? (
              trabajos.map((trabajo) => (
                <div key={trabajo.id} className="task-card">
                  <div className="task-header">
                    <div className="task-title-section">
                      <h3 className="task-title">{trabajo.concepto}</h3>
                      <span className="task-client">👤 {trabajo.cliente}</span>
                    </div>
                    <div className="task-badges">
                      <span 
                        className="priority-badge"
                        style={{
                          backgroundColor: `${getPriorityColor(trabajo.prioridad)}20`,
                          color: getPriorityColor(trabajo.prioridad)
                        }}
                      >
                        {trabajo.prioridad || 'media'}
                      </span>
                      <span className="estado-badge">
                        {getEstadoTexto(trabajo.estado)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="task-details">
                    {trabajo.descripcion && (
                      <div className="detail-item full-width">
                        <span className="detail-label">Descripción:</span>
                        <span className="detail-value">{trabajo.descripcion}</span>
                      </div>
                    )}
                    
                    <div className="detail-row">
                      <div className="detail-item">
                        <span className="detail-label">Fecha límite:</span>
                        <span className="detail-value">{formatFecha(trabajo.fecha)}</span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">Precio:</span>
                        <span className="detail-value highlight">
                          {formatMoneda(trabajo.precio)}
                        </span>
                      </div>
                    </div>

                    <div className="detail-row">
                      <div className="detail-item">
                        <span className="detail-label">Anticipo:</span>
                        <span className="detail-value">
                          {formatMoneda(trabajo.anticipo || 0)}
                        </span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">Saldo:</span>
                        <span className="detail-value">
                          {formatMoneda((trabajo.precio || 0) - (trabajo.anticipo || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="task-actions">
                    <button 
                      className={`action-button primary ${completando === trabajo.id ? 'loading' : ''}`}
                      onClick={() => marcarComoCompletado(trabajo.id)}
                      disabled={completando === trabajo.id}
                    >
                      {completando === trabajo.id ? (
                        <>
                          <span className="spinner-small"></span>
                          Completando...
                        </>
                      ) : (
                        '✓ Marcar como completado'
                      )}
                    </button>
                    
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No hay trabajos pendientes</h3>
                <p>¡Todo está al día! No tienes trabajos pendientes.</p>
                <button 
                  className="create-button"
                  onClick={() => router.push('/dashboard/agregar-trabajo')}
                >
                  ➕ Crear nuevo trabajo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar con información */}
        <div className="sidebar-section">
          <div className="stats-card">
            <h3>📊 Resumen Financiero</h3>
            <div className="stat-item">
              <span className="stat-label">Ingresos totales:</span>
              <span className="stat-value highlight">
                {formatMoneda(estadisticas.totalIngresos)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Anticipos recibidos:</span>
              <span className="stat-value">
                {formatMoneda(estadisticas.anticipos)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Saldo pendiente:</span>
              <span className="stat-value">
                {formatMoneda(estadisticas.saldoPendiente)}
              </span>
            </div>
          </div>

          <div className="quick-actions">
            <h3>🚀 Acciones rápidas</h3>
            <button 
              className="quick-action-button"
              onClick={() => router.push('/dashboard/agregar-trabajo')}
            >
              ➕ Nuevo trabajo
            </button>
            <button 
              className="quick-action-button"
              onClick={() => router.push('/dashboard/agregar-cliente')}
            >
              👤 Agregar cliente
            </button>
            <button 
              className="quick-action-button"
              onClick={() => router.push('/dashboard/chat')}
            >
              💬 Ver mensajes
            </button>
            <button 
              className="quick-action-button refresh"
              onClick={cargarTrabajos}
            >
              🔄 Actualizar
            </button>
          </div>

          {/* Trabajos próximos a vencer */}
          {trabajos.length > 0 && (
            <div className="upcoming-card">
              <h3>⏰ Próximos a vencer</h3>
              {trabajos
                .filter(t => new Date(t.fecha) > new Date())
                .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
                .slice(0, 3)
                .map(t => (
                  <div key={t.id} className="upcoming-item">
                    <span className="upcoming-title">{t.concepto}</span>
                    <span className="upcoming-date">
                      {formatFecha(t.fecha)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}