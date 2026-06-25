import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_tailor_saas_key');
    
    // Verify that the shop owner actually exists in the database
    const owner = await prisma.shopOwner.findUnique({
      where: { id: decoded.id }
    });
    if (!owner) {
      return res.status(401).json({ message: 'User no longer exists, authorization denied' });
    }

    if (!owner.is_active) {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
    }

    req.user = decoded; // { id, email }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const adminMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_tailor_saas_key');
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
    }

    req.user = decoded; // { id, email, role }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};


