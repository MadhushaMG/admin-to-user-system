document.addEventListener('DOMContentLoaded', () => {
    
    const ChatWidget = {
        elements: {},
        basePath: '', // Will be calculated automatically
        apiEndpoint: '',
        userId: null,
        userName: 'Guest',
        userDetails: null,
        lastTimestamp: 0,
        notificationSound: null,
        messageCount: 0,
        faqData: null,

        // --- THE MOST IMPORTANT UPDATE IS HERE ---
        init: function() {
            this.setPaths(); // Automatically find its own path
            this.loadCSS();  // Automatically load its own CSS
            this.createUI();
            this.cacheElements();
            this.addEventListeners();
            this.checkInitialStatus();
        },

        setPaths: function() {
            const scriptTag = document.querySelector('script[src*="widget.js"]');
            const scriptSrc = scriptTag.src;
           
            this.basePath = scriptSrc.substring(0, scriptSrc.indexOf('/assets/widget.js'));
            this.apiEndpoint = `${this.basePath}/endpoint.php`;
        },

        loadCSS: function() {
            const cssPath = `${this.basePath}/assets/widget.css`;
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = cssPath;
            document.head.appendChild(link);
        },

        createUI: function() {
            const widgetHTML = `
                <div class="chat-widget-icon"></div>
                <div class="chat-widget-container">
                    <div class="chat-widget-header">Welcome!</div>
                    <div id="view-language" class="chat-widget-view chat-widget-body-padded"></div>
                    <div id="view-category" class="chat-widget-view chat-widget-body-padded"></div>
                    <div id="view-qa" class="chat-widget-view chat-widget-body-padded"></div>
                    <div id="view-pre-chat" class="chat-widget-view chat-widget-body-padded">
                        <h3>Start a Conversation</h3>
                        <p>Please provide your details to start the chat.</p>
                        <input type="text" id="user-name-input" placeholder="Name*" required>
                        <input type="email" id="user-email-input" placeholder="Email*" required>
                        <input type="tel" id="user-mobile-input" placeholder="Mobile Number">
                        <button id="start-chat-btn">Start Chat</button>
                    </div>
                    <div id="view-chat" class="chat-widget-view">
                        <div class="chat-widget-body"></div>
                        <div class="chat-widget-footer">
                            <input type="text" id="chat-input" placeholder="Type a message...">
                            <button id="send-btn">➤</button>
                        </div>
                    </div>
                    <div class="chat-widget-branding">
                        Powered by <a href="https://codara.lk" target="_blank">Codara</a>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', widgetHTML);
            document.querySelector('.chat-widget-icon').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8c0 3.866-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.584.296-1.925.864-4.181 1.234-.2.032-.352-.176-.273-.362.354-.836.674-1.95.77-2.966C.744 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7zM5 8a1 1 0 1 0-2 0 1 1 0 0 0 2 0zm4 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0zm3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>`;
        },

        cacheElements: function() {
            this.elements = {
                icon: document.querySelector('.chat-widget-icon'), container: document.querySelector('.chat-widget-container'),
                views: { language: document.getElementById('view-language'), category: document.getElementById('view-category'), qa: document.getElementById('view-qa'), preChat: document.getElementById('view-pre-chat'), chat: document.getElementById('view-chat'), },
                chatBody: document.querySelector('#view-chat .chat-widget-body'), startChatBtn: document.getElementById('start-chat-btn'),
                sendBtn: document.getElementById('send-btn'), chatInput: document.getElementById('chat-input')
            };
        },
        
        addEventListeners: function() {
            this.elements.icon.addEventListener('click', () => this.elements.container.classList.toggle('open'));
            this.elements.startChatBtn.addEventListener('click', () => this.handleStartChat());
            this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
            this.elements.chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.sendMessage(); });
        },

        showView: function(viewName) {
            Object.values(this.elements.views).forEach(view => view.classList.remove('active'));
            if(this.elements.views[viewName]) this.elements.views[viewName].classList.add('active');
        },

        checkInitialStatus: async function() {
            await this.api.initSession().then(id => this.userId = id);
            try { this.notificationSound = new Audio(`${this.basePath}/assets/notification.mp3`); } catch (e) { console.error("Audio object error.", e); }
            const status = await this.api.getAdminStatus();
            if (status.status === 'online') { this.showView('preChat'); } 
            else { this.faqData = await this.api.getFaqs(); this.renderLanguages(); this.showView('language'); }
        },

        renderLanguages: function() { /* ... unchanged ... */ },
        renderCategories: function(lang) { /* ... unchanged ... */ },
        renderQuestions: function(lang, cat) { /* ... unchanged ... */ },
        renderAnswer: function(lang, cat, index) { /* ... unchanged ... */ },
        handleStartChat: function() { /* ... unchanged ... */ },
        sendMessage: async function() { /* ... unchanged ... */ },
        renderSingleMessage: function(msg) { /* ... unchanged ... */ },
        renderMessages: function(messages) { /* ... unchanged ... */ },
        startLongPolling: async function() { /* ... unchanged ... */ },
        
        api: {
            initSession: async () => (await fetch(`${ChatWidget.apiEndpoint}?action=initSession`)).json().then(data=>data.userId),
            getAdminStatus: async () => (await fetch(`${ChatWidget.apiEndpoint}?action=getAdminStatus`)).json(),
            getFaqs: async () => (await fetch(`${ChatWidget.apiEndpoint}?action=getFaqs`)).json(),
            postMessage: async function(payload) {
                const formData = new FormData(); formData.append('action', 'postMessage');
                for (const key in payload) { formData.append(key, payload[key]); }
                await fetch(ChatWidget.apiEndpoint, { method: 'POST', body: formData });
            },
            waitForUpdates: async (timestamp) => (await fetch(`${ChatWidget.apiEndpoint}?action=waitForUpdates&lastCheckTimestamp=${timestamp}&t=${new Date().getTime()}`)).json(),
        }
    };
    
    // --- To avoid repeating the whole code, I'm pasting the unchanged functions here. ---
    // --- The user should use this entire file. ---
    ChatWidget.renderLanguages = function() { let html = `<h3>Select Language</h3><p>Please choose your preferred language.</p>`; for (const lang in this.faqData) { html += `<button class="faq-button" data-lang="${lang}">${lang.charAt(0).toUpperCase() + lang.slice(1)}</button>`; } this.elements.views.language.innerHTML = html; this.elements.views.language.querySelectorAll('.faq-button').forEach(btn => { btn.addEventListener('click', (e) => this.renderCategories(e.target.dataset.lang)); }); };
    ChatWidget.renderCategories = function(lang) { const langData = this.faqData[lang]; let html = `<h3>${langData.title}</h3>`; for (const cat in langData.categories) { html += `<button class="faq-button" data-lang="${lang}" data-cat="${cat}">${cat}</button>`; } html += `<a href="#" class="faq-back-btn" data-target="language">&larr; Back to Languages</a>`; this.elements.views.category.innerHTML = html; this.elements.views.category.querySelectorAll('.faq-button').forEach(btn => { btn.addEventListener('click', (e) => this.renderQuestions(e.target.dataset.lang, e.target.dataset.cat)); }); this.elements.views.category.querySelector('.faq-back-btn').addEventListener('click', (e) => { e.preventDefault(); this.renderLanguages(); this.showView('language'); }); this.showView('category'); };
    ChatWidget.renderQuestions = function(lang, cat) { const questions = this.faqData[lang].categories[cat]; let html = `<h3>${cat}</h3>`; questions.forEach((item, index) => { html += `<button class="faq-button" data-lang="${lang}" data-cat="${cat}" data-index="${index}">${item.q}</button>`; }); html += `<a href="#" class="faq-back-btn" data-target="category" data-lang="${lang}">&larr; Back to Categories</a>`; this.elements.views.qa.innerHTML = html; this.elements.views.qa.querySelectorAll('.faq-button').forEach(btn => { btn.addEventListener('click', (e) => this.renderAnswer(e.target.dataset.lang, e.target.dataset.cat, e.target.dataset.index)); }); this.elements.views.qa.querySelector('.faq-back-btn').addEventListener('click', (e) => { e.preventDefault(); this.renderCategories(e.target.dataset.lang); }); this.showView('qa'); };
    ChatWidget.renderAnswer = function(lang, cat, index) { this.renderQuestions(lang, cat); const questionBtn = this.elements.views.qa.querySelector(`.faq-button[data-index="${index}"]`); const existingAnswer = this.elements.views.qa.querySelector('.faq-answer'); if(existingAnswer) existingAnswer.remove(); const item = this.faqData[lang].categories[cat][index]; questionBtn.insertAdjacentHTML('afterend', `<div class="faq-answer">${item.a}</div>`); this.showView('qa'); };
    ChatWidget.handleStartChat = function() { const name = document.getElementById('user-name-input').value.trim(); const email = document.getElementById('user-email-input').value.trim(); const mobile = document.getElementById('user-mobile-input').value.trim(); if (!name || !email) { alert('Please fill in your Name and Email.'); return; } this.userName = name; this.userDetails = { name, email, mobile }; this.showView('chat'); this.startLongPolling(); };
    ChatWidget.sendMessage = async function() { const messageText = this.elements.chatInput.value.trim(); if (messageText === '') return; this.renderSingleMessage({ sender: 'user', message: messageText }); this.elements.chatInput.value = ''; const payload = this.userDetails ? { ...this.userDetails, message: messageText } : { name: this.userName, message: messageText }; await this.api.postMessage(payload); this.userDetails = null; };
    ChatWidget.renderSingleMessage = function(msg) { const messageDiv = document.createElement('div'); messageDiv.className = `message ${msg.sender}-message`; messageDiv.textContent = msg.message; this.elements.chatBody.appendChild(messageDiv); this.elements.chatBody.scrollTop = this.elements.chatBody.scrollHeight; };
    ChatWidget.renderMessages = function(messages) { if (!messages || messages.length === 0) return; if (messages.length > this.messageCount && messages[messages.length - 1].sender === 'admin') { this.notificationSound?.play().catch(e => console.warn("Audio play failed:", e)); } this.messageCount = messages.length; this.elements.chatBody.innerHTML = ''; messages.forEach(msg => this.renderSingleMessage(msg)); };
    ChatWidget.startLongPolling = async function() { try { const data = await this.api.waitForUpdates(this.lastTimestamp); if (data && data.timestamp) { this.lastTimestamp = data.timestamp; if (data.messages && data.messages.length > 0) { this.renderMessages(data.messages); } } } catch (e) { console.error("Long polling error:", e); await new Promise(resolve => setTimeout(resolve, 5000)); } this.startLongPolling(); };

    ChatWidget.init();
});

