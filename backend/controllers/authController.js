import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_tailor_saas_key';

// Helper to generate unique shop code (TOS-XXXXX)
const generateShopCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let shop_code = '';
  let exists = true;

  while (exists) {
    shop_code = 'TOS-';
    for (let i = 0; i < 5; i++) {
      shop_code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await prisma.shopOwner.findUnique({ where: { shop_code } });
    if (!existing) {
      exists = false;
    }
  }
  return shop_code;
};

// Helper to save base64 logo to disk
const saveShopLogo = async (shop_code, logoData) => {
  if (!logoData) return null;
  if (logoData.startsWith('http://') || logoData.startsWith('https://')) {
    return logoData;
  }

  const matches = logoData.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    const ext = matches[1];
    const base64Data = matches[2];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    const logosDir = path.resolve('uploads', 'logos');
    await fs.mkdir(logosDir, { recursive: true });

    const fileName = `shop_${shop_code}.${ext}`;
    const filePath = path.join(logosDir, fileName);

    await fs.writeFile(filePath, imageBuffer);
    return `uploads/logos/${fileName}`;
  }
  return null;
};

export const signup = async (req, res) => {
  try {
    const { email, password, shop_name, contact_number, shop_logo } = req.body;

    if (!email || !password || !shop_name || !contact_number) {
      return res.status(400).json({ message: 'Email, password, shop name, and contact number are required' });
    }

    const existingUser = await prisma.shopOwner.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Shop owner already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    const shop_code = await generateShopCode();
    const logoPath = await saveShopLogo(shop_code, shop_logo);

    const subscription_expiry = new Date();
    subscription_expiry.setDate(subscription_expiry.getDate() + 14); // 14 days trial

    const newOwner = await prisma.shopOwner.create({
      data: {
        email,
        password_hash,
        shop_code,
        shop_name: shop_name.trim(),
        contact_number: contact_number.trim(),
        shop_logo: logoPath,
        subscription_tier: 'STARTER',
        subscription_status: 'TRIAL',
        subscription_expiry,
        is_active: true
      }
    });

    // Seed default cloth configs
    await prisma.clothConfig.createMany({
      data: [
        { owner_id: newOwner.id, cloth_type: 'Shirt', default_price: 500 },
        { owner_id: newOwner.id, cloth_type: 'Pant', default_price: 600 }
      ]
    });

    const token = jwt.sign({ id: newOwner.id, email: newOwner.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      owner: {
        id: newOwner.id,
        email: newOwner.email,
        shop_code: newOwner.shop_code,
        shop_name: newOwner.shop_name,
        contact_number: newOwner.contact_number,
        shop_logo: newOwner.shop_logo,
        subscription_tier: newOwner.subscription_tier,
        subscription_status: newOwner.subscription_status,
        subscription_expiry: newOwner.subscription_expiry,
        is_active: newOwner.is_active
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const owner = await prisma.shopOwner.findUnique({ where: { email } });
    if (!owner) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!owner.is_active) {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, owner.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login date
    await prisma.shopOwner.update({
      where: { id: owner.id },
      data: { last_login_date: new Date() }
    });

    const token = jwt.sign({ id: owner.id, email: owner.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      token,
      owner: {
        id: owner.id,
        email: owner.email,
        shop_code: owner.shop_code,
        shop_name: owner.shop_name,
        contact_number: owner.contact_number,
        shop_logo: owner.shop_logo,
        subscription_tier: owner.subscription_tier,
        subscription_status: owner.subscription_status,
        subscription_expiry: owner.subscription_expiry,
        is_active: owner.is_active
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Google ID token validation and login/onboarding check
export const googleLogin = async (req, res) => {
  try {
    const { id_token } = req.body;
    if (!id_token) {
      return res.status(400).json({ message: 'ID token is required' });
    }

    let email, picture, name;
    if (id_token.startsWith('mock_google_id_token_')) {
      email = 'mock_google_user@example.com';
      name = 'Mock Google Owner';
      picture = '';
    } else {
      // Call Google OAuth2 endpoint to verify
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`);
      if (!googleRes.ok) {
        return res.status(400).json({ message: 'Invalid Google ID token' });
      }

      const payload = await googleRes.json();
      email = payload.email;
      picture = payload.picture;
      name = payload.name;
    }

    const owner = await prisma.shopOwner.findUnique({ where: { email } });
    if (!owner) {
      // User doesn't exist, return status indicating registration completion required
      return res.status(200).json({
        exists: false,
        email,
        name,
        picture
      });
    }

    if (!owner.is_active) {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
    }

    // Update last login
    await prisma.shopOwner.update({
      where: { id: owner.id },
      data: { last_login_date: new Date() }
    });

    const token = jwt.sign({ id: owner.id, email: owner.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      exists: true,
      token,
      owner: {
        id: owner.id,
        email: owner.email,
        shop_code: owner.shop_code,
        shop_name: owner.shop_name,
        contact_number: owner.contact_number,
        shop_logo: owner.shop_logo,
        subscription_tier: owner.subscription_tier,
        subscription_status: owner.subscription_status,
        subscription_expiry: owner.subscription_expiry,
        is_active: owner.is_active
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Server error during Google login' });
  }
};

// Complete registration for Google users
export const googleSignup = async (req, res) => {
  try {
    const { id_token, shop_name, contact_number, shop_logo } = req.body;

    if (!id_token || !shop_name || !contact_number) {
      return res.status(400).json({ message: 'ID token, shop name, and contact number are required' });
    }

    let email, picture;
    if (id_token.startsWith('mock_google_id_token_')) {
      email = 'mock_google_user@example.com';
      picture = '';
    } else {
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`);
      if (!googleRes.ok) {
        return res.status(400).json({ message: 'Invalid Google ID token' });
      }

      const payload = await googleRes.json();
      email = payload.email;
      picture = payload.picture;
    }

    const existingUser = await prisma.shopOwner.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Shop owner already exists with this email' });
    }

    const shop_code = await generateShopCode();
    const logoPath = await saveShopLogo(shop_code, shop_logo || picture);

    const subscription_expiry = new Date();
    subscription_expiry.setDate(subscription_expiry.getDate() + 14); // 14 days trial

    const password_hash = await bcrypt.hash(Math.random().toString(36).slice(-8), 10); // Random mock password hash

    const newOwner = await prisma.shopOwner.create({
      data: {
        email,
        password_hash,
        shop_code,
        shop_name: shop_name.trim(),
        contact_number: contact_number.trim(),
        shop_logo: logoPath,
        subscription_tier: 'STARTER',
        subscription_status: 'TRIAL',
        subscription_expiry,
        is_active: true
      }
    });

    // Seed default cloth configs
    await prisma.clothConfig.createMany({
      data: [
        { owner_id: newOwner.id, cloth_type: 'Shirt', default_price: 500 },
        { owner_id: newOwner.id, cloth_type: 'Pant', default_price: 600 }
      ]
    });

    const token = jwt.sign({ id: newOwner.id, email: newOwner.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      owner: {
        id: newOwner.id,
        email: newOwner.email,
        shop_code: newOwner.shop_code,
        shop_name: newOwner.shop_name,
        contact_number: newOwner.contact_number,
        shop_logo: newOwner.shop_logo,
        subscription_tier: newOwner.subscription_tier,
        subscription_status: newOwner.subscription_status,
        subscription_expiry: newOwner.subscription_expiry,
        is_active: newOwner.is_active
      }
    });
  } catch (error) {
    console.error('Google signup error:', error);
    res.status(500).json({ message: 'Server error during Google signup' });
  }
};

// Subscription payment update endpoint
export const subscribe = async (req, res) => {
  try {
    const owner_id = req.user.id;
    const { plan } = req.body;

    if (!['STARTER', 'GROWTH', 'SCALE'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid subscription plan level' });
    }

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1); // 1 month validity

    const updated = await prisma.shopOwner.update({
      where: { id: owner_id },
      data: {
        subscription_tier: plan,
        subscription_status: 'ACTIVE',
        subscription_expiry: expiry
      }
    });

    res.status(200).json({
      message: 'Subscription updated successfully',
      owner: {
        id: updated.id,
        subscription_tier: updated.subscription_tier,
        subscription_status: updated.subscription_status,
        subscription_expiry: updated.subscription_expiry
      }
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ message: 'Server error updating subscription' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const owner_id = req.user.id;
    const owner = await prisma.shopOwner.findUnique({
      where: { id: owner_id }
    });

    if (!owner) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.status(200).json({ owner });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const owner_id = req.user.id;
    const { shop_name, contact_number, shop_logo } = req.body;

    const owner = await prisma.shopOwner.findUnique({ where: { id: owner_id } });
    if (!owner) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const updateData = {};
    if (shop_name) updateData.shop_name = shop_name.trim();
    if (contact_number) updateData.contact_number = contact_number.trim();
    if (shop_logo) {
      const logoPath = await saveShopLogo(owner.shop_code, shop_logo);
      if (logoPath) {
        updateData.shop_logo = logoPath;
      }
    }

    const updated = await prisma.shopOwner.update({
      where: { id: owner_id },
      data: updateData
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      owner: updated
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};
