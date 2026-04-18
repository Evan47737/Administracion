'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import './style.css'

export default function HistorialPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completedJobs, setCompletedJobs] = useState([])
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    totalIngresos: 0,
    promedio: 0
  })

  // Cargar trabajos completados desde Firebase
  useEffect(() => {
    cargarHistorial()
  }, [])

  const cargarHistorial = async () => {
    setLoading(true)
    setError('')

    try {
      // Consulta: trabajos completados ordenados por fecha (más recientes primero)
      const q = query(
        collection(db, 'trabajos'),
        where('estado', '==', 'completado'),
        orderBy('fecha', 'desc')
      )

      const querySnapshot = await getDocs(q)
      const jobsList = []
      let totalIngresos = 0

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const trabajo = {
          id: doc.id,
          ...data,
          fecha: data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha),
          fechaCompletado: data.fechaCompletado?.toDate() || new Date(),
          fechaCreacion: data.fechaCreacion?.toDate() || new Date()
        }
        jobsList.push(trabajo)
        totalIngresos += trabajo.precio || 0
      })

      setCompletedJobs(jobsList)
      setEstadisticas({
        total: jobsList.length,
        totalIngresos,
        promedio: jobsList.length > 0 ? totalIngresos / jobsList.length : 0
      })

    } catch (error) {
      console.error('❌ Error al cargar historial:', error)
      setError('Error al cargar el historial: ' + error.message)
    } finally {
      setLoading(false)
    }
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

  // Función para ver detalles del trabajo
  const verDetalles = (id) => {
    router.push(`/admin/trabajos/${id}`)
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner-large"></div>
        <p>Cargando historial de trabajos...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1>📊 Historial de Trabajos</h1>
        <p>Trabajos completados y facturados</p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-label">Total Completados</span>
            <span className="stat-number">{estadisticas.total}</span>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <span className="stat-label">Ingresos Totales</span>
            <span className="stat-number">{formatMoneda(estadisticas.totalIngresos)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-label">Promedio por Trabajo</span>
            <span className="stat-number">{formatMoneda(estadisticas.promedio)}</span>
          </div>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button onClick={cargarHistorial} className="retry-button">
            Reintentar
          </button>
        </div>
      )}

      <div className="main-section">
        <div className="section-header">
          <h2>Trabajos Terminados</h2>
          <span className="task-count">{completedJobs.length} trabajos</span>
        </div>

        {completedJobs.length > 0 ? (
          <div className="table-container">
            <table className="jobs-table">
              <thead>
                <tr>
                  <th>Trabajo</th>
                  <th>Cliente</th>
                  <th>Fecha Completado</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {completedJobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <div className="job-title">{job.concepto || job.title}</div>
                      {job.descripcion && (
                        <small className="job-desc">{job.descripcion.substring(0, 50)}...</small>
                      )}
                    </td>
                    <td>{job.cliente || job.client}</td>
                    <td>{formatFecha(job.fechaCompletado || job.fecha)}</td>
                    <td className="total-amount">{formatMoneda(job.precio)}</td>
                    <td>
                      <span className="status-badge completed">✅ Completado</span>
                    </td>
                    <td>
                      <button 
                        className="action-button small"
                        onClick={() => verDetalles(job.id)}
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No hay trabajos completados</h3>
            <p>Aún no has completado ningún trabajo. Los trabajos aparecerán aquí cuando los marques como completados.</p>
          </div>
        )}
      </div>
    </div>
  )
}