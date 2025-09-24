document.addEventListener('DOMContentLoaded', () => {
    
    const AdminInbox = {
        apiEndpoint: 'endpoint.php',
        elements: {},
        lastAdminHash: 0,
        currentUserId: null,
        chatList: [],
        notificationSound: null,
        messagePollingInterval: null,

        init: function(containerId) {
            this.createUI(containerId);
            this.cacheElements();
            this.addEventListeners();
            this.showView('livechat');
            this.keepAdminStatusAlive();
            this.startMainPolling();
            try { this.notificationSound = new Audio('assets/notification.mp3'); } catch (e) { console.error("Audio error.", e); }
        },

        createUI: function(containerId) {
            const container = document.getElementById(containerId); if (!container) return;
            container.innerHTML = `<div class="admin-inbox-container"><nav class="inbox-sidebar"><div class="sidebar-header">Chat Inbox</div><div class="sidebar-nav"><button class="nav-btn active" data-view="livechat">Live Conversations</button><button class="nav-btn" data-view="faq">FAQ Manager</button></div></nav><main class="inbox-main-content"><div id="livechat-view" class="inbox-view"><div class="chat-list-panel"><div class="panel-header">Conversations</div><div id="chat-list"></div></div><div class="chat-main-panel"><div id="chat-messages"></div><div id="reply-area"></div></div><div class="user-info-panel" id="user-info-panel"></div></div><div id="faq-view" class="inbox-view"><div class="faq-manager"><div class="faq-toolbar"><button id="faq-save-btn">Save FAQs</button><button id="faq-add-lang-btn">+ Add Language</button></div><div id="faq-editor-container"></div></div></div></main></div>`;
        },

        cacheElements: function() {
            this.elements = {
                navBtns: document.querySelectorAll('.nav-btn'), views: document.querySelectorAll('.inbox-view'),
                chatList: document.getElementById('chat-list'), chatMessages: document.getElementById('chat-messages'),
                replyArea: document.getElementById('reply-area'), userInfoPanel: document.getElementById('user-info-panel'),
                faqEditor: document.getElementById('faq-editor-container'), faqSaveBtn: document.getElementById('faq-save-btn'),
                faqAddLangBtn: document.getElementById('faq-add-lang-btn'),
            };
        },

        addEventListeners: function() {
            this.elements.navBtns.forEach(btn => btn.addEventListener('click', () => this.showView(btn.dataset.view)));
            this.elements.faqSaveBtn.addEventListener('click', () => this.faq_save());
            this.elements.faqAddLangBtn.addEventListener('click', () => this.faq_addLanguage());
        },

        showView: function(viewId) {
            this.elements.navBtns.forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
            this.elements.views.forEach(v => v.classList.toggle('active', v.id === `${viewId}-view`));
            if (viewId === 'faq') this.faq_load();
        },

        keepAdminStatusAlive: function() { this.api.updateAdminStatus(); setInterval(() => this.api.updateAdminStatus(), 20000); },
        
        startMainPolling: async function() { 
            try { 
                const update = await this.api.waitForAdminUpdates(this.lastAdminHash); 
                if (update && update.event === 'update') {
                    this.lastAdminHash = update.hash;
                    const totalUnreadNow = update.data.reduce((sum, chat) => sum + chat.unreadCount, 0);
                    const totalUnreadBefore = this.chatList.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
                    if (totalUnreadNow > totalUnreadBefore) {
                        this.notificationSound?.play().catch(e => {});
                    }
                    this.handleChatListUpdate(update.data); 
                } 
            } catch (e) { await new Promise(r => setTimeout(r, 5000)); } 
            this.startMainPolling(); 
        },

        handleChatListUpdate: function(newChatList) {
            this.chatList = newChatList; 
            this.elements.chatList.innerHTML = '';
            this.chatList.forEach(c => {
                const d = document.createElement('div');
                d.className = 'chat-list-item';
                d.dataset.userId = c.user_id;
                d.innerHTML = `<strong class="user-name">${c.name}</strong><br><small>${c.user_id.substring(0,12)}</small>`;
                if (c.unreadCount > 0) {
                    d.classList.add('has-unread');
                    d.innerHTML += `<div class="unread-dot"></div>`;
                }
                if (c.user_id === this.currentUserId) d.classList.add('active');
                d.addEventListener('click', () => this.selectChat(c.user_id));
                this.elements.chatList.appendChild(d);
            });
        },

        selectChat: async function(userId) {
            this.currentUserId = userId;
            await this.api.markAsSeen(userId);
            const updatedList = await this.api.getActiveChats();
            this.handleChatListUpdate(updatedList); 
            
            if (this.messagePollingInterval) clearInterval(this.messagePollingInterval);
            
            const data = await this.api.getMessages(userId);
            this.renderUserDetails(data.metadata);
            this.renderMessages(data.messages);
            this.renderReplyArea();
            this.messagePollingInterval = setInterval(() => this.refreshCurrentChatMessages(), 3000);
        },
        
        refreshCurrentChatMessages: async function() {
            if (!this.currentUserId) return;
            const data = await this.api.getMessages(this.currentUserId);
            if (this.elements.chatMessages.querySelectorAll('.message-container').length !== data.messages.length) {
                this.renderMessages(data.messages);
                // After rendering, mark new messages as seen again
                await this.api.markAsSeen(this.currentUserId);
            }
        },

        renderUserDetails: function(metadata) { 
            if (metadata) { this.elements.userInfoPanel.innerHTML = `<h4>User Details</h4><p><strong>Name:</strong> ${metadata.name}<br><strong>Email:</strong> ${metadata.email || 'N/A'}<br><strong>Mobile:</strong> ${metadata.mobile || 'N/A'}<br><strong>IP:</strong> ${metadata.userIp}<br><strong>Started:</strong> ${metadata.startedAt}</p><h4>Session Info</h4><p><strong>Page:</strong> ${metadata.chatPage}<br><strong>User Agent:</strong> ${metadata.userAgent}</p>`; }
        },
        
        renderMessages: function(messages) { 
            this.elements.chatMessages.innerHTML = '';
            let firstUnreadIndex = -1;
            if (messages) {
                firstUnreadIndex = messages.findIndex(m => m.sender === 'user' && m.seenByAdmin === false);
            }

            messages.forEach((msg, index) => {
                if (index === firstUnreadIndex) {
                    this.elements.chatMessages.innerHTML += `<div class="new-messages-divider"><span>New Messages</span></div>`;
                }
                const author = msg.author || (msg.sender === 'user' ? 'User' : 'Admin');
                const avatarInitials = author.substring(0, 2).toUpperCase();
                const time = new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const msgHtml = `<div class="message-container sender-${msg.sender}"><div class="message-avatar">${avatarInitials}</div><div class="message-content-wrapper"><div class="message-bubble">${msg.message}</div><div class="message-time">${time}</div></div></div>`;
                this.elements.chatMessages.insertAdjacentHTML('beforeend', msgHtml);
            }); 
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight; 
        },
        
        renderReplyArea: function() {
            this.elements.replyArea.innerHTML = `<textarea id="reply-input" placeholder="Write a reply..."></textarea><button id="emoji-btn">😀</button><button id="reply-btn">Reply</button><emoji-picker style="display:none;"></emoji-picker>`;
            const replyBtn = document.getElementById('reply-btn'), emojiBtn = document.getElementById('emoji-btn');
            const emojiPicker = document.querySelector('emoji-picker'), replyInput = document.getElementById('reply-input');
            replyBtn.addEventListener('click', () => this.sendReply());
            emojiBtn.addEventListener('click', () => { emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none'; });
            emojiPicker.addEventListener('emoji-click', e => { replyInput.value += e.detail.unicode; });
        },
        
        sendReply: async function() { 
            const input = document.getElementById('reply-input'); 
            const msg = input.value.trim(); 
            if (msg === '' || !this.currentUserId) return; 
            input.value = '';
            document.querySelector('emoji-picker').style.display = 'none';
            await this.api.postMessage(this.currentUserId, msg, 'admin', 'Admin'); 
            this.refreshCurrentChatMessages();
        },
        
        faq_load: async function() {
            this.elements.faqEditor.innerHTML = 'Loading...';
            const faqs = await this.api.getFaqs();
            this.faq_render(faqs);
        },
        faq_render: function(faqs) {
            let html = '<div class="faq-tree">';
            if (!faqs || Object.keys(faqs).length === 0) { html += '<p>No FAQs found.</p>'; } 
            else { for (const lang in faqs) { html += `<details class="faq-tree-lang" open><summary>${lang} <button class="delete-btn" onclick="AdminInbox.faq_delete(this)">[Delete Lang]</button></summary><div class="faq-lang-content">`; for (const cat in faqs[lang].categories) { html += `<details class="faq-tree-cat" open><summary>${cat} <button class="delete-btn" onclick="AdminInbox.faq_delete(this)">[Delete Cat]</button></summary><div class="faq-cat-content">`; faqs[lang].categories[cat].forEach((item) => { html += `<div class="faq-item"><label>Question</label><input type="text" value="${item.q.replace(/"/g, '&quot;')}"><label>Answer</label><textarea>${item.a}</textarea><button class="delete-btn" onclick="AdminInbox.faq_delete(this)">[Delete Q]</button></div>`; }); html += `<button class="add-btn" onclick="AdminInbox.faq_addQuestion(this)">+ Add Question</button></div></details>`; } html += `<button class="add-btn" onclick="AdminInbox.faq_addCategory(this)">+ Add Category</button></div></details>`; } }
            html += '</div>';
            this.elements.faqEditor.innerHTML = html;
        },
        faq_save: async function() {
            const newFaqs = {};
            document.querySelectorAll('.faq-tree-lang').forEach(langD => {
                const lang = langD.querySelector('summary').firstChild.textContent.trim();
                newFaqs[lang] = { title: "Select a category", categories: {} };
                langD.querySelectorAll('.faq-tree-cat').forEach(catD => {
                    const cat = catD.querySelector('summary').firstChild.textContent.trim();
                    newFaqs[lang].categories[cat] = [];
                    catD.querySelectorAll('.faq-item').forEach(i => {
                        const q = i.querySelector('input').value.trim();
                        const a = i.querySelector('textarea').value.trim();
                        if (q && a) newFaqs[lang].categories[cat].push({ q, a });
                    });
                });
            });
            await this.api.saveFaqs(newFaqs);
            alert('FAQs saved!');
        },
        faq_addLanguage: function() { const lang = prompt("Enter new language name:"); if (!lang) return; const tree = this.elements.faqEditor.querySelector('.faq-tree'); const newL = document.createElement('details'); newL.className = 'faq-tree-lang'; newL.open = true; newL.innerHTML = `<summary>${lang} <button class="delete-btn" onclick="AdminInbox.faq_delete(this)">[Del]</button></summary><div class="faq-lang-content"><button class="add-btn" onclick="AdminInbox.faq_addCategory(this)">+ Add Category</button></div>`; tree.appendChild(newL); },
        faq_addCategory: function(btn) { const catName = prompt("Enter new category name:"); if (!catName) return; const langContent = btn.parentElement; const newC = document.createElement('details'); newC.className = 'faq-tree-cat'; newC.open = true; newC.innerHTML = `<summary>${catName} <button class="delete-btn" onclick="AdminInbox.faq_delete(this)">[Del]</button></summary><div class="faq-cat-content"><button class="add-btn" onclick="AdminInbox.faq_addQuestion(this)">+ Add Question</button></div>`; langContent.insertBefore(newC, btn); },
        faq_addQuestion: function(btn) { const catContent = btn.parentElement; const newI = document.createElement('div'); newI.className = 'faq-item'; newI.innerHTML = `<label>Question</label><input type="text" value=""><label>Answer</label><textarea></textarea><button class="delete-btn" onclick="AdminInbox.faq_delete(this)">[Del]</button>`; catContent.insertBefore(newI, btn); },
        faq_delete: function(btn) { if (!confirm('Are you sure?')) return; btn.parentElement.parentElement.remove(); },

        api: {
            updateAdminStatus: async () => fetch(`endpoint.php?action=updateAdminStatus`),
            waitForAdminUpdates: async (h) => (await fetch(`endpoint.php?action=waitForAdminUpdates&hash=${h}&t=${new Date().getTime()}`)).json(),
            getActiveChats: async () => (await fetch(`endpoint.php?action=getActiveChats`)).json(),
            getMessages: async (uid) => (await fetch(`endpoint.php?action=getMessages&userId=${uid}`)).json(),
            markAsSeen: async (uid) => { const f=new FormData(); f.append('action','markAsSeen'); f.append('userId',uid); await fetch(`endpoint.php`,{method:'POST',body:f}); },
            getFaqs: async () => (await fetch(`endpoint.php?action=getFaqs`)).json(),
            saveFaqs: async (d) => (await fetch(`endpoint.php?action=saveFaqs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })),
            postMessage: async (uid, msg, s, a) => { const f=new FormData(); f.append('action','postMessage'); f.append('userId',uid); f.append('message',msg); f.append('sender',s); f.append('author',a); await fetch(`endpoint.php`,{method:'POST',body:f}); }
        }
    };

    window.AdminInbox = AdminInbox;
    AdminInbox.init('admin-inbox-app');
});