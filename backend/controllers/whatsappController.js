import { getWhatsAppState, logoutWhatsApp } from '../services/whatsapp.js';

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
