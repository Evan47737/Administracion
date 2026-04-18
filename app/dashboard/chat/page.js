// app/dashboard/chat/page.js
'use client'

import { useState, useEffect, useRef } from 'react'
import { db } from '@/firebase/config'
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore'


export default function ChatPage() {
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const messagesEndRef = useRef(null)

  // Obtener lista de chats
  useEffect(() => {
    console.log('🔄 Escuchando cambios en colección chats...')
    
    const chatsRef = collection(db, 'chats')
    const q = query(chatsRef)
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📦 Documentos en chats:', snapshot.size)
      
      const chatsList = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        console.log(`📄 Documento ${doc.id}:`, {
          userName: data.userName,
          userEmail: data.userEmail,
          lastMessageText: data.lastMessageText,
          hasData: Object.keys(data).length
        })
        
        // Agregar todos los documentos, incluso si no tienen userName
        chatsList.push({
          id: doc.id,
          userName: data.userName || 'Cliente',
          userEmail: data.userEmail || 'Sin email',
          userPhoto: data.userPhoto || null,
          lastMessage: data.lastMessage || null,
          lastMessageText: data.lastMessageText || 'Sin mensajes',
          ...data
        })
      })
      
      // Ordenar por último mensaje
      chatsList.sort((a, b) => {
        if (a.lastMessage && b.lastMessage) {
          return b.lastMessage.seconds - a.lastMessage.seconds
        }
        return 0
      })
      
      console.log('✅ Chats procesados:', chatsList.length)
      setChats(chatsList)
      setLoading(false)
      
      // Seleccionar el primer chat si hay y no hay uno seleccionado
      if (chatsList.length > 0 && !selectedChat) {
        console.log('🔍 Seleccionando primer chat:', chatsList[0].id)
        setSelectedChat(chatsList[0])
      }
    }, (error) => {
      console.error('❌ Error al escuchar chats:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Escuchar mensajes del chat seleccionado
  useEffect(() => {
    if (!selectedChat) return

    console.log(`🔄 Escuchando mensajes del chat: ${selectedChat.id}`)
    
    const messagesRef = collection(db, 'chats', selectedChat.id, 'messages')
    const q = query(messagesRef, orderBy('timestamp', 'asc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`📦 Mensajes en chat ${selectedChat.id}:`, snapshot.size)
      
      const messagesList = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        messagesList.push({
          id: doc.id,
          ...data
        })
      })
      setMessages(messagesList)
      
      // Marcar mensajes como leídos
      const unreadMessages = messagesList.filter(m => !m.isAdmin && !m.read)
      if (unreadMessages.length > 0) {
        unreadMessages.forEach(async (msg) => {
          const msgRef = doc(db, 'chats', selectedChat.id, 'messages', msg.id)
          await updateDoc(msgRef, { read: true })
        })
      }
      
      scrollToBottom()
    }, (error) => {
      console.error('❌ Error al escuchar mensajes:', error)
    })

    return () => unsubscribe()
  }, [selectedChat])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChat) return

    try {
      const messagesRef = collection(db, 'chats', selectedChat.id, 'messages')
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        userId: 'admin',
        userName: 'Soporte',
        userPhoto: null,
        timestamp: Timestamp.now(),
        isAdmin: true,
        read: true
      })
      
      const chatRef = doc(db, 'chats', selectedChat.id)
      await updateDoc(chatRef, {
        lastMessage: Timestamp.now(),
        lastMessageText: newMessage.trim()
      })
      
      setNewMessage('')
    } catch (error) {
      console.error('Error al enviar mensaje:', error)
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate()
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch (e) {
      return ''
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate()
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      if (date.toDateString() === today.toDateString()) {
        return 'Hoy'
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Ayer'
      } else {
        return date.toLocaleDateString()
      }
    } catch (e) {
      return ''
    }
  }

  // Filtrar chats por búsqueda (case insensitive)
  const filteredChats = chats.filter(chat => {
    const searchLower = searchTerm.toLowerCase()
    const userName = (chat.userName || '').toLowerCase()
    const userEmail = (chat.userEmail || '').toLowerCase()
    const chatId = (chat.id || '').toLowerCase()
    
    return userName.includes(searchLower) || 
           userEmail.includes(searchLower) || 
           chatId.includes(searchLower)
  })

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>💬 Chat de Cotizaciones</h1>
        <p>Cargando conversaciones...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', minHeight: 'calc(100vh - 70px)', background: '#f0f2f5' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: '#1c1e21', marginBottom: '8px' }}>💬 Chat de Cotizaciones</h1>
        <p style={{ color: '#65676b' }}>Comunícate con tus clientes para presupuestos</p>
        {chats.length === 0 && (
          <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
            💡 Tip: Los clientes aparecerán aquí cuando envíen su primer mensaje
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '20px', background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', minHeight: '500px' }}>
        
        {/* Sidebar de contactos */}
        <div style={{ width: '320px', borderRight: '1px solid #e4e6eb', display: 'flex', flexDirection: 'column', background: 'white' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e4e6eb' }}>
            <input 
              type="text" 
              placeholder="Buscar cliente por nombre, email o ID..." 
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e4e6eb', borderRadius: '24px', fontSize: '14px', outline: 'none' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredChats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#65676b' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>💬</span>
                <p style={{ fontWeight: '500', marginBottom: '8px' }}>No hay conversaciones</p>
                <small>Los clientes te contactarán aquí</small>
                {chats.length > 0 && (
                  <p style={{ fontSize: '11px', marginTop: '10px', color: '#999' }}>
                    Total en DB: {chats.length} chats | Filtrados: {filteredChats.length}
                  </p>
                )}
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div 
                  key={chat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #e4e6eb',
                    background: selectedChat?.id === chat.id ? 'rgba(24, 119, 242, 0.1)' : 'white',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => {
                    console.log('🖱️ Seleccionando chat:', chat.id)
                    setSelectedChat(chat)
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#f0f2f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {chat.userPhoto ? (
                      <img src={chat.userPhoto} alt={chat.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span>👤</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#1c1e21' }}>
                        {chat.userName || 'Cliente'}
                      </h4>
                      <span style={{ fontSize: '11px', color: '#65676b' }}>
                        {chat.lastMessage ? formatTime(chat.lastMessage) : ''}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#65676b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chat.lastMessageText || 'Sin mensajes'}
                    </p>
                    <p style={{ fontSize: '10px', color: '#999', margin: '4px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chat.userEmail !== 'Sin email' ? chat.userEmail : `ID: ${chat.id.slice(0, 8)}...`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Área de chat */}
        {selectedChat ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e4e6eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#f0f2f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {selectedChat.userPhoto ? (
                    <img src={selectedChat.userPhoto} alt={selectedChat.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>👤</span>
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 4px 0', color: '#1c1e21' }}>
                    {selectedChat.userName || 'Cliente'}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#65676b', margin: 0 }}>
                    {selectedChat.userEmail !== 'Sin email' ? selectedChat.userEmail : `ID: ${selectedChat.id}`}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#65676b' }}>
                  <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px', opacity: 0.5 }}>💬</span>
                  <p style={{ fontWeight: '500', marginBottom: '8px' }}>No hay mensajes aún</p>
                  <small>Escribe un mensaje para iniciar la conversación</small>
                </div>
              ) : (
                <>
                  {(() => {
                    const groups = {}
                    messages.forEach((msg) => {
                      const date = msg.timestamp ? formatDate(msg.timestamp) : 'Sin fecha'
                      if (!groups[date]) groups[date] = []
                      groups[date].push(msg)
                    })
                    return Object.keys(groups).map((date) => (
                      <div key={date}>
                        <div style={{ textAlign: 'center', margin: '16px 0' }}>
                          <span style={{ background: '#e4e6eb', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', color: '#65676b' }}>{date}</span>
                        </div>
                        {groups[date].map((msg) => (
                          <div 
                            key={msg.id} 
                            style={{
                              display: 'flex',
                              justifyContent: msg.isAdmin ? 'flex-end' : 'flex-start',
                              marginBottom: '16px',
                              animation: 'fadeIn 0.3s'
                            }}
                          >
                            <div style={{
                              maxWidth: '70%',
                              padding: '10px 14px',
                              borderRadius: '18px',
                              background: msg.isAdmin ? '#1877f2' : 'white',
                              color: msg.isAdmin ? 'white' : '#1c1e21',
                              border: msg.isAdmin ? 'none' : '1px solid #e4e6eb'
                            }}>
                              <div style={{ fontSize: '11px', marginBottom: '4px', opacity: 0.7 }}>
                                {msg.isAdmin ? 'Tú (Soporte)' : msg.userName}
                              </div>
                              <div style={{ fontSize: '14px', wordWrap: 'break-word' }}>{msg.text}</div>
                              <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6, textAlign: 'right' }}>
                                {msg.timestamp ? formatTime(msg.timestamp) : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  })()}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} style={{ padding: '16px 24px', borderTop: '1px solid #e4e6eb', display: 'flex', gap: '12px', background: 'white' }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                style={{ flex: 1, padding: '12px 16px', border: '1px solid #e4e6eb', borderRadius: '24px', fontSize: '14px', outline: 'none' }}
                autoComplete="off"
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim()}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#1877f2',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: !newMessage.trim() ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#65676b' }}>
            <div>
              <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px', opacity: 0.5 }}>💬</span>
              <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#1c1e21' }}>Selecciona un chat</h3>
              <p>Elige un cliente de la lista para comenzar a conversar</p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}