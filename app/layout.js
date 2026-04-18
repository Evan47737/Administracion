import './styles/globals.css'

export const metadata = {
  title: 'Sistema de Gestión',
  description: 'Sistema de gestión',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  )
}