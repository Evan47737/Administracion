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
  const [showSidebar, setShowSidebar] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const messagesEndRef = useRef(null)

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setShowSidebar(true) // En desktop siempre mostrar sidebar
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    if (isMobile) {
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

  // Vista para desktop (sidebar y chat lado a lado)
  if (!isMobile) {
    return (
      <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>💬 Chat con Clientes</h1>
        
        <div style={{ display: 'flex', gap: '20px', background: 'white', borderRadius: '16px', overflow: 'hidden', minHeight: '600px' }}>
          
          {/* Sidebar de contactos - Desktop */}
          <div style={{ width: '320px', borderRight: '1px solid #e4e6eb', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e4e6eb' }}>
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                style={{ width: '100%', padding: '10px', border: '1px solid #e4e6eb', borderRadius: '20px', fontSize: '14px', outline: 'none' }}
                onChange={(e) => {
                  const searchTerm = e.target.value.toLowerCase()
                  const filtered = chats.filter(chat => 
                    chat.userName.toLowerCase().includes(searchTerm) ||
                    chat.userEmail.toLowerCase().includes(searchTerm)
                  )
                  const container = document.getElementById('chats-list-desktop')
                  if (container) {
                    const filteredHtml = filtered.map(chat => `
                      <div class="chat-item-desktop" data-id="${chat.id}" style="padding: 16px; border-bottom: 1px solid #e4e6eb; cursor: pointer; display: flex; align-items: center; gap: 12px;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: #e4e6eb; display: flex; align-items: center; justify-content: center; font-size: 24px; overflow: hidden;">
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
                    document.querySelectorAll('.chat-item-desktop').forEach(el => {
                      el.addEventListener('click', () => {
                        const chat = filtered.find(c => c.id === el.dataset.id)
                        if (chat) selectChat(chat)
                      })
                    })
                  }
                }}
              />
            </div>
            <div id="chats-list-desktop" style={{ flex: 1, overflowY: 'auto' }}>
              {chats.map(chat => (
                <div 
                  key={chat.id}
                  className="chat-item-desktop"
                  data-id={chat.id}
                  onClick={() => selectChat(chat)}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #e4e6eb',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: selectedChat?.id === chat.id ? '#ebf5ff' : 'white'
                  }}
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
                      <strong style={{ fontSize: '15px' }}>{chat.userName}</strong>
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
              ))}
            </div>
          </div>

          {/* Área de chat - Desktop */}
          {selectedChat ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #e4e6eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
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
                    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>{selectedChat.userName}</h3>
                    <p style={{ fontSize: '13px', color: '#65676b', margin: '4px 0 0' }}>{selectedChat.userEmail}</p>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#65676b' }}>
                    <p>No hay mensajes aún</p>
                    <small>Escribe un mensaje para iniciar la conversación</small>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.isAdmin ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%',
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

              <form onSubmit={handleSendMessage} style={{ padding: '16px 24px', borderTop: '1px solid #e4e6eb', display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid #e4e6eb', fontSize: '14px', outline: 'none' }}
                  autoComplete="off"
                />
                <button type="submit" disabled={!newMessage.trim()} style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#1877f2',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: !newMessage.trim() ? 0.5 : 1
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#65676b' }}>
              <p>Selecciona un cliente para comenzar el chat</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Vista para móvil (sidebar y chat separados)
  return (
    <div style={{ padding: '10px', background: '#f0f2f5', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px', padding: '0 10px' }}>💬 Chat con Clientes</h1>

      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', minHeight: 'calc(100vh - 100px)' }}>
        
        {showSidebar ? (
          <div style={{ width: '100%', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid #e4e6eb' }}>
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                style={{ width: '100%', padding: '10px', border: '1px solid #e4e6eb', borderRadius: '20px', fontSize: '14px', outline: 'none' }}
                onChange={(e) => {
                  const searchTerm = e.target.value.toLowerCase()
                  const filtered = chats.filter(chat => 
                    chat.userName.toLowerCase().includes(searchTerm) ||
                    chat.userEmail.toLowerCase().includes(searchTerm)
                  )
                  const container = document.getElementById('chats-list-mobile')
                  if (container) {
                    const filteredHtml = filtered.map(chat => `
                      <div class="chat-item-mobile" data-id="${chat.id}" style="padding: 12px; border-bottom: 1px solid #e4e6eb; cursor: pointer; display: flex; align-items: center; gap: 12px;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: #e4e6eb; display: flex; align-items: center; justify-content: center; font-size: 24px; overflow: hidden;">
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
                    document.querySelectorAll('.chat-item-mobile').forEach(el => {
                      el.addEventListener('click', () => {
                        const chat = filtered.find(c => c.id === el.dataset.id)
                        if (chat) selectChat(chat)
                      })
                    })
                  }
                }}
              />
            </div>
            <div id="chats-list-mobile">
              {chats.map(chat => (
                <div 
                  key={chat.id}
                  className="chat-item-mobile"
                  data-id={chat.id}
                  onClick={() => selectChat(chat)}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #e4e6eb',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
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
                      <strong>{chat.userName}</strong>
                      <span style={{ fontSize: '11px', color: '#65676b' }}>
                        {chat.lastMessage ? formatTime(chat.lastMessage) : ''}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#65676b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chat.lastMessageText}
                    </p>
                    <p style={{ fontSize: '10px', color: '#999', margin: '4px 0 0' }}>
                      {chat.userEmail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e4e6eb', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={backToList} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '8px' }}>←</button>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e4e6eb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {selectedChat?.userPhoto ? (
                  <img src={selectedChat.userPhoto} alt={selectedChat.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>👤</span>
                )}
              </div>
              <div>
                <h3 style={{ fontSize: '16px', margin: 0 }}>{selectedChat?.userName}</h3>
                <p style={{ fontSize: '11px', color: '#65676b', margin: '2px 0 0' }}>{selectedChat?.userEmail}</p>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fafafa' }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.isAdmin ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: '18px',
                    background: msg.isAdmin ? '#1877f2' : 'white',
                    color: msg.isAdmin ? 'white' : '#1c1e21',
                    border: msg.isAdmin ? 'none' : '1px solid #e4e6eb'
                  }}>
                    <div style={{ fontSize: '11px', marginBottom: '4px', opacity: 0.7 }}>{msg.isAdmin ? 'Tú' : msg.userName}</div>
                    <div style={{ fontSize: '14px' }}>{msg.text}</div>
                    <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6, textAlign: 'right' }}>
                      {msg.timestamp ? formatTime(msg.timestamp) : ''}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} style={{ padding: '12px 16px', borderTop: '1px solid #e4e6eb', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #e4e6eb', fontSize: '14px', outline: 'none' }}
              />
              <button type="submit" disabled={!newMessage.trim()} style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#1877f2',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                opacity: !newMessage.trim() ? 0.5 : 1
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}