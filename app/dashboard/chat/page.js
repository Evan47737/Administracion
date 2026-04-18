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
  const [showSidebar, setShowSidebar] = useState(true) // Para controlar vista en móvil
  const messagesEndRef = useRef(null)

  // Obtener lista de chats
  useEffect(() => {
    const chatsRef = collection(db, 'chats')
    const q = query(chatsRef)
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsList = []
      snapshot.forEach((doc) => {
        const data = doc.data()
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
      
      chatsList.sort((a, b) => {
        if (a.lastMessage && b.lastMessage) {
          return b.lastMessage.seconds - a.lastMessage.seconds
        }
        return 0
      })
      
      setChats(chatsList)
      setLoading(false)
      
      if (chatsList.length > 0 && !selectedChat) {
        setSelectedChat(chatsList[0])
        // En móvil, cuando se selecciona un chat, ocultar sidebar
        if (window.innerWidth < 768) {
          setShowSidebar(false)
        }
      }
    })

    return () => unsubscribe()
  }, [])

  // Escuchar mensajes del chat seleccionado
  useEffect(() => {
    if (!selectedChat) return

    const messagesRef = collection(db, 'chats', selectedChat.id, 'messages')
    const q = query(messagesRef, orderBy('timestamp', 'asc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList = []
      snapshot.forEach((doc) => {
        messagesList.push({ id: doc.id, ...doc.data() })
      })
      setMessages(messagesList)
      scrollToBottom()
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
      console.error('Error:', error)
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const selectChat = (chat) => {
    setSelectedChat(chat)
    // En móvil, ocultar sidebar al seleccionar un chat
    if (window.innerWidth < 768) {
      setShowSidebar(false)
    }
  }

  const backToList = () => {
    setShowSidebar(true)
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Cargando chats...</p>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '10px', 
      background: '#f0f2f5', 
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px', padding: '0 10px' }}>💬 Chat con Clientes</h1>

      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        background: 'white', 
        borderRadius: '16px', 
        overflow: 'hidden',
        minHeight: 'calc(100vh - 100px)'
      }}>
        
        {/* Sidebar de contactos - se muestra solo si showSidebar es true */}
        {showSidebar ? (
          <div style={{ 
            width: '100%',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            background: 'white'
          }}>
            <div style={{ padding: '12px', borderBottom: '1px solid #e4e6eb' }}>
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  border: '1px solid #e4e6eb', 
                  borderRadius: '20px', 
                  fontSize: '14px',
                  outline: 'none'
                }}
                onChange={(e) => {
                  const searchTerm = e.target.value.toLowerCase()
                  const filtered = chats.filter(chat => 
                    chat.userName.toLowerCase().includes(searchTerm) ||
                    chat.userEmail.toLowerCase().includes(searchTerm)
                  )
                  // Actualizar lista filtrada
                  const container = document.getElementById('chats-list')
                  if (container) {
                    const filteredHtml = filtered.map(chat => `
                      <div class="chat-item" data-id="${chat.id}" style="padding: 12px; border-bottom: 1px solid #e4e6eb; cursor: pointer; display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #e4e6eb; display: flex; align-items: center; justify-content: center; font-size: 20px; overflow: hidden;">
                          ${chat.userPhoto ? `<img src="${chat.userPhoto}" style="width: 100%; height: 100%; object-fit: cover;">` : '👤'}
                        </div>
                        <div style="flex: 1;">
                          <div style="display: flex; justify-content: space-between;">
                            <strong>${chat.userName}</strong>
                            <span style="font-size: 11px; color: #65676b;">${chat.lastMessage ? formatTime(chat.lastMessage) : ''}</span>
                          </div>
                          <p style="font-size: 12px; color: #65676b; margin: 4px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${chat.lastMessageText}</p>
                        </div>
                      </div>
                    `).join('')
                    container.innerHTML = filteredHtml
                    // Reasignar eventos
                    document.querySelectorAll('.chat-item').forEach(el => {
                      el.addEventListener('click', () => {
                        const chat = filtered.find(c => c.id === el.dataset.id)
                        if (chat) selectChat(chat)
                      })
                    })
                  }
                }}
              />
            </div>
            <div id="chats-list">
              {chats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#65676b' }}>
                  <p>No hay conversaciones</p>
                  <small>Los clientes te contactarán aquí</small>
                </div>
              ) : (
                chats.map(chat => (
                  <div 
                    key={chat.id}
                    className="chat-item"
                    data-id={chat.id}
                    onClick={() => selectChat(chat)}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #e4e6eb',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f2f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#e4e6eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
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
                        <strong style={{ fontSize: '15px', color: '#1c1e21' }}>{chat.userName}</strong>
                        <span style={{ fontSize: '11px', color: '#65676b' }}>
                          {chat.lastMessage ? formatTime(chat.lastMessage) : ''}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#65676b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chat.lastMessageText}
                      </p>
                      <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>
                        {chat.userEmail}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {/* Área de chat - se muestra cuando hay un chat seleccionado */}
        {selectedChat && !showSidebar ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: 'calc(100vh - 100px)',
            background: 'white'
          }}>
            {/* Header del chat con botón de volver */}
            <div style={{ 
              padding: '12px 16px', 
              borderBottom: '1px solid #e4e6eb',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'white'
            }}>
              <button 
                onClick={backToList}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f2f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ←
              </button>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#e4e6eb',
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
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#1c1e21' }}>
                  {selectedChat.userName}
                </h3>
                <p style={{ fontSize: '12px', color: '#65676b', margin: '2px 0 0' }}>
                  {selectedChat.userEmail}
                </p>
              </div>
            </div>

            {/* Mensajes */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: '#fafafa'
            }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#65676b' }}>
                  <p>No hay mensajes aún</p>
                  <small>Escribe un mensaje para iniciar la conversación</small>
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    style={{
                      display: 'flex',
                      justifyContent: msg.isAdmin ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{
                      maxWidth: '80%',
                      padding: '10px 14px',
                      borderRadius: '18px',
                      background: msg.isAdmin ? '#1877f2' : 'white',
                      color: msg.isAdmin ? 'white' : '#1c1e21',
                      border: msg.isAdmin ? 'none' : '1px solid #e4e6eb'
                    }}>
                      <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.7 }}>
                        {msg.isAdmin ? 'Tú (Soporte)' : msg.userName}
                      </div>
                      <div style={{ fontSize: '14px', wordWrap: 'break-word' }}>{msg.text}</div>
                      <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6, textAlign: 'right' }}>
                        {msg.timestamp ? formatTime(msg.timestamp) : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensaje */}
            <form onSubmit={handleSendMessage} style={{ 
              padding: '12px 16px', 
              borderTop: '1px solid #e4e6eb', 
              display: 'flex', 
              gap: '8px',
              background: 'white'
            }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                style={{ 
                  flex: 1, 
                  padding: '10px 14px', 
                  borderRadius: '20px', 
                  border: '1px solid #e4e6eb', 
                  fontSize: '14px',
                  outline: 'none'
                }}
                autoComplete="off"
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim()}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#1877f2',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: !newMessage.trim() ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        ) : null}

        {/* Si no hay chat seleccionado y no se muestra sidebar */}
        {!selectedChat && !showSidebar && (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            textAlign: 'center', 
            padding: '40px',
            color: '#65676b'
          }}>
            <div>
              <button 
                onClick={backToList}
                style={{
                  background: '#1877f2',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '20px',
                  marginTop: '16px',
                  cursor: 'pointer'
                }}
              >
                ← Volver a la lista
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (min-width: 768px) {
          .chat-item:hover {
            background-color: #f0f2f5;
          }
        }
      `}</style>
    </div>
  )
}