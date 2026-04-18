'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import HeaderMenu from '../components/HeaderMenu.js'
import './dashboard.css'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [userRole] = useState('admin')

  const handleLogout = () => {
    router.push('/login')
  }

  // Menú principal - SOLO el dashboard
  const menuItems = [
    {
      path: '/dashboard',  // ✅ CORREGIDO: Ruta al dashboard principal
      icon: '📋',
      visible: true
    },
  ];

  // Submenú - Todas las demás opciones
  const inventarioSubmenu = [
    {
      path: '/dashboard/agregar-trabajo',  // ✅ Ruta absoluta
      icon: '➕',
      visible: userRole === 'admin'
    },
    {
      path: '/dashboard/agregar-cliente',  // ✅ Ruta absoluta
      icon: '👤',
      visible: userRole === 'admin'
    },
    {
      path: '/dashboard/historial',  // ✅ Ruta absoluta
      icon: '📊',
      visible: userRole === 'admin'
    },
    {
      path: '/dashboard/chat',  // ✅ Ruta absoluta
      icon: '💬',
      visible: true
    },
    {
      icon: '🚪',  // ✅ Icono de logout
      visible: true,
      isLogout: true  // ✅ Marca especial
    },
  ];

  return (
    <div className="dashboard-container">
      <HeaderMenu
        mainItems={menuItems}  // ✅ Prop correcta para menú principal
        subItems={inventarioSubmenu}  // ✅ Prop correcta para submenú
        currentPath={pathname}
        onLogout={handleLogout}
        userRole={userRole}
      />

      <main className="dashboard-content">
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  )
}