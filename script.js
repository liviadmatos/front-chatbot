const URL_BACKEND = 'https://back-chatbot-2.onrender.com/';

document.addEventListener('DOMContentLoaded', () => {
    let socket = null;

    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');
    const iniciarBtn = document.getElementById('iniciarBtn');
    const encerrarBtn = document.getElementById('encerrarBtn');
    const limparBtn = document.getElementById('limparBtn');

    let userSessionId = null;

    // Função para adicionar mensagens no chat
    function addMessageToChat(sender, text, type = 'normal') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        // Define as classes estruturais com base no remetente e tipo
        if (type === 'status') {
            messageElement.classList.add('status-message');
            sender = 'status';
        } else if (type === 'error') {
            messageElement.classList.add('status-message', 'error-text');
            sender = 'erro';
        } else if (sender.toLowerCase() === 'user') {
            messageElement.classList.add('user-message');
            sender = 'Você';
        } else if (sender.toLowerCase() === 'bot') {
            messageElement.classList.add('bot-message');
            sender = 'Bot';
        }

        // Tag de controle do remetente (oculta por padrão no CSS dos balões comuns)
        const senderSpan = document.createElement('strong');
        senderSpan.textContent = `${sender}: `;
        messageElement.appendChild(senderSpan);

        // Container textual da mensagem
        const textSpan = document.createElement('span');
        
        if (type === 'normal') {
            textSpan.innerHTML = marked.parse(text);
        } else {
            textSpan.textContent = text;
        }
        
        messageElement.appendChild(textSpan);

        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Função para habilitar/desabilitar as ações de digitação no chat
    function setChatEnabled(enabled) {
        messageInput.disabled = !enabled;
        sendButton.disabled = !enabled;
    }

    // Configuração do Estado Inicial Real do Sistema
    setChatEnabled(false);
    connectionStatus.textContent = 'OFFLINE';
    connectionStatus.className = 'status-offline'; 
    addMessageToChat('status', 'Clique em "Iniciar conversa" para começar.', 'status');

    // Função para gerenciar a conexão Socket.IO
    function iniciarConversa() {
        if (socket && socket.connected) return;

        // Feedback imediato de carregamento na interface
        connectionStatus.textContent = 'CONECTANDO...';
        connectionStatus.className = 'status-offline';

        // Abre a conexão configurando transports para evitar problemas de proxy/cors no Render
        socket = io(URL_BACKEND, {
            transports: ['websocket', 'polling'],
            timeout: 10000 // Limite de 10 segundos para responder
        });

        socket.on('connect', () => {
            console.log('Conectado ao servidor Socket.IO! SID:', socket.id);
            connectionStatus.textContent = 'CONECTADO';
            connectionStatus.className = 'status-online';
            
            // Limpa o aviso inicial ao conectar com sucesso
            if (chatBox.innerHTML.includes('Clique em "Iniciar conversa"')) {
                chatBox.innerHTML = '';
            }
            
            addMessageToChat('status', 'Status: Conectado ao servidor de chat.', 'status');
            setChatEnabled(true);
        });

        socket.on('disconnect', () => {
            console.log('Desconectado do servidor Socket.IO.');
            connectionStatus.textContent = 'OFFLINE';
            connectionStatus.className = 'status-offline';
            addMessageToChat('status', 'Você foi desconectado.', 'status');
            setChatEnabled(false);
        });

        // Intercepta falhas explícitas de handshake com o Render
        socket.on('connect_error', (error) => {
            console.error('Falha na tentativa de conexão:', error);
            connectionStatus.textContent = 'OFFLINE';
            connectionStatus.className = 'status-offline';
            addMessageToChat('erro', 'Não foi possível estabelecer conexão com o servidor de chat.', 'error');
            setChatEnabled(false);
        });

        socket.on('status_conexao', (data) => {
            if (data.session_id) {
                userSessionId = data.session_id;
            }
        });

        socket.on('nova_mensagem', (data) => {
            addMessageToChat(data.remetente, data.texto);
        });

        socket.on('erro', (data) => {
            addMessageToChat('erro', data.erro, 'error');
        });
    }

    // Função para encerrar a conversa atual
    function encerrarConversa() {
        if (socket && socket.connected) {
            socket.disconnect();
            setChatEnabled(false);
            addMessageToChat('status', 'Conversa encerrada pelo usuário.', 'status');
        }
    }

    // Função para limpar o feed de mensagens da tela
    function limparTela() {
        chatBox.innerHTML = ''; 
        addMessageToChat('status', 'Tela limpa.', 'status');
    }

    // Enviar mensagem do input para a API do backend
    function sendMessageToServer() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        if (socket && socket.connected) {
            addMessageToChat('user', messageText);
            socket.emit('enviar_mensagem', { mensagem: messageText });
            messageInput.value = '';
            messageInput.focus();
        } else {
            addMessageToChat('erro', 'Não conectado ao servidor.', 'error');
        }
    }

    // Event Listeners dos botões e teclado
    iniciarBtn.addEventListener('click', iniciarConversa);
    encerrarBtn.addEventListener('click', encerrarConversa);
    limparBtn.addEventListener('click', limparTela);
    sendButton.addEventListener('click', sendMessageToServer);

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessageToServer();
        }
    });
});