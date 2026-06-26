import fs from 'fs';
import path from 'path';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;

/**
 * ====================================================================================
 * WHATSAPP MESSAGING GATEWAY & INTEGRATION SERVICE
 * ====================================================================================
 * 
 * This file serves as the centralized entry point and gateway for all WhatsApp outgoing
 * notifications, including:
 *   1. New Invoice PDFs with pricing & item details (Type: 'INVOICE')
 *   2. Ready for Pickup status notifications (Type: 'STATUS_READY')
 *   3. Delivered & Completed status notifications (Type: 'STATUS_DELIVERED')
 * 
 * ------------------------------------------------------------------------------------
 * TEMPORARY WHATSAPP WEB FEATURE INTEGRATION TOUCHPOINTS (FOR EASY FUTURE REMOVAL):
 * ------------------------------------------------------------------------------------
 * If you need to remove this temporary whatsapp-web.js client and replace it with the
 * official Meta Cloud API, refer to the following locations where code was added/modified:
 * 
 * 1. SERVICES GATEWAY (This File):
 *    - File: backend/services/whatsapp.js
 *    - Modifications:
 *      * Line 4: Added `import QRCode from 'qrcode';`
 *      * Line 66: Changed `USE_MOCK_GATEWAY = false` by default.
 *      * Lines 107-210: Created client initialization state tracking, event handlers,
 *        `getWhatsAppState()`, and `logoutWhatsApp()`.
 * 
 * 2. ENDPOINTS & ROUTING:
 *    - File: backend/controllers/whatsappController.js [NEW FILE]
 *      * Function `getWhatsAppStatus(req, res)`: Exposes current state.
 *      * Function `logoutWhatsAppDevice(req, res)`: Manually disconnects session.
 *    - File: backend/routes/shopRoutes.js
 *      * Line 34: Added imports for `getWhatsAppStatus` and `logoutWhatsAppDevice`.
 *      * Line 74: Registered `router.get('/whatsapp/status', getWhatsAppStatus);`
 *      * Line 75: Registered `router.post('/whatsapp/logout', logoutWhatsAppDevice);`
 * 
 * 3. FRONTEND UI:
 *    - File: frontend/src/components/Profile.jsx
 *      * Added `import { MessageSquare, RefreshCw } from 'lucide-react';`
 *      * Added states: `whatsappStatus`, `whatsappQr`, `whatsappError`, `whatsappLoading`, `pollingInterval`.
 *      * Created `checkWhatsAppStatus()` and `handleWhatsAppLogout()`.
 *      * Rendered "WhatsApp Web Integration" connection card in the profile page UI.
 * 
 * ------------------------------------------------------------------------------------
 * HOW INFORMATION LANDS HERE:
 * ------------------------------------------------------------------------------------
 * Whenever an order is created or updated in the backend (primarily inside the
 * `orderController.js`), a call is triggered to `sendWhatsAppPDF` or `sendWhatsAppMessage`.
 * 
 * The following rich metadata is passed to these functions:
 * 
 * 1. `to` (String): The recipient's mobile number.
 * 2. `pdfBuffer` (Buffer): The compiled binary invoice PDF.
 * 3. `filename` (String): The proposed invoice PDF file name (e.g. "ShopName_Bill_26-0001.pdf").
 * 4. `caption` / `body` (String): The pre-formatted text message body.
 * 5. `metadata` (Object): A rich payload containing:
 *    - `type` (String): 'INVOICE', 'STATUS_READY', or 'STATUS_DELIVERED'.
 *    - `customerName` (String): Customer's full name.
 *    - `order` (Object): The complete Prisma database record of the Order containing:
 *        * `id` (BigInt/Int): Unique 6-digit Order ID.
 *        * `bill_number` (String): E.g. "26-0001-2" (year-sequence-suffix).
 *        * `mobile_number` (String): Recipient mobile number.
 *        * `total_amount` (Decimal): Total price of order.
 *        * `advance_amount` (Decimal): Advance paid by customer.
 *        * `balance_amount` (Decimal): Outstanding balance.
 *        * `status` (String): 'Undelivered', 'Ready', or 'Delivered'.
 *        * `items` (Array): Detailed item configs with `cloth_type`, `quantity`, `price_per_cloth`.
 *        * `owner` (Object): Shop owner credentials & brand info (`shop_name`, `email`, `contact_number`).
 * 
 * ====================================================================================
 */

// GATEWAY CONFIGURATION
const USE_MOCK_GATEWAY = process.env.USE_MOCK_GATEWAY === 'true' ? true : false; // Set to false to enable real WhatsApp transmissions

// Log file configuration
const STATUS_LOG_PATH = path.join(process.cwd(), 'whatsapp_status.log');

/**
 * Appends log status entries to whatsapp_status.log
 * @param {string} type - Notification Type (INVOICE, STATUS_READY, STATUS_DELIVERED, etc.)
 * @param {string} mobile - Recipient mobile number
 * @param {string} status - Transmission status (SUCCESS, MOCK_SENT, FAILED)
 * @param {object} details - Relevant payload snippets
 */
const logWhatsAppStatus = (type, mobile, status, details = {}) => {
    try {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type,
            mobile,
            status,
            orderId: details.orderId || 'N/A',
            billNumber: details.billNumber || 'N/A',
            customerName: details.customerName || 'N/A',
            shopName: details.shopName || 'N/A',
            filename: details.filename || 'N/A',
            messageSnippet: details.body ? (details.body.substring(0, 80).replace(/\n/g, ' ') + '...') : 'N/A',
            error: details.error || null
        };
        
        fs.appendFileSync(STATUS_LOG_PATH, JSON.stringify(logEntry) + '\n', 'utf8');
        console.log(`[WhatsApp Log] Status saved to log file: ${status} for ${mobile} (Bill: ${logEntry.billNumber})`);
    } catch (err) {
        console.error('Failed to write to WhatsApp status log file:', err);
    }
};

// ------------------------------------------------------------------------------------
// REAL CLIENT INITIALIZATION (whatsapp-web.js / Puppeteer)
// Only initializes if USE_MOCK_GATEWAY is explicitly set to false.
// ------------------------------------------------------------------------------------
let client = null;
let whatsappStatus = 'DISCONNECTED'; // 'DISCONNECTED', 'QR', 'CONNECTED', 'VERIFIED', 'FAILED'
let latestQrImage = null; // Base64 data URL
let connectionError = null;

// Connection Metadata
let connectedSince = null;
let lastVerifiedTime = null;
let pushname = null;
let wid = null;

export const getWhatsAppState = () => {
    return {
        status: whatsappStatus,
        qr: latestQrImage,
        error: connectionError,
        connectedSince,
        lastVerifiedTime,
        pushname,
        wid
    };
};

export const logoutWhatsApp = async () => {
    if (USE_MOCK_GATEWAY) {
        return { success: true, message: 'Mock gateway is active.' };
    }
    
    if (client) {
        try {
            console.log('Logging out from WhatsApp Web...');
            await client.logout();
            whatsappStatus = 'DISCONNECTED';
            latestQrImage = null;
            connectionError = null;
            return { success: true };
        } catch (err) {
            console.error('Failed to log out WhatsApp Client, forcing re-initialization:', err);
            try {
                await client.destroy();
            } catch (destErr) {}
            whatsappStatus = 'DISCONNECTED';
            latestQrImage = null;
            connectedSince = null;
            lastVerifiedTime = null;
            pushname = null;
            wid = null;
            initializeClient();
            return { success: true };
        }
    }
    return { success: false, message: 'Client not initialized' };
};

const initializeClient = () => {
    if (USE_MOCK_GATEWAY) {
        console.log('WhatsApp Client is running in MOCK mode. Outgoing notifications will write to whatsapp_status.log instead of browser automation.');
        whatsappStatus = 'VERIFIED';
        return;
    }

    const chromePaths = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ].filter(Boolean);


    let executablePath;
    for (const p of chromePaths) {
        if (fs.existsSync(p)) {
            executablePath = p;
            break;
        }
    }

    console.log('Initializing WhatsApp Client. Selected browser path:', executablePath || 'Default Puppeteer Chromium');

    whatsappStatus = 'DISCONNECTED';
    connectionError = null;

    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './.wwebjs_auth'
        }),
        puppeteer: {
            executablePath: executablePath || undefined,
            handleSIGINT: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            ]
        }
    });

    client.on('qr', async (qr) => {
        console.log('======================================================================');
        console.log('WhatsApp QR Code generated. Scan it using WhatsApp on your phone:');
        qrcodeTerminal.generate(qr, { small: true });
        console.log('======================================================================');
        
        whatsappStatus = 'QR';
        connectionError = null;
        try {
            latestQrImage = await QRCode.toDataURL(qr);
        } catch (err) {
            console.error('Failed to generate QR data URL:', err);
        }
    });

    client.on('ready', () => {
        console.log('WhatsApp Client is ready!');
        whatsappStatus = 'VERIFIED';
        latestQrImage = null;
        connectionError = null;
        connectedSince = new Date().toISOString();
        lastVerifiedTime = new Date().toISOString();
        if (client.info) {
            pushname = client.info.pushname;
            wid = client.info.wid ? client.info.wid._serialized : null;
        }
    });

    client.on('authenticated', () => {
        console.log('WhatsApp Client authenticated successfully!');
        whatsappStatus = 'CONNECTED';
        latestQrImage = null;
        connectionError = null;
    });

    client.on('auth_failure', (msg) => {
        console.error('WhatsApp Authentication failure:', msg);
        whatsappStatus = 'DISCONNECTED';
        latestQrImage = null;
        connectionError = msg || 'Authentication failed';
    });

    client.on('disconnected', async (reason) => {
        console.log('WhatsApp Client was logged out / disconnected:', reason);
        whatsappStatus = 'DISCONNECTED';
        latestQrImage = null;
        connectionError = reason || 'Logged out';
        connectedSince = null;
        lastVerifiedTime = null;
        pushname = null;
        wid = null;
        
        try {
            await client.destroy();
        } catch (err) {}
        initializeClient();
    });

    client.initialize().catch(err => {
        console.error('Failed to initialize WhatsApp client:', err);
        whatsappStatus = 'DISCONNECTED';
        connectionError = err.message || 'Initialization failed';
    });
};

export const verifyWhatsAppConnection = async (forceCheck = false) => {
    if (USE_MOCK_GATEWAY) {
        whatsappStatus = 'VERIFIED';
        return { success: true, status: 'VERIFIED' };
    }

    if (!client || whatsappStatus === 'DISCONNECTED' || whatsappStatus === 'QR') {
        return { success: false, status: whatsappStatus };
    }

    try {
        const state = await client.getState();
        if (state === 'CONNECTED') {
            whatsappStatus = 'VERIFIED';
            lastVerifiedTime = new Date().toISOString();
            if (client.info) {
                pushname = client.info.pushname;
                wid = client.info.wid ? client.info.wid._serialized : null;
            }
            return { success: true, status: 'VERIFIED' };
        } else {
            throw new Error(`Client state is ${state}`);
        }
    } catch (err) {
        console.warn('WhatsApp verification failed, attempting silent reconnect:', err.message);
        whatsappStatus = 'FAILED';
        connectionError = err.message;
        
        // Try silent reconnect once
        try {
            await client.initialize();
            return { success: false, status: 'FAILED', message: 'Reconnecting...' };
        } catch (reconnectErr) {
            whatsappStatus = 'DISCONNECTED';
            return { success: false, status: 'DISCONNECTED', error: reconnectErr.message };
        }
    }
};

initializeClient();


/**
 * Sends a plain text WhatsApp message.
 * 
 * @param {string} to - Recipient phone number.
 * @param {string} body - The text message body.
 * @param {object} metadata - Rich info payload passed from callers.
 */
export const sendWhatsAppMessage = async (to, body, metadata = {}) => {
    const type = metadata.type || 'TEXT_NOTIFICATION';
    const order = metadata.order || {};
    const details = {
        orderId: order.id ? `ON${String(order.id).padStart(6, '0')}` : 'N/A',
        billNumber: order.bill_number || 'N/A',
        customerName: metadata.customerName || (order.customer && order.customer.customer_name) || 'N/A',
        shopName: (order.owner && order.owner.shop_name) || 'N/A',
        body
    };

    try {
        let cleaned = to.replace(/\D/g, '');
        if (cleaned.length === 10) {
            cleaned = '91' + cleaned; // Default to India country code
        }
        const chatId = cleaned + '@c.us';

        if (USE_MOCK_GATEWAY) {
            console.log(`[MOCK WHATSAPP] Sending message to ${chatId}: "${body}"`);
            logWhatsAppStatus(type, to, 'MOCK_SENT', details);
            return { success: true, mode: 'mock' };
        }

        // ============================================================================
        // PLACEHOLDER: INSERT YOUR PRODUCTION WHATSAPP API SEND CODE HERE
        // ============================================================================
        if (!client) {
            throw new Error('WhatsApp Client is not initialized.');
        }
        
        await verifyWhatsAppConnection();
        if (whatsappStatus !== 'VERIFIED') {
            throw new Error(`WhatsApp is not verified. Current status: ${whatsappStatus}`);
        }

        console.log(`Sending WhatsApp message to ${chatId}...`);
        await client.sendMessage(chatId, body);
        console.log(`WhatsApp message successfully sent to ${chatId}`);
        
        logWhatsAppStatus(type, to, 'SUCCESS', details);
        return { success: true, mode: 'production' };

    } catch (err) {
        console.error('Failed to send WhatsApp message:', err);
        logWhatsAppStatus(type, to, 'FAILED', { ...details, error: err.message });
        throw err;
    }
};

/**
 * Sends a base64 PDF attachment via WhatsApp.
 * 
 * @param {string} to - Recipient phone number.
 * @param {Buffer} pdfBuffer - Binary buffer of the generated PDF invoice.
 * @param {string} filename - Filename of the attachment.
 * @param {string} caption - The accompanying text message caption.
 * @param {object} metadata - Rich info payload passed from callers.
 */
export const sendWhatsAppPDF = async (to, pdfBuffer, filename, caption = '', metadata = {}) => {
    const type = metadata.type || 'INVOICE';
    const order = metadata.order || {};
    const details = {
        orderId: order.id ? `ON${String(order.id).padStart(6, '0')}` : 'N/A',
        billNumber: order.bill_number || 'N/A',
        customerName: metadata.customerName || (order.customer && order.customer.customer_name) || 'N/A',
        shopName: (order.owner && order.owner.shop_name) || 'N/A',
        filename,
        body: caption
    };

    try {
        let cleaned = to.replace(/\D/g, '');
        if (cleaned.length === 10) {
            cleaned = '91' + cleaned; // Default to India country code
        }
        const chatId = cleaned + '@c.us';

        if (USE_MOCK_GATEWAY) {
            console.log(`[MOCK WHATSAPP] Sending PDF Invoice (${filename}) to ${chatId} with caption: "${caption}"`);
            logWhatsAppStatus(type, to, 'MOCK_SENT', details);
            return { success: true, mode: 'mock' };
        }

        // ============================================================================
        // PLACEHOLDER: INSERT YOUR PRODUCTION WHATSAPP PDF SEND CODE HERE
        // ============================================================================
        if (!client) {
            throw new Error('WhatsApp Client is not initialized.');
        }
        
        await verifyWhatsAppConnection();
        if (whatsappStatus !== 'VERIFIED') {
            throw new Error(`WhatsApp is not verified. Current status: ${whatsappStatus}`);
        }

        console.log(`Sending WhatsApp PDF bill to ${chatId}...`);
        const base64Data = pdfBuffer.toString('base64');
        const media = new MessageMedia('application/pdf', base64Data, filename);
        
        await client.sendMessage(chatId, media, { caption });
        console.log(`WhatsApp PDF bill successfully sent to ${chatId}`);
        
        logWhatsAppStatus(type, to, 'SUCCESS', details);
        return { success: true, mode: 'production' };

    } catch (err) {
        console.error('Failed to send WhatsApp PDF bill:', err);
        logWhatsAppStatus(type, to, 'FAILED', { ...details, error: err.message });
        throw err;
    }
};
