import express from 'express';
import cors from 'cors';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import dotenv from 'dotenv';
import { Readable } from 'stream';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const apiId = parseInt(process.env.API_ID || '0', 10);
const apiHash = process.env.API_HASH || '';
const port = parseInt(process.env.PORT || '8899', 10);

if (!apiId || !apiHash) {
  console.error("API_ID and API_HASH must be configured in environment variables.");
  process.exit(1);
}

// Map to store active Telegram clients per bot token or session string
const clients = new Map();

async function getClient(botTokenOrSession) {
  if (clients.has(botTokenOrSession)) {
    return clients.get(botTokenOrSession);
  }

  const isSessionString = botTokenOrSession.length > 50; // Simple heuristic to check if it's a string session
  const session = new StringSession(isSessionString ? botTokenOrSession : '');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  if (isSessionString) {
    await client.connect();
  } else {
    // Treat as bot token
    await client.start({
      botAuthToken: () => Promise.resolve(botTokenOrSession),
    });
  }

  clients.set(botTokenOrSession, client);
  return client;
}

// Upload file to Telegram
app.post('/upload', async (req, res) => {
  const auth = req.headers['authorization'] || '';
  const botTokenOrSession = auth.replace('Bearer ', '').trim();
  const channelId = req.headers['x-channel-id'];
  const fileName = req.headers['x-file-name'] || 'file';

  if (!botTokenOrSession || !channelId) {
    return res.status(400).json({ error: 'Missing authorization token or target channel ID' });
  }

  try {
    const client = await getClient(botTokenOrSession);
    
    // We parse the stream and upload it directly to Telegram
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', async () => {
      try {
        const fileBuffer = Buffer.concat(chunks);
        
        // Upload the file buffer to Telegram
        const file = await client.uploadFile({
          file: fileBuffer,
          workers: 3,
          fileName: fileName,
        });

        // Send the file as a message in the channel
        const message = await client.sendMessage(channelId, {
          file: file,
          message: `Uploaded: ${fileName}`,
        });

        const media = message.media;
        let fileId = '';
        if (media instanceof Api.MessageMediaDocument) {
          fileId = media.document.id.toString();
        } else if (media instanceof Api.MessageMediaPhoto) {
          fileId = media.photo.id.toString();
        }

        res.json({
          success: true,
          messageId: message.id,
          fileId: fileId,
          channelId: channelId
        });
      } catch (err) {
        console.error('File upload logic error:', err);
        res.status(500).json({ error: err.message });
      }
    });

  } catch (err) {
    console.error('Telegram client init failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Download file from Telegram
app.get('/download/:channelId/:messageId', async (req, res) => {
  const auth = req.query.auth || req.headers['authorization'] || '';
  const botTokenOrSession = auth.replace('Bearer ', '').trim();
  const { channelId, messageId } = req.params;

  if (!botTokenOrSession || !channelId || !messageId) {
    return res.status(400).json({ error: 'Missing parameters or authorization token' });
  }

  try {
    const client = await getClient(botTokenOrSession);
    const msgId = parseInt(messageId, 10);
    
    // Retrieve the message with the media attachment
    const messages = await client.getMessages(channelId, { ids: [msgId] });
    if (!messages || messages.length === 0 || !messages[0].media) {
      return res.status(404).json({ error: 'Message or media not found' });
    }

    const message = messages[0];
    let media = message.media;
    let fileName = 'downloaded_file';
    let mimeType = 'application/octet-stream';
    let size = 0;

    if (media instanceof Api.MessageMediaDocument && media.document) {
      size = media.document.size.toNumber();
      mimeType = media.document.mimeType;
      const docAttr = media.document.attributes.find(attr => attr instanceof Api.DocumentAttributeFilename);
      if (docAttr) {
        fileName = docAttr.fileName;
      }
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    if (size > 0) {
      res.setHeader('Content-Length', size);
    }

    // Stream download directly from Telegram
    const buffer = await client.downloadMedia(message, {
      workers: 3,
    });
    
    res.send(buffer);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete message from Telegram
app.delete('/delete/:channelId/:messageId', async (req, res) => {
  const auth = req.headers['authorization'] || '';
  const botTokenOrSession = auth.replace('Bearer ', '').trim();
  const { channelId, messageId } = req.params;

  if (!botTokenOrSession || !channelId || !messageId) {
    return res.status(400).json({ error: 'Missing parameters or authorization token' });
  }

  try {
    const client = await getClient(botTokenOrSession);
    const msgId = parseInt(messageId, 10);
    
    await client.deleteMessages(channelId, [msgId], {
      revoke: true,
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Telegram helper listening at http://0.0.0.0:${port}`);
});
