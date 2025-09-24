# admin-to-user-system

A self-hosted, file-based live chat solution built with PHP and Vanilla JavaScript. No database required.

---

## 🚀 Features

* **Live Chat & Admin Panel:** Real-time chat with an admin inbox to manage multiple conversations.
* **No Database Needed:** Lightweight and easy to deploy; all data is stored in JSON files, so no database setup is required.
* **FAQ Manager:** Built-in tool to create and manage a multi-language FAQ database directly from the admin panel.
* **Offline Mode:** Automatically switches to an interactive FAQ bot when no admins are online, ensuring users still get help.
* **Easy Integration:** Add the chat widget to any website page with a single line of code.
* **Configurable Bot Flow:** Set up a simple, automated chat flow to guide users through initial questions.

## ✅ Requirements

* A web server (like Apache or Nginx)
* PHP version 7.2 or higher
* No database is needed.

## 🛠️ Installation Guide

Follow these steps to set up the chat system on your website.

### Step 1: Get the Project Files

Download the project files and place them on your web server.

```bash
# You can clone the repository directly to your server
git clone [https://github.com/MadhushaMG/admin-to-user-system.git](https://github.com/MadhushaMG/admin-to-user-system.git)
```
Or you can download the ZIP file from GitHub, unzip it, and upload the contents to your server.

### Step 2: Upload to Your Server

Upload the `chat-component` directory to the root folder of your website. Your file structure should look like this:

```
/ (your website root)
├── index.html
├── about.html
├── css/
└── chat-component/  <-- The entire folder goes here
```

### Step 3: Set Folder Permissions

For the chat system to save messages and operate correctly, the `data` directory must be writable by the server. This is the most important step.

Connect to your server via a terminal or use your hosting panel's File Manager and set the permissions of the `chat-component/data` folder to `775`.

```bash
# Connect to your server via SSH and run this command
chmod -R 775 /path/to/your/website/chat-component/data
```
*This command makes the `data` folder and everything inside it writable by the server.*

The installation is now complete!

## 💡 How to Use

### 1. Add the Chat Widget to Your Website

To make the chat widget appear on your web pages, add the following line of code right before the closing `</body>` tag in your HTML file(s).

```html
<script src="chat-component/assets/widget.js"></script>
```

**Example `index.html`:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Awesome Website</title>
</head>
<body>

    <h1>Welcome to my page!</h1>
    <p>The chat widget will appear at the bottom right.</p>

    <script src="chat-component/assets/widget.js"></script>
</body>
</html>
```

### 2. Access the Admin Panel

To view messages and chat with your website visitors, you (the admin) need to access the admin panel.

Simply go to this URL in your browser:
**`http://yourwebsite.com/chat-component/admin.php`**

From there, you can see all active conversations, reply to messages, and manage the FAQs in the "FAQ Manager" tab.
