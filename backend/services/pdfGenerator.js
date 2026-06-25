import PDFDocument from 'pdfkit';
import path from 'path';

/**
 * Generates a styled A4 PDF invoice in memory.
 * @param {Object} order - The Prisma order object (must include items and owner).
 * @param {string} customerName - The customer's full name.
 * @returns {Promise<Buffer>} - Resolves with the PDF file as a buffer.
 */
export const generateInvoicePdfBuffer = (order, customerName) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', (err) => reject(err));

      // Draw logo if exists
      let logoDrawn = false;
      let textStartX = 40;
      if (order.owner && order.owner.shop_logo) {
        try {
          const absoluteLogoPath = path.resolve(order.owner.shop_logo);
          doc.image(absoluteLogoPath, 40, 45, { height: 40 });
          logoDrawn = true;
          textStartX = 95;
        } catch (logoErr) {
          console.error("Error drawing logo on PDF:", logoErr);
        }
      }

      const shopName = (order.owner && order.owner.shop_name) || 'Captain Tailors';
      const shopContact = (order.owner && order.owner.contact_number) || '+91 98765 43210';
      const shopEmail = (order.owner && order.owner.email) || 'info@captaintailors.com';

      // Brand Title
      doc.fillColor('#1e3a8a')
         .fontSize(26)
         .font('Helvetica-Bold')
         .text(shopName, textStartX, 45);
      
      doc.fillColor('#64748b')
         .fontSize(10)
         .font('Helvetica')
         .text('Bespoke Tailoring & Stitching', textStartX, 75);
          
      doc.fontSize(8)
         .text('Premium Custom Fitting & Designing', textStartX, 90)
         .text(`Email: ${shopEmail} | Tel: ${shopContact}`, textStartX, 102);

      // Invoice Label
      doc.fillColor('#3b82f6')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('INVOICE', 350, 45, { align: 'right', width: 200 });

      // Invoice Metadata
      const dateText = new Date(order.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      doc.fillColor('#0f172a')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(`Order ID: ON${String(order.id).padStart(6, '0')}`, 350, 62, { align: 'right', width: 200 })
         .text(`Bill No: ${order.bill_number}`, 350, 75, { align: 'right', width: 200 });
         
      doc.font('Helvetica')
         .fillColor('#475569')
         .text(`Date: ${dateText}`, 350, 90, { align: 'right', width: 200 })
         .text(`Status: ${order.status}`, 350, 102, { align: 'right', width: 200 });

      // Horizontal Line
      doc.moveTo(40, 125).lineTo(555, 125).strokeColor('#e2e8f0').lineWidth(1.5).stroke();

      // Customer Details (Left) and Billing Info (Right)
      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('CUSTOMER DETAILS', 40, 140);
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(customerName || 'Valued Customer', 40, 155);
      doc.fontSize(10).font('Helvetica').fillColor('#475569').text(`Mobile: ${order.mobile_number}`, 40, 172);

      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('INVOICE DETAILS', 300, 140);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica').text(`Order ID: ON${String(order.id).padStart(6, '0')}`, 300, 155);
      doc.text(`Bill Reference: ${order.bill_number}`, 300, 170);
      doc.text(`Payment Status: ${order.balance_amount === 0 ? 'Fully Paid' : 'Balance Pending'}`, 300, 185);

      // Table Header
      const tableTop = 210;
      doc.rect(40, tableTop, 515, 20).fill('#f1f5f9');
      doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
      doc.text('Cloth Type', 50, tableTop + 6, { width: 200 });
      doc.text('Qty', 280, tableTop + 6, { width: 50, align: 'center' });
      doc.text('Rate', 360, tableTop + 6, { width: 80, align: 'right' });
      doc.text('Total', 460, tableTop + 6, { width: 85, align: 'right' });

      // Table Rows
      let currentY = tableTop + 20;
      doc.font('Helvetica').fontSize(10).fillColor('#334155');

      (order.items || []).forEach((item) => {
        // Draw line divider
        doc.moveTo(40, currentY + 22).lineTo(555, currentY + 22).strokeColor('#f1f5f9').lineWidth(1).stroke();

        doc.text(item.cloth_type, 50, currentY + 6, { width: 200 });
        doc.text(item.quantity.toString(), 280, currentY + 6, { width: 50, align: 'center' });
        doc.text(`₹${item.price_per_cloth.toFixed(2)}`, 360, currentY + 6, { width: 80, align: 'right' });
        doc.fillColor('#0f172a').font('Helvetica-Bold');
        doc.text(`₹${item.total_amount.toFixed(2)}`, 460, currentY + 6, { width: 85, align: 'right' });
        
        doc.font('Helvetica').fillColor('#334155');
        currentY += 22;
      });

      // Financials Summary
      const summaryY = currentY + 20;

      // Terms & Notes Block (Left)
      doc.rect(40, summaryY, 260, 80).fill('#fffbeb');
      doc.rect(40, summaryY, 260, 80).strokeColor('#fef3c7').lineWidth(1).stroke();
      doc.fillColor('#b45309').fontSize(8).font('Helvetica-Bold').text('TAILORING NOTES & TERMS', 50, summaryY + 8);
      doc.fillColor('#78350f').font('Helvetica').fontSize(7.5);
      doc.text('1. Please bring this invoice / bill copy at the time of delivery.', 50, summaryY + 22, { width: 240 });
      doc.text('2. Alterations are free of charge within 15 days of delivery.', 50, summaryY + 37, { width: 240 });
      doc.text('3. Goods not collected within 60 days will be disposed of.', 50, summaryY + 52, { width: 240 });

      // Totals (Right)
      doc.fillColor('#475569').fontSize(9).font('Helvetica');
      doc.text('Subtotal Amount:', 320, summaryY + 6, { width: 120 });
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(`₹${order.total_amount.toFixed(2)}`, 450, summaryY + 6, { width: 95, align: 'right' });

      doc.fillColor('#475569').font('Helvetica').text('Grand Total:', 320, summaryY + 22, { width: 120 });
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(`₹${order.total_amount.toFixed(2)}`, 450, summaryY + 22, { width: 95, align: 'right' });

      doc.fillColor('#10b981').font('Helvetica-Bold').text('Advance Paid:', 320, summaryY + 38, { width: 120 });
      doc.text(`- ₹${order.advance_amount.toFixed(2)}`, 450, summaryY + 38, { width: 95, align: 'right' });

      doc.fillColor('#ef4444').font('Helvetica-Bold').fontSize(12).text('Balance Due:', 320, summaryY + 56, { width: 120 });
      doc.text(`₹${order.balance_amount.toFixed(2)}`, 450, summaryY + 56, { width: 95, align: 'right' });

      // Signature / Sign-off Area
      const footerY = 700;
      doc.moveTo(40, footerY - 10).lineTo(555, footerY - 10).strokeColor('#f1f5f9').lineWidth(1.5).stroke();
      
      doc.fillColor('#1e3a8a').font('Helvetica-BoldOblique').fontSize(11).text('Thank you for stitching with us!', 40, footerY);
      
      doc.moveTo(400, footerY + 15).lineTo(540, footerY + 15).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text('Authorized Signatory', 400, footerY + 20, { width: 140, align: 'center' });

      // Footer disclaimer
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(8).text(`${shopName} • Bespoke Fine Stitching for Men & Women`, 40, 750, { align: 'center', width: 515 });
      doc.text('This is a computer generated invoice and does not require a physical signature.', 40, 762, { align: 'center', width: 515 });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
};
