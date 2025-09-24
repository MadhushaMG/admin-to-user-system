<?php

class ChatSystem
{
    private const DATA_DIR = __DIR__ . '/../data/';
    private const ADMIN_STATUS_FILE = __DIR__ . '/../data/admin_status.json';
    private const FAQ_FILE = __DIR__ . '/../data/faq.json'; 
    private const BOT_FILE = __DIR__ . '/../data/bot.json';

    public function __construct(){
        if(!file_exists(self::DATA_DIR)){mkdir(self::DATA_DIR,0777,true);}
        if(!is_writable(self::DATA_DIR)){
            header('Content-Type: application/json');
            http_response_code(500);
            die(json_encode(['status'=>'error','message'=>'Server Error: Data directory is not writable.']));
        }
    }

    public function initSession(): void {
        if (session_status() === PHP_SESSION_NONE) { 
            session_start(); 
        } 
    }

    public function getCurrentUserId(): string { 
        $this->initSession(); 
        return session_id(); 
    }

    public function postMessage(string $userId, string $message, string $sender = 'user', array $authorDetails = []): bool
    {
        $chatFile = self::DATA_DIR . 'chat_' . $userId . '.json';
        $chatData = [];

        if (file_exists($chatFile)) {
            $chatData = json_decode(file_get_contents($chatFile), true);
        } else {
            $chatData['metadata'] = [
                'userId' => $userId, 
                'name' => htmlspecialchars($authorDetails['name'] ?? 'Guest'),
                'email' => htmlspecialchars($authorDetails['email'] ?? 'N/A'), 
                'mobile' => htmlspecialchars($authorDetails['mobile'] ?? 'N/A'),
                'startedAt' => date('Y-m-d H:i:s'), 
                'userIp' => $_SERVER['REMOTE_ADDR'] ?? 'N/A',
                'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'N/A', 
                'chatPage' => $_SERVER['HTTP_REFERER'] ?? 'N/A'
            ];
            $chatData['messages'] = [];
        }

        $newMessage = [
            'id' => uniqid(), 
            'sender' => $sender,
            'author' => htmlspecialchars($authorDetails['name'] ?? ($sender === 'user' ? ($chatData['metadata']['name'] ?? 'Guest') : 'Admin')),
            'message' => htmlspecialchars($message), 
            'timestamp' => time(),
            'seenByAdmin' => false
        ];
        $chatData['messages'][] = $newMessage;
        return file_put_contents($chatFile, json_encode($chatData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX) !== false;
    }

    public function getMessages(string $userId): array {
        $chatFile = self::DATA_DIR . 'chat_' . $userId . '.json';
        if (file_exists($chatFile)) {
            $chatData = json_decode(file_get_contents($chatFile), true);
            return $chatData ?? ['metadata' => [], 'messages' => []];
        }
        return ['metadata' => [], 'messages' => []];
    }
    
    public function getActiveChats(): array {
        $chatFiles = glob(self::DATA_DIR . 'chat_*.json'); 
        $chats = [];
        foreach ($chatFiles as $file) {
            $chatData = json_decode(file_get_contents($file), true);
            $unreadCount = 0;
            if (isset($chatData['messages'])) {
                foreach ($chatData['messages'] as $message) {
                    if ($message['sender'] === 'user' && empty($message['seenByAdmin'])) {
                        $unreadCount++;
                    }
                }
            }
            if (isset($chatData['metadata'])) {
                $chats[] = [
                    'user_id' => $chatData['metadata']['userId'] ?? basename($file),
                    'name' => $chatData['metadata']['name'] ?? 'Guest',
                    'last_modified' => filemtime($file),
                    'unreadCount' => $unreadCount
                ];
            }
        }
        usort($chats, fn($a, $b) => $b['last_modified'] <=> $a['last_modified']);
        return $chats;
    }
    
    public function markMessagesAsSeen(string $userId): bool {
        $chatFile = self::DATA_DIR . 'chat_' . $userId . '.json';
        if (!file_exists($chatFile)) return false;

        $chatData = json_decode(file_get_contents($chatFile), true);
        $updated = false;
        if (isset($chatData['messages'])) {
            foreach ($chatData['messages'] as $key => $message) {
                if ($message['sender'] === 'user' && empty($message['seenByAdmin'])) {
                    $chatData['messages'][$key]['seenByAdmin'] = true;
                    $updated = true;
                }
            }
        }
        if ($updated) {
            return file_put_contents($chatFile, json_encode($chatData, JSON_PRETTY_PRINT), LOCK_EX) !== false;
        }
        return true;
    }

    public function waitForUpdates(string $userId, int $lastCheckTimestamp): array { 
        $chatFile = self::DATA_DIR . 'chat_' . $userId . '.json'; 
        $timeout = 25; $startTime = time(); 
        while (time() - $startTime < $timeout) { 
            clearstatcache(); 
            $modifiedTime = file_exists($chatFile) ? filemtime($chatFile) : $lastCheckTimestamp; 
            if ($modifiedTime > $lastCheckTimestamp) { 
                $data = $this->getMessages($userId); 
                return $data['messages'] ?? []; 
            } 
            sleep(1); 
        } 
        return []; 
    }
    
    public function updateAdminStatus(): void { 
        $statusData = ['status' => 'online', 'last_active' => time()]; 
        file_put_contents(self::ADMIN_STATUS_FILE, json_encode($statusData), LOCK_EX); 
    }

    public function waitForAdminUpdates(int $lastKnownStateHash): array { 
        $timeout = 25; $startTime = time(); 
        while (time() - $startTime < $timeout) { 
            clearstatcache(); 
            $files = glob(self::DATA_DIR . 'chat_*.json'); 
            $currentState = ''; 
            foreach ($files as $file) { 
                $currentState .= basename($file) . filemtime($file); 
            } 
            $currentStateHash = crc32($currentState); 
            if ($currentStateHash !== $lastKnownStateHash) { 
                return ['event' => 'update', 'data' => $this->getActiveChats(), 'hash' => $currentStateHash]; 
            } 
            sleep(1); 
        } 
        return ['event' => 'timeout', 'hash' => $lastKnownStateHash]; 
    }
    
    public function getFaqs(): array { 
        if (file_exists(self::FAQ_FILE)) { 
            return json_decode(file_get_contents(self::FAQ_FILE), true) ?? []; 
        } 
        return []; 
    }
    
    public function saveFaqs(array $faqData): bool { 
        return file_put_contents(self::FAQ_FILE, json_encode($faqData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX) !== false; 
    }
    
    public function getBotFlow(): array { 
        if (file_exists(self::BOT_FILE)) { 
            return json_decode(file_get_contents(self::BOT_FILE), true) ?? []; 
        } 
        return []; 
    }
    
    public function getAdminStatus(): array { 
        $response = ['status' => 'offline']; 
        if (file_exists(self::ADMIN_STATUS_FILE)) { 
            $statusData = json_decode(file_get_contents(self::ADMIN_STATUS_FILE), true); 
            if (isset($statusData['last_active']) && (time() - $statusData['last_active']) < 60) { 
                $response['status'] = 'online'; 
            } 
        } 
        return $response; 
    }
}