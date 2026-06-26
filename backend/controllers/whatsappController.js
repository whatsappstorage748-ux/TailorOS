import { getWhatsAppState, logoutWhatsApp, verifyWhatsAppConnection, sendWhatsAppMessage } from '../services/whatsapp.js';

/**
 * Endpoint to retrieve the current connection status of the server's WhatsApp client
 * and the latest QR code image if available.
 */
export const getWhatsAppStatus = async (req, res) => {
  try {
    const state = getWhatsAppState();
    res.status(200).json(state);
  } catch (error) {
    console.error('Failed to get WhatsApp status:', error);
    res.status(500).json({ message: 'Failed to retrieve WhatsApp status', error: error.message });
  }
};

/**
 * Endpoint to disconnect / log out the current WhatsApp session.
 */
export const logoutWhatsAppDevice = async (req, res) => {
  try {
    const result = await logoutWhatsApp();
    if (result.success) {
      res.status(200).json({ message: 'Successfully logged out WhatsApp device' });
    } else {
      res.status(400).json({ message: result.message || 'Failed to log out WhatsApp device' });
    }
  } catch (error) {
    console.error('Failed to log out WhatsApp device:', error);
    res.status(500).json({ message: 'Failed to log out WhatsApp device', error: error.message });
  }
};

/**
 * Endpoint to explicitly verify the WhatsApp connection.
 */
export const verifyWhatsAppStatus = async (req, res) => {
  try {
    const result = await verifyWhatsAppConnection(true);
    const state = getWhatsAppState();
    res.status(200).json({ ...state, result });
  } catch (error) {
    console.error('Failed to verify WhatsApp status:', error);
    res.status(500).json({ message: 'Failed to verify WhatsApp status', error: error.message });
  }
};

/**
 * Endpoint to send a test message to a specific number.
 */
export const sendWhatsAppTest = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ message: 'Mobile number is required' });
    }
    const message = 'Hello! This is a test message from TailorOS to confirm your WhatsApp integration is working perfectly.';
    await sendWhatsAppMessage(mobile, message, { type: 'TEST_MESSAGE' });
    res.status(200).json({ message: 'Test message sent successfully' });
  } catch (error) {
    console.error('Failed to send WhatsApp test message:', error);
    res.status(500).json({ message: 'Failed to send WhatsApp test message', error: error.message });
  }
};
