const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = './public/uploads/';
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});
const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use(express.json());

const dbPath = './data.json';
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '[]');

// 接收投稿的接口
app.post('/submit', upload.single('image'), (req, res) => {
  const data = JSON.parse(fs.readFileSync(dbPath));
  const newId = data.length + 1; 

  const newConfession = {
    id: newId, 
    text: req.body.text || "（没有输入文字）",
    image: req.file ? `/uploads/${req.file.filename}` : null,
    time: new Date().toLocaleString() 
  };
  
  data.push(newConfession);
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  res.send({ message: `提交成功！你是第 ${newId} 号投稿🤫` });
});

// 👇【这是为你新增的接口】让管理员网页可以获取所有留言数据
app.get('/api/messages', (req, res) => {
  const data = JSON.parse(fs.readFileSync(dbPath));
  // 把数据倒序排列（最新的排在最前面）
  res.json(data.reverse()); 
});

app.listen(port, () => {
  console.log(`🚀 服务器已启动！`);
});