<?php
set_time_limit(40);
header('Content-Type: application/json');
require_once __DIR__ . '/src/ChatSystem.php';

$chatSystem = new ChatSystem();
$action = $_REQUEST['action'] ?? '';

switch ($action) {
    case 'initSession':
        $userId = $chatSystem->getCurrentUserId();
        echo json_encode(['status' => 'success', 'userId' => $userId]);
        break;

    case 'postMessage':
        $details = [
            'name' => $_POST['name'] ?? 'Guest',
            'email' => $_POST['email'] ?? '',
            'mobile' => $_POST['mobile'] ?? ''
        ];
        $message = $_POST['message'] ?? '';
        $userId = $_POST['userId'] ?? $chatSystem->getCurrentUserId();
        $sender = $_POST['sender'] ?? 'user';
        if (!empty($message)) {
            $result = $chatSystem->postMessage($userId, $message, $sender, $details);
            if ($result) { echo json_encode(['status' => 'success']); } 
            else { echo json_encode(['status' => 'error', 'message' => 'Failed to save message.']); }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Message cannot be empty.']);
        }
        break;

    case 'markAsSeen':
        $userId = $_POST['userId'] ?? '';
        if (!empty($userId)) {
            $chatSystem->markMessagesAsSeen($userId);
            echo json_encode(['status' => 'success']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'User ID not provided.']);
        }
        break;

    case 'getMessages':
        $userId = $_GET['userId'] ?? $chatSystem->getCurrentUserId();
        $data = $chatSystem->getMessages($userId);
        echo json_encode($data);
        break;

    case 'getActiveChats':
        $chats = $chatSystem->getActiveChats();
        echo json_encode($chats);
        break;

    case 'waitForUpdates':
        $userId = $chatSystem->getCurrentUserId();
        $lastCheckTimestamp = (int)($_GET['lastCheckTimestamp'] ?? 0);
        session_write_close();
        $messages = $chatSystem->waitForUpdates($userId, $lastCheckTimestamp);
        $chatFile = __DIR__ . '/data/chat_' . $userId . '.json';
        clearstatcache();
        $newTimestamp = file_exists($chatFile) ? filemtime($chatFile) : $lastCheckTimestamp;
        echo json_encode(['messages' => $messages, 'timestamp' => $newTimestamp]);
        break;

    case 'updateAdminStatus':
        $chatSystem->updateAdminStatus();
        echo json_encode(['status' => 'success']);
        break;

    case 'waitForAdminUpdates':
        $lastHash = (int)($_GET['hash'] ?? 0);
        session_write_close();
        $update = $chatSystem->waitForAdminUpdates($lastHash);
        echo json_encode($update);
        break;

    case 'getAdminStatus':
        echo json_encode($chatSystem->getAdminStatus());
        break;

    case 'getFaqs':
        echo json_encode($chatSystem->getFaqs());
        break;

    case 'saveFaqs':
        $jsonPayload = file_get_contents('php://input');
        $faqData = json_decode($jsonPayload, true);
        if (is_array($faqData)) {
            $result = $chatSystem->saveFaqs($faqData);
            if ($result) { echo json_encode(['status' => 'success']); }
            else { echo json_encode(['status' => 'error', 'message' => 'Failed to save FAQs.']); }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid data provided.']);
        }
        break;
        
    case 'getBotFlow':
        echo json_encode($chatSystem->getBotFlow());
        break;

    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid action specified.']);
        break;
}