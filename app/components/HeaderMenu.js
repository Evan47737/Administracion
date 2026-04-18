'use client'

import { useRouter } from 'next/navigation'

export default function HeaderMenu({ mainItems, subItems, currentPath, onLogout, userRole }) {
  const router = useRouter()
  
  // Combina ambos arrays en uno solo y asegura que cada item tenga un id único
  const allItems = [
    ...(mainItems || []),
    ...(subItems || [])
  ].filter(item => item.visible)
    .map((item, index) => ({
      ...item,
      // Genera un key único basado en el path, label o índice
      uniqueKey: item.id || item.path || item.label || `item-${index}`
    }))

  const handleItemClick = (item) => {
    if (item.isLogout) {
      onLogout()
    } else if (item.path) {
      router.push(item.path)
    }
  }

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: 'white',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      height: '60px',
      zIndex: 1000
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
      
        {/* TODOS los iconos en fila */}
        <nav style={{
          display: 'flex',
          gap: '8px',
          flex: 1,
          justifyContent: 'center',
          margin: '0 20px'
        }}>
          {allItems.map((item) => (
            <button
              key={item.uniqueKey}
              style={{
                padding: '12px',
                background: currentPath === item.path ? '#ebf5ff' : 'none',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                color: currentPath === item.path ? '#1877f2' : '#65676b',
                fontSize: '24px',
                transition: 'all 0.2s'
              }}
              onClick={() => handleItemClick(item)}
              onMouseEnter={(e) => {
                if (currentPath !== item.path) {
                  e.currentTarget.style.backgroundColor = '#f0f2f5'
                }
              }}
              onMouseLeave={(e) => {
                if (currentPath !== item.path) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
              title={item.label}
            >
              {item.icon}
            </button>
          ))}
        </nav>

      </div>
    </header>
  )
}