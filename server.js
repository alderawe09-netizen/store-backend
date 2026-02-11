// server.js - كود الباك إند
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// رابط قاعدة البيانات - ضع رابطك هنا
const MONGODB_URI = process.env.MONGODB_URI;

// الاتصال بقاعدة البيانات
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ تم الاتصال بقاعدة البيانات'))
  .catch(err => console.log('❌ خطأ في الاتصال:', err));

// نموذج المنتج
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  image: String,
  category: String,
  stock: Number,
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// نموذج الطلب
const orderSchema = new mongoose.Schema({
  customerName: String,
  customerPhone: String,
  customerAddress: String,
  items: [{
    productId: String,
    name: String,
    price: Number,
    quantity: Number
  }],
  total: Number,
  status: { type: String, default: 'جديد' },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// مسارات API

// 1. الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send('🚀 سيرفر المتجر يعمل بنجاح!');
});

// 2. جلب جميع المنتجات
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب المنتجات' });
  }
});

// 3. جلب منتج واحد
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب المنتج' });
  }
});

// 4. إضافة منتج جديد (للوحة التحكم)
app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: 'خطأ في إضافة المنتج' });
  }
});

// 5. تحديث منتج
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: 'خطأ في تحديث المنتج' });
  }
});

// 6. حذف منتج
app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم حذف المنتج بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في حذف المنتج' });
  }
});

// 7. إنشاء طلب جديد
app.post('/api/orders', async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    
    // تحديث المخزون
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }
    
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: 'خطأ في إنشاء الطلب' });
  }
});

// 8. جلب جميع الطلبات
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب الطلبات' });
  }
});

// 9. تحديث حالة الطلب
app.put('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: 'خطأ في تحديث الطلب' });
  }
});

// 10. إحصائيات
app.get('/api/stats', async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    res.json({
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
  }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ السيرفر يعمل على المنفذ ${PORT}`);
  console.log(`🌐 يمكنك الوصول عبر: http://localhost:${PORT}`);
});